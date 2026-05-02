<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Payload;
use App\Entity\Tag;
use App\Entity\User;
use App\Repository\PayloadRepository;
use App\Repository\TagRepository;
use App\Repository\TeamRepository;
use App\Search\PayloadIndexer;
use App\Security\PayloadCipher;
use App\Security\PayloadCipherException;
use App\Security\Voter\PayloadVoter;
use App\Service\QuotaExceededException;
use App\Service\TeamMembershipService;
use App\Service\UserQuota;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * REST API for Cyber Toolbox payloads.
 *
 * Body encryption is transparent to the client:
 *  - POST/PUT accept `body` as plaintext → encrypted via PayloadCipher before persist.
 *  - GET /{id} returns `body` as plaintext (decrypted on the fly) on the read group.
 *  - List responses never include the body (metadata only).
 */
#[Route('/api/payloads', name: 'api_payloads_')]
final class PayloadController extends AbstractController
{
    public function __construct(
        private readonly PayloadRepository $payloadRepository,
        private readonly TagRepository $tagRepository,
        private readonly TeamRepository $teamRepository,
        private readonly TeamMembershipService $memberships,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        private readonly PayloadCipher $cipher,
        private readonly PayloadIndexer $payloadIndexer,
        private readonly LoggerInterface $logger,
        private readonly UserQuota $userQuota,
    ) {
    }

    /**
     * List payloads visible to the caller.
     *   guest         → public only
     *   user          → public + own
     *   admin + ?mine → own; otherwise same as user (admin cannot peek at other users' private payloads)
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();
        $mine = $request->query->getBoolean('mine');

        if ($user instanceof User) {
            $payloads = $mine
                ? $this->payloadRepository->findByOwner($user)
                : $this->payloadRepository->findVisibleToUser($user);
        } else {
            $payloads = $this->payloadRepository->findPublicPayloads();
        }

        $isAdmin = $this->isGranted('ROLE_ADMIN');
        // Lot 4 — moderation gate. Owners keep visibility on flagged/hidden
        // (transparency) but `removed` is admin-only. Guests only see active.
        $payloads = $this->filterByModeration($payloads, $user, $isAdmin);

        $groups = ['payload:list'];
        if ($isAdmin) {
            $groups[] = 'payload:admin';
        }

        $data = $this->serializer->normalize($payloads, 'json', ['groups' => $groups]);

        return $this->json($data);
    }

    /**
     * Fetch a single payload with its decrypted body.
     */
    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'Invalid id.'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->getUser() instanceof User ? $this->getUser() : null;
        $payload = $this->payloadRepository->findOneByIdVisibleToUser(Uuid::fromString($id), $user);

