<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\TeamInviteLink;
use App\Entity\User;
use App\Repository\TeamInviteLinkRepository;
use App\Repository\TeamMemberRepository;
use App\Repository\TeamRepository;
use App\Security\Voter\TeamVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * REST API for team invite links (Phase 6).
 *
 * Invites are multi-use until expired or explicitly disabled. The UUID of the
 * invite entity is the token shown in invite URLs (see TeamInviteLink entity).
 */
#[Route('/api/teams/{teamId}/invites', name: 'api_team_invites_')]
final class TeamInviteLinkController extends AbstractController
{
    public const MIN_TTL_DAYS = 1;
    public const MAX_TTL_DAYS = 365;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TeamInviteLinkRepository $inviteRepository,
        private readonly TeamRepository $teamRepository,
        private readonly TeamMemberRepository $teamMemberRepository,
        private readonly SerializerInterface $serializer,
        private readonly Security $security,
    ) {
    }

    /**
     * POST /api/teams/{teamId}/invites — create an invite (lead only).
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(string $teamId, Request $request): JsonResponse
    {
        $team = $this->loadTeam($teamId);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $expiresInDays = TeamInviteLink::DEFAULT_TTL_DAYS;
        if (array_key_exists('expiresInDays', $data) && $data['expiresInDays'] !== null) {
            if (!is_int($data['expiresInDays'])) {
                return $this->json(['error' => 'expiresInDays must be an integer.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $expiresInDays = $data['expiresInDays'];

            if ($expiresInDays < self::MIN_TTL_DAYS || $expiresInDays > self::MAX_TTL_DAYS) {
                return $this->json(
                    ['error' => sprintf('expiresInDays must be between %d and %d.', self::MIN_TTL_DAYS, self::MAX_TTL_DAYS)],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
        }

        /** @var User $user */
        $user = $this->getUser();

        $invite = new TeamInviteLink($team, $user, $expiresInDays);

        $this->entityManager->persist($invite);
        $this->entityManager->flush();

        return $this->json($this->serializeInvite($invite), Response::HTTP_CREATED);
    }

    /**
     * GET /api/teams/{teamId}/invites — list invites (lead only).
     * Each invite is enriched with a `status` field: active | disabled | expired.
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(string $teamId): JsonResponse
    {
        $team = $this->loadTeam($teamId);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $invites = $this->inviteRepository->findByTeam($team);

        $out = [];
        foreach ($invites as $invite) {
            $out[] = $this->serializeInvite($invite);
        }

        return $this->json($out);
    }

    /**
     * PATCH /api/teams/{teamId}/invites/{inviteId} — toggle active flag (lead only).
     * Body: { isActive: bool }
     */
    #[Route('/{inviteId}', name: 'update', methods: ['PATCH'])]
    public function update(string $teamId, string $inviteId, Request $request): JsonResponse
    {
        $team = $this->loadTeam($teamId);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $invite = $this->loadInvite($inviteId, $team);
        if ($invite === null) {
            return $this->json(['error' => 'Invite not found.'], Response::HTTP_NOT_FOUND);
        }

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!array_key_exists('isActive', $data) || !is_bool($data['isActive'])) {
            return $this->json(['error' => 'isActive (bool) is required.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $invite->setIsActive($data['isActive']);
        $this->entityManager->flush();

        return $this->json($this->serializeInvite($invite));
    }

    /**
     * DELETE /api/teams/{teamId}/invites/{inviteId} — hard delete (lead only).
     */
    #[Route('/{inviteId}', name: 'delete', methods: ['DELETE'])]
    public function delete(string $teamId, string $inviteId): JsonResponse
    {
        $team = $this->loadTeam($teamId);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $invite = $this->loadInvite($inviteId, $team);
        if ($invite === null) {
            return $this->json(['error' => 'Invite not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->entityManager->remove($invite);
        $this->entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private function loadTeam(string $id): ?\App\Entity\Team
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->teamRepository->findOneById($id);
    }

    private function loadInvite(string $id, \App\Entity\Team $team): ?TeamInviteLink
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        $invite = $this->inviteRepository->find(Uuid::fromString($id));
        if ($invite === null) {
            return null;
        }

        // Guard against cross-team access: invite must belong to the team
        // specified in the URL.
        if ($invite->getTeam()->getId()?->toRfc4122() !== $team->getId()?->toRfc4122()) {
            return null;
        }

        return $invite;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeInvite(TeamInviteLink $invite): array
    {
        // `status` is now a virtual getter on the entity (see TeamInviteLink::getStatus)
        // so it appears in both `invite:read` and `team:read` groups automatically.
        return $this->serializer->normalize($invite, 'json', ['groups' => ['invite:read']]);
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
}
