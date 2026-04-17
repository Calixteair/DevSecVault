<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Snippet;
use App\Entity\User;
use App\Repository\ConceptRepository;
use App\Repository\TagRepository;
use App\Repository\TeamRepository;
use App\Search\SnippetIndexer;
use App\Security\Voter\ConceptVoter;
use App\Service\TeamMembershipService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/concepts', name: 'api_concepts_')]
final class ConceptController extends AbstractController
{
    public function __construct(
        private readonly ConceptRepository $conceptRepository,
        private readonly TagRepository $tagRepository,
        private readonly TeamRepository $teamRepository,
        private readonly TeamMembershipService $memberships,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        private readonly SnippetIndexer $snippetIndexer,
    ) {
    }

    /**
     * List concepts visible to the current user.
     * Authenticated: own concepts (all visibilities) + public from others.
     * Guest: only public concepts.
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->getUser();

        if ($user instanceof User) {
            $concepts = $this->conceptRepository->findVisibleToUser($user);
        } else {
            $concepts = $this->conceptRepository->findPublicConcepts();
        }

        $data = $this->serializer->normalize($concepts, 'json', ['groups' => ['concept:list']]);

        return $this->json($data);
    }

    /**
     * Get a single concept with its snippets.
     */
    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(Concept $concept): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::VIEW, $concept);

        $data = $this->serializer->normalize($concept, 'json', ['groups' => ['concept:read']]);

        return $this->json($data);
    }

    /**
     * Create a new concept (with optional snippets and tags).
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::CREATE);

        /** @var User $user */
        $user = $this->getUser();

        $payload = $this->decodeJson($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $concept = new Concept();
        $concept->setOwner($user);
        $concept->setTitle($payload['title'] ?? '');
        $concept->setDescription($payload['description'] ?? null);
        $concept->setVisibility($payload['visibility'] ?? 'private');

        // Handle tags
        $tagNames = $payload['tags'] ?? [];
        if (count($tagNames) > 20) {
            return $this->json(['error' => 'A maximum of 20 tags per resource is allowed.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $this->syncTags($concept, $tagNames);

        // Handle snippets
        $this->syncSnippets($concept, $payload['snippets'] ?? []);

        // Handle team sharing (must happen after visibility is set)
        $teamError = $this->applySharedTeamsOnCreate($concept, $user, $payload);
        if ($teamError !== null) {
            return $teamError;
        }

        $errors = $this->validator->validate($concept);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        // Validate each snippet
        foreach ($concept->getSnippets() as $snippet) {
            $snippetErrors = $this->validator->validate($snippet);
            if (count($snippetErrors) > 0) {
                return $this->validationErrorResponse($snippetErrors);
            }
        }

        $this->entityManager->persist($concept);
        $this->entityManager->flush();

        $data = $this->serializer->normalize($concept, 'json', ['groups' => ['concept:read']]);

        return $this->json($data, Response::HTTP_CREATED);
    }

    /**
     * Update a concept (with optional snippets and tags replacement).
     */
    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    public function update(Request $request, Concept $concept): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::EDIT, $concept);

        /** @var User $user */
        $user = $this->getUser();

        $payload = $this->decodeJson($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        if (array_key_exists('title', $payload)) {
            $concept->setTitle($payload['title']);
        }

        if (array_key_exists('description', $payload)) {
            $concept->setDescription($payload['description']);
        }

        if (array_key_exists('visibility', $payload)) {
            $concept->setVisibility($payload['visibility']);
        }

        if (array_key_exists('tags', $payload)) {
            $tags = (array) $payload['tags'];
            if (count($tags) > 20) {
                return $this->json(['error' => 'A maximum of 20 tags per resource is allowed.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $this->syncTags($concept, $tags);
        }

        if (array_key_exists('snippets', $payload)) {
            $this->replaceSnippets($concept, $payload['snippets']);
        }

        $sharedTeamsChanged = array_key_exists('sharedTeamIds', $payload);
        $teamError = $this->applySharedTeamsOnUpdate($concept, $user, $payload);
        if ($teamError !== null) {
            return $teamError;
        }

        $errors = $this->validator->validate($concept);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        foreach ($concept->getSnippets() as $snippet) {
            $snippetErrors = $this->validator->validate($snippet);
            if (count($snippetErrors) > 0) {
                return $this->validationErrorResponse($snippetErrors);
            }
        }

        $this->entityManager->flush();

        // N:N collection changes alone don't trigger postUpdate on the owning
        // entity. If the only dirty thing was sharedTeams, the listener didn't
        // fire — reindex manually so Meilisearch `team_ids` stays in sync.
        if ($sharedTeamsChanged) {
            $this->snippetIndexer->indexConcept($concept);
        }

        $data = $this->serializer->normalize($concept, 'json', ['groups' => ['concept:read']]);

        return $this->json($data);
    }

    /**
     * Delete a concept and its snippets.
     */
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(Concept $concept): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::DELETE, $concept);

        $this->entityManager->remove($concept);
        $this->entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Remove a single team from this concept's shared list (soft-unshare).
     *
     * Authorised for the concept owner OR the lead of the named team. The
     * resource is never deleted — when the last team is removed, visibility
     * auto-flips from 'team' to 'private'.
     */
    #[Route('/{id}/teams/{teamId}', name: 'unshare_team', methods: ['DELETE'])]
    public function unshareTeam(Concept $concept, string $teamId): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::UNSHARE_FROM_TEAM . ':' . $teamId, $concept);

        $team = $this->teamRepository->findOneById($teamId);
        if ($team === null || !$concept->isSharedWithTeam($team)) {
            return $this->json(['error' => 'Team is not in the shared list.'], Response::HTTP_NOT_FOUND);
        }

        $concept->removeSharedTeam($team);

        // Auto-flip visibility to private when the last team share is removed.
        // Setting a scalar field here ALSO ensures Doctrine marks the Concept
        // as dirty so postUpdate fires and child snippets are reindexed. When
        // only the M2M changes (visibility stays 'team'), postUpdate does NOT
        // fire for N:N mutations — we force the reindex explicitly below.
        $flipped = false;
        if ($concept->getSharedTeams()->count() === 0 && $concept->getVisibility() === 'team') {
            $concept->setVisibility('private');
            $flipped = true;
        }

        $this->entityManager->flush();

        // If the visibility change didn't trigger postUpdate (pure M2M mutation),
        // reindex manually so the `team_ids` field in Meilisearch documents
        // stays in sync with the new shared list.
        if (!$flipped) {
            $this->snippetIndexer->indexConcept($concept);
        }

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Decode JSON body. Returns the parsed array or a JsonResponse on error.
     */
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
     * Sync tags on a concept. Accepts an array of tag names (strings).
     * Creates tags that don't exist yet.
     *
     * @param string[] $tagNames
     */
    private function syncTags(Concept $concept, array $tagNames): void
    {
        $concept->clearTags();

        foreach ($tagNames as $tagName) {
            if (!is_string($tagName) || trim($tagName) === '') {
                continue;
            }

            $normalizedName = strtolower(trim($tagName));
            $tag = $this->tagRepository->findOneBy(['name' => $normalizedName]);

            if ($tag === null) {
                $tag = new \App\Entity\Tag();
                $tag->setName($normalizedName);
                $this->entityManager->persist($tag);
            }

            $concept->addTag($tag);
        }
    }

    /**
     * Add snippets to a concept from raw payload data (used on create).
     *
     * @param array<int, array<string, mixed>> $snippetsData
     */
    private function syncSnippets(Concept $concept, array $snippetsData): void
    {
        foreach ($snippetsData as $index => $snippetData) {
            if (!is_array($snippetData)) {
                continue;
            }

            $snippet = new Snippet();
            $snippet->setLanguage($snippetData['language'] ?? '');
            $snippet->setCode($snippetData['code'] ?? '');
            $snippet->setSortOrder($snippetData['sortOrder'] ?? $index);

            $concept->addSnippet($snippet);
        }
    }

    /**
     * Replace all snippets on a concept (clear + re-add).
     * If a snippet has an 'id', try to update the existing one; otherwise create a new one.
     *
     * @param array<int, array<string, mixed>> $snippetsData
     */
    private function replaceSnippets(Concept $concept, array $snippetsData): void
    {
        // Index existing snippets by id for potential reuse
        $existingSnippets = [];
        foreach ($concept->getSnippets() as $snippet) {
            $existingSnippets[(string) $snippet->getId()] = $snippet;
        }

        // Track which existing snippets are kept
        $keptIds = [];

        foreach ($snippetsData as $index => $snippetData) {
            if (!is_array($snippetData)) {
                continue;
            }

            $snippetId = $snippetData['id'] ?? null;

            if ($snippetId !== null && isset($existingSnippets[$snippetId])) {
                // Update existing snippet
                $snippet = $existingSnippets[$snippetId];
                $snippet->setLanguage($snippetData['language'] ?? $snippet->getLanguage());
                $snippet->setCode($snippetData['code'] ?? $snippet->getCode());
                $snippet->setSortOrder($snippetData['sortOrder'] ?? $index);
                $keptIds[] = $snippetId;
            } else {
                // Create new snippet
                $snippet = new Snippet();
                $snippet->setLanguage($snippetData['language'] ?? '');
                $snippet->setCode($snippetData['code'] ?? '');
                $snippet->setSortOrder($snippetData['sortOrder'] ?? $index);
                $concept->addSnippet($snippet);
            }
        }

        // Remove snippets that are no longer in the payload
        foreach ($existingSnippets as $id => $snippet) {
            if (!in_array($id, $keptIds, true)) {
                $concept->removeSnippet($snippet);
            }
        }
    }

    /**
     * Apply `sharedTeamIds` on CREATE with strict consistency against visibility.
     * Returns a JsonResponse on error, null on success.
     */
    private function applySharedTeamsOnCreate(Concept $concept, User $user, array $payload): ?JsonResponse
    {
        $hasKey = array_key_exists('sharedTeamIds', $payload);
        $ids = $hasKey ? (array) $payload['sharedTeamIds'] : [];
        $visibility = $concept->getVisibility();

        // Inconsistent: team ids supplied but visibility is not 'team'
        if ($hasKey && count($ids) > 0 && $visibility !== 'team') {
            return $this->json(
                ['error' => 'sharedTeamIds requires visibility=team.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        // 'team' visibility requires at least one shared team
        if ($visibility === 'team' && count($ids) === 0) {
            return $this->json(
                ['error' => 'Team visibility requires at least one shared team.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        if (count($ids) === 0) {
            return null;
        }

        return $this->assignSharedTeams($concept, $user, $ids);
    }

    /**
     * Apply `sharedTeamIds` and/or visibility transitions on UPDATE.
     * Returns a JsonResponse on error, null on success.
     */
    private function applySharedTeamsOnUpdate(Concept $concept, User $user, array $payload): ?JsonResponse
    {
        $hasKey = array_key_exists('sharedTeamIds', $payload);
        $visibility = $concept->getVisibility();

        // Explicit visibility flip to private/public clears shared teams.
        if (array_key_exists('visibility', $payload) && in_array($visibility, ['private', 'public'], true)) {
            foreach ($concept->getSharedTeams()->toArray() as $team) {
                $concept->removeSharedTeam($team);
            }
        }

        if ($hasKey) {
            $ids = (array) $payload['sharedTeamIds'];

            // Inconsistent: team ids supplied but visibility is not 'team'
            if (count($ids) > 0 && $visibility !== 'team') {
                return $this->json(
                    ['error' => 'sharedTeamIds requires visibility=team.'],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }

            // Reset the collection: remove all, then add the new set
            foreach ($concept->getSharedTeams()->toArray() as $team) {
                $concept->removeSharedTeam($team);
            }

            if (count($ids) > 0) {
                $err = $this->assignSharedTeams($concept, $user, $ids);
                if ($err !== null) {
                    return $err;
                }
            }
        }

        // Soft-unshare semantics:
        //  - If the caller explicitly sent sharedTeamIds=[] with visibility=team,
        //    treat it as a full unshare and auto-flip visibility to 'private'.
        //  - If visibility=team but no teams remain AND the caller did not send
        //    sharedTeamIds, the state is invalid → 422.
        if ($concept->getVisibility() === 'team' && $concept->getSharedTeams()->count() === 0) {
            if ($hasKey) {
                $concept->setVisibility('private');
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
     * Load teams, verify the user is a member of each, attach them to the concept.
     *
     * @param array<int, mixed> $teamIds
     */
    private function assignSharedTeams(Concept $concept, User $user, array $teamIds): ?JsonResponse
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

            $concept->addSharedTeam($team);
        }

        return null;
    }

    /**
     * Build a 422 validation error response.
     */
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
}