        if ($payload === null) {
            return $this->json(['error' => 'Payload not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(PayloadVoter::VIEW, $payload);

        $groups = ['payload:read'];
        if ($this->isGranted('ROLE_ADMIN')) {
            $groups[] = 'payload:admin';
        }

        $data = $this->serializer->normalize($payload, 'json', ['groups' => $groups]);
        $data['body'] = $this->decryptBody($payload);

        return $this->json($data);
    }

    /**
     * Create a new payload.
     *
     * Expected JSON: { title, description?, category, language?, visibility, body, tags?: string[] }
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted(PayloadVoter::CREATE);

        /** @var User $user */
        $user = $this->getUser();

        try {
            $this->userQuota->ensureCanCreatePayload($user);
        } catch (QuotaExceededException $e) {
            return $this->json(
                ['error' => 'Quota atteint', 'quota' => $e->getQuota(), 'limit' => $e->getLimit()],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $payload = new Payload();
        $payload->setOwner($user);
        $payload->setTitle($data['title'] ?? '');
        $payload->setDescription($data['description'] ?? null);
        $payload->setCategory($data['category'] ?? 'other');
        $payload->setLanguage($data['language'] ?? null);
        $payload->setVisibility($data['visibility'] ?? 'private');

        $body = (string) ($data['body'] ?? '');
        try {
            $payload->setBodyEncrypted($this->cipher->encrypt($body));
        } catch (PayloadCipherException $e) {
            $this->logger->error('Payload encryption failed during create: {msg}', ['msg' => $e->getMessage(), 'exception' => $e]);

            return $this->json(['error' => 'Failed to process payload.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $tagNames = $data['tags'] ?? [];
        if (count($tagNames) > 20) {
            return $this->json(['error' => 'A maximum of 20 tags per resource is allowed.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->syncTags($payload, $tagNames);

        $teamError = $this->applySharedTeamsOnCreate($payload, $user, $data);
        if ($teamError !== null) {
            return $teamError;
        }

        $errors = $this->validator->validate($payload);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        $this->entityManager->persist($payload);
        $this->entityManager->flush();

        $out = $this->serializer->normalize($payload, 'json', ['groups' => ['payload:read']]);
        $out['body'] = $body; // echo plaintext back (client already has it)

        return $this->json($out, Response::HTTP_CREATED);
    }

    /**
     * Update a payload. Only the fields present in the body are modified.
     * If `body` is present, it is re-encrypted.
     */
    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    public function update(Request $request, Payload $payload): JsonResponse
    {
        $this->denyAccessUnlessGranted(PayloadVoter::EDIT, $payload);

        /** @var User $user */
        $user = $this->getUser();

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (array_key_exists('title', $data)) {
            $payload->setTitle((string) $data['title']);
        }
        if (array_key_exists('description', $data)) {
            $payload->setDescription($data['description']);
        }
        if (array_key_exists('category', $data)) {
            $payload->setCategory((string) $data['category']);
        }
        if (array_key_exists('language', $data)) {
            $payload->setLanguage($data['language']);
        }
        if (array_key_exists('visibility', $data)) {
            $payload->setVisibility((string) $data['visibility']);
        }
        if (array_key_exists('tags', $data)) {
            $tags = (array) $data['tags'];
            if (count($tags) > 20) {
                return $this->json(['error' => 'A maximum of 20 tags per resource is allowed.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $this->syncTags($payload, $tags);
        }

        $plaintext = null;
        if (array_key_exists('body', $data)) {
            $plaintext = (string) $data['body'];
            try {
                $payload->setBodyEncrypted($this->cipher->encrypt($plaintext));
            } catch (PayloadCipherException $e) {
                $this->logger->error('Payload encryption failed during update: {msg}', ['msg' => $e->getMessage(), 'exception' => $e]);

                return $this->json(['error' => 'Failed to process payload.'], Response::HTTP_INTERNAL_SERVER_ERROR);
            }
        }

        $sharedTeamsChanged = array_key_exists('sharedTeamIds', $data);
        $teamError = $this->applySharedTeamsOnUpdate($payload, $user, $data);
        if ($teamError !== null) {
            return $teamError;
        }

        $errors = $this->validator->validate($payload);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        $this->entityManager->flush();

        // N:N collection mutations alone don't trigger postUpdate on the owning
        // entity. If only sharedTeams changed, the listener didn't fire — reindex
        // manually so Meilisearch `team_ids` stays in sync.
        if ($sharedTeamsChanged) {
            $this->payloadIndexer->indexPayload($payload);
        }

        $out = $this->serializer->normalize($payload, 'json', ['groups' => ['payload:read']]);
        $out['body'] = $plaintext ?? $this->decryptBody($payload);

        return $this->json($out);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(Payload $payload): JsonResponse
    {
        $this->denyAccessUnlessGranted(PayloadVoter::DELETE, $payload);

        $this->entityManager->remove($payload);
        $this->entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Soft-unshare: remove a single team from the payload's shared list.
     *
     * Authorised for the owner OR the lead of the named team. When the last
     * team is removed, visibility auto-flips from 'team' to 'private' — the
     * payload is never deleted by an unshare.
     */
    #[Route('/{id}/teams/{teamId}', name: 'unshare_team', methods: ['DELETE'])]
    public function unshareTeam(Payload $payload, string $teamId): JsonResponse
    {
        $this->denyAccessUnlessGranted(PayloadVoter::UNSHARE_FROM_TEAM . ':' . $teamId, $payload);

        $team = $this->teamRepository->findOneById($teamId);
        if ($team === null || !$payload->isSharedWithTeam($team)) {
            return $this->json(['error' => 'Team is not in the shared list.'], Response::HTTP_NOT_FOUND);
        }

        $payload->removeSharedTeam($team);

        // Auto-flip to private when the last team share is removed. Setting a
        // scalar field makes Doctrine mark the Payload dirty so postUpdate fires.
        // When only the M2M changes, postUpdate does NOT fire for N:N mutations,
        // so we force the reindex explicitly below.
        $flipped = false;
        if ($payload->getSharedTeams()->count() === 0 && $payload->getVisibility() === 'team') {
            $payload->setVisibility('private');
            $flipped = true;
        }

        $this->entityManager->flush();

        // If postUpdate didn't fire (pure M2M mutation), reindex manually so
        // the `team_ids` field in Meilisearch stays consistent.
        if (!$flipped) {
            $this->payloadIndexer->indexPayload($payload);
        }

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Lot 4 — strip payloads the caller is not allowed to see based on the
     * `moderation_status` lifecycle. Owners keep visibility on flagged/hidden;
     * `removed` is admin-only.
     *
     * @param Payload[] $payloads
     * @return Payload[]
     */
    private function filterByModeration(array $payloads, ?object $user, bool $isAdmin): array
    {
        if ($isAdmin) {
            return $payloads;
        }

        $userId = $user instanceof User ? $user->getId() : null;

        return array_values(array_filter(
            $payloads,
            static function (Payload $p) use ($userId): bool {
                $status = $p->getModerationStatus();
                if ($status === 'active') {
                    return true;
                }
                if ($status === 'removed' || $userId === null) {
                    return false;
                }
                return $p->getOwner()->getId()?->equals($userId) ?? false;
            },
        ));
    }

    private function decryptBody(Payload $payload): string
    {
        if ($payload->getBodyEncrypted() === '') {
            return '';
        }

        try {
            return $this->cipher->decrypt($payload->getBodyEncrypted());
        } catch (PayloadCipherException $e) {
            $this->logger->error('Payload decryption failed for {id}: {msg}', [
                'id' => (string) $payload->getId(),
                'msg' => $e->getMessage(),
                'exception' => $e,
            ]);

            throw new \RuntimeException('Failed to process payload.', 0, $e);
        }
    }

    private function decodeJson(Request $request): array|JsonResponse
    {
        $content = $request->getContent();
        if ($content === '') {
            return $this->json(['error' => 'Request body is empty.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $data = json_decode($content, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Invalid JSON.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($data)) {
            return $this->json(['error' => 'Request body must be a JSON object.'], Response::HTTP_BAD_REQUEST);
        }

        return $data;
    }

    /**
     * Replace tags on a payload from an array of tag names.
     *
     * @param array<int, mixed> $tagNames
     */
    private function syncTags(Payload $payload, array $tagNames): void
    {
        $payload->clearTags();

        foreach ($tagNames as $tagName) {
            if (!is_string($tagName) || trim($tagName) === '') {
                continue;
            }

            $normalizedName = strtolower(trim($tagName));
            $tag = $this->tagRepository->findOneBy(['name' => $normalizedName]);

            if ($tag === null) {
                $tag = new Tag();
                $tag->setName($normalizedName);
                $this->entityManager->persist($tag);
            }

            $payload->addTag($tag);
        }
    }

    private function validationErrorResponse(mixed $errors): JsonResponse
    {
        $messages = [];
        foreach ($errors as $error) {
            $messages[] = [
                'property' => $error->getPropertyPath(),
                'message' => $error->getMessage(),
            ];
        }

        return $this->json(['errors' => $messages], Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    /**
     * Apply `sharedTeamIds` on CREATE with strict consistency against visibility.
     */
    private function applySharedTeamsOnCreate(Payload $payload, User $user, array $data): ?JsonResponse
    {
        $hasKey = array_key_exists('sharedTeamIds', $data);
        $ids = $hasKey ? (array) $data['sharedTeamIds'] : [];
        $visibility = $payload->getVisibility();

        if ($hasKey && count($ids) > 0 && $visibility !== 'team') {
            return $this->json(
                ['error' => 'sharedTeamIds requires visibility=team.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        if ($visibility === 'team' && count($ids) === 0) {
            return $this->json(
                ['error' => 'Team visibility requires at least one shared team.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        if (count($ids) === 0) {
            return null;
        }

        return $this->assignSharedTeams($payload, $user, $ids);
    }

    /**
     * Apply `sharedTeamIds` / visibility transitions on UPDATE.
     */
    private function applySharedTeamsOnUpdate(Payload $payload, User $user, array $data): ?JsonResponse
    {
        $hasKey = array_key_exists('sharedTeamIds', $data);
        $visibility = $payload->getVisibility();

        // Explicit flip to private/public clears all shared teams.
        if (array_key_exists('visibility', $data) && in_array($visibility, ['private', 'public'], true)) {
            foreach ($payload->getSharedTeams()->toArray() as $team) {
                $payload->removeSharedTeam($team);
            }
        }

        if ($hasKey) {
            $ids = (array) $data['sharedTeamIds'];

            if (count($ids) > 0 && $visibility !== 'team') {
                return $this->json(
                    ['error' => 'sharedTeamIds requires visibility=team.'],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }

            // Reset collection
            foreach ($payload->getSharedTeams()->toArray() as $team) {
                $payload->removeSharedTeam($team);
            }

            if (count($ids) > 0) {
                $err = $this->assignSharedTeams($payload, $user, $ids);
                if ($err !== null) {
                    return $err;
                }
            }
        }

        // Soft-unshare auto-flip: empty team list + visibility=team
        if ($payload->getVisibility() === 'team' && $payload->getSharedTeams()->count() === 0) {
            if ($hasKey) {
                $payload->setVisibility('private');
            } else {
                return $this->json(
                    ['error' => 'Team visibility requires at least one shared team.'],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
        }

        return null;
    }

    /**
     * @param array<int, mixed> $teamIds
     */
    private function assignSharedTeams(Payload $payload, User $user, array $teamIds): ?JsonResponse
    {
        foreach ($teamIds as $teamId) {
            if (!is_string($teamId) || $teamId === '') {
                continue;
            }

            $team = $this->teamRepository->findOneById($teamId);
            if ($team === null) {
                return $this->json(
                    ['error' => sprintf('Team %s not found.', $teamId)],
                    Response::HTTP_NOT_FOUND,
                );
            }

            if (!$this->memberships->isMember($user, $team)) {
                return $this->json(
                    ['error' => 'You can only share with teams you belong to.'],
                    Response::HTTP_FORBIDDEN,
                );
            }

            $payload->addSharedTeam($team);
        }

        return null;
    }
}
