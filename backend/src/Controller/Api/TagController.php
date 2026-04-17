<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Tag;
use App\Repository\ConceptRepository;
use App\Repository\PayloadRepository;
use App\Repository\TagRepository;
use App\Search\PayloadIndexer;
use App\Search\SnippetIndexer;
use App\Search\TagIndexer;
use App\Security\Voter\TagVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Tag management API (Phase 7).
 *
 * - Tags are auto-created by users while editing concepts/payloads (handled
 *   in ConceptController::syncTags and PayloadController::syncTags). This
 *   controller does NOT expose a user-facing create — the only "new tag"
 *   path is implicit through content authoring.
 * - Public read endpoint: list all tags (used by the frontend when the
 *   Meilisearch index is unavailable as a fallback, and by the admin UI
 *   until autocomplete is wired).
 * - Admin endpoints (officialize, rename, merge, delete) require ROLE_ADMIN,
 *   enforced by access_control on /api/admin/* in security.yaml. TagVoter
 *   double-checks authorization at the voter layer.
 */
final class TagController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TagRepository $tagRepository,
        private readonly ConceptRepository $conceptRepository,
        private readonly PayloadRepository $payloadRepository,
        private readonly SerializerInterface $serializer,
        private readonly TagIndexer $tagIndexer,
        private readonly SnippetIndexer $snippetIndexer,
        private readonly PayloadIndexer $payloadIndexer,
    ) {
    }

    // ------------------------------------------------------------------------
    // User-facing listing (autocomplete fallback, guest browse)
    // ------------------------------------------------------------------------

    /**
     * GET /api/tags — list every tag (flat array). Intended as a fallback when
     * Meilisearch autocomplete is unavailable. Returns the same `tag:read`
     * projection used when tags are nested inside concepts/payloads.
     */
    #[Route('/api/tags', name: 'api_tags_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $tags = $this->tagRepository->findBy([], ['isOfficial' => 'DESC', 'name' => 'ASC']);
        $data = $this->serializer->normalize($tags, 'json', ['groups' => ['tag:read']]);

        return $this->json($data);
    }

    // ------------------------------------------------------------------------
    // Admin endpoints (ROLE_ADMIN only, enforced by security.yaml + TagVoter)
    // ------------------------------------------------------------------------

    /**
     * POST /api/admin/tags — create a new tag from the admin panel.
     * Body: { "name": string, "isOfficial"?: boolean }
     *
     * ROLE_ADMIN is enforced by security.yaml access_control on /api/admin/*.
     */
    #[Route('/api/admin/tags', name: 'api_admin_tags_create', methods: ['POST'])]
    public function adminCreate(Request $request): JsonResponse
    {
        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!isset($data['name']) || !is_string($data['name']) || trim($data['name']) === '') {
            return $this->json(['error' => 'name must be a non-empty string.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $name = strtolower(trim($data['name']));
        if (mb_strlen($name) > 100) {
            return $this->json(['error' => 'name must be at most 100 characters.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $existing = $this->tagRepository->findOneBy(['name' => $name]);
        if ($existing !== null) {
            return $this->json(['error' => 'A tag with that name already exists.'], Response::HTTP_CONFLICT);
        }

        $tag = new Tag();
        $tag->setName($name);
        $tag->setIsOfficial(isset($data['isOfficial']) && is_bool($data['isOfficial']) ? $data['isOfficial'] : false);

        $this->entityManager->persist($tag);
        $this->entityManager->flush();

        $this->tagIndexer->indexTag($tag);

        return $this->json($this->serializeTag($tag), Response::HTTP_CREATED);
    }

    /**
     * GET /api/admin/tags — admin listing enriched with usage counts.
     * Sorted by officialness desc, then most-used desc, then name asc.
     */
    #[Route('/api/admin/tags', name: 'api_admin_tags_list', methods: ['GET'])]
    public function adminList(): JsonResponse
    {
        $rows = $this->tagRepository->findWithUsageCount();

        $out = [];
        foreach ($rows as $row) {
            /** @var Tag $tag */
            $tag = $row['tag'];
            $out[] = [
                'id' => (string) $tag->getId(),
                'name' => $tag->getName(),
                'isOfficial' => $tag->isOfficial(),
                'createdAt' => $tag->getCreatedAt()->format(\DateTimeInterface::ATOM),
                'conceptCount' => $row['conceptCount'],
                'payloadCount' => $row['payloadCount'],
                'usageCount' => $row['usageCount'],
            ];
        }

        return $this->json($out);
    }

    /**
     * PATCH /api/admin/tags/{id} — rename and/or toggle `isOfficial`.
     * Body: { name?: string, isOfficial?: bool }
     */
    #[Route('/api/admin/tags/{id}', name: 'api_admin_tags_update', methods: ['PATCH'])]
    public function adminUpdate(string $id, Request $request): JsonResponse
    {
        $tag = $this->loadTag($id);
        if ($tag === null) {
            return $this->json(['error' => 'Tag not found.'], Response::HTTP_NOT_FOUND);
        }

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $touched = false;

        if (array_key_exists('name', $data)) {
            $this->denyAccessUnlessGranted(TagVoter::RENAME, $tag);
            if (!is_string($data['name']) || trim($data['name']) === '') {
                return $this->json(['error' => 'name must be a non-empty string.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $newName = strtolower(trim($data['name']));
            if (mb_strlen($newName) > 100) {
                return $this->json(['error' => 'name must be at most 100 characters.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            // Reject renames that would clash with an existing tag — merge is
            // the right tool for that case.
            $existing = $this->tagRepository->findOneBy(['name' => $newName]);
            if ($existing !== null && $existing !== $tag) {
                return $this->json(
                    ['error' => 'A tag with that name already exists. Use merge to combine them.'],
                    Response::HTTP_CONFLICT,
                );
            }
            $tag->setName($newName);
            $touched = true;
        }

        if (array_key_exists('isOfficial', $data)) {
            $this->denyAccessUnlessGranted(TagVoter::OFFICIALIZE, $tag);
            if (!is_bool($data['isOfficial'])) {
                return $this->json(['error' => 'isOfficial must be a boolean.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $tag->setIsOfficial($data['isOfficial']);
            $touched = true;
        }

        if (!$touched) {
            return $this->json(['error' => 'Nothing to update. Provide name and/or isOfficial.'], Response::HTTP_BAD_REQUEST);
        }

        $this->entityManager->flush();

        // The TagIndexListener already re-pushes the doc on postUpdate, but a
        // rename also changes how the tag appears inside concept/payload docs.
        // Trigger a targeted reindex of every concept and payload that carries
        // this tag so their `tags: [...]` arrays stay fresh in Meilisearch.
        if (array_key_exists('name', $data)) {
            $this->reindexResourcesForTag($tag);
        }

        return $this->json($this->serializeTag($tag));
    }

    /**
     * POST /api/admin/tags/{sourceId}/merge/{targetId} — merge source into target.
     *
     * Every concept + payload carrying `source` is rewritten to carry `target`
     * instead (or kept as-is if it already had both). The source tag is then
     * hard-deleted, and all affected concepts/payloads are re-indexed in
     * Meilisearch so stale `source` names disappear from search results.
     *
     * 409 if source == target. 404 on either missing.
     */
    #[Route(
        '/api/admin/tags/{sourceId}/merge/{targetId}',
        name: 'api_admin_tags_merge',
        methods: ['POST'],
    )]
    public function adminMerge(string $sourceId, string $targetId): JsonResponse
    {
        $source = $this->loadTag($sourceId);
        $target = $this->loadTag($targetId);
        if ($source === null || $target === null) {
            return $this->json(['error' => 'Tag not found.'], Response::HTTP_NOT_FOUND);
        }
        if ($source === $target) {
            return $this->json(['error' => 'Cannot merge a tag into itself.'], Response::HTTP_CONFLICT);
        }

        $this->denyAccessUnlessGranted(TagVoter::MERGE, $source);
        $this->denyAccessUnlessGranted(TagVoter::MERGE, $target);

        $affectedConcepts = $this->conceptRepository->findByTag($source);
        $affectedPayloads = $this->payloadRepository->findByTag($source);

        foreach ($affectedConcepts as $concept) {
            $concept->removeTag($source);
            $concept->addTag($target);
        }
        foreach ($affectedPayloads as $payload) {
            $payload->removeTag($source);
            $payload->addTag($target);
        }

        $this->entityManager->remove($source);
        $this->entityManager->flush();

        // Doctrine listeners auto-reindex each concept/payload on postUpdate,
        // and the source tag document is removed by TagIndexListener::preRemove.
        // We still refresh the target doc so its `usageCount` is current.
        $this->tagIndexer->indexTag($target);

        return $this->json([
            'mergedInto' => $this->serializeTag($target),
            'reassignedConcepts' => count($affectedConcepts),
            'reassignedPayloads' => count($affectedPayloads),
        ]);
    }

    /**
     * DELETE /api/admin/tags/{id} — hard-delete a tag, detaching it from
     * every concept/payload that currently references it. Re-indexes the
     * affected resources so the removed tag disappears from search.
     */
    #[Route('/api/admin/tags/{id}', name: 'api_admin_tags_delete', methods: ['DELETE'])]
    public function adminDelete(string $id): JsonResponse
    {
        $tag = $this->loadTag($id);
        if ($tag === null) {
            return $this->json(['error' => 'Tag not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TagVoter::DELETE, $tag);

        $affectedConcepts = $this->conceptRepository->findByTag($tag);
        $affectedPayloads = $this->payloadRepository->findByTag($tag);

        foreach ($affectedConcepts as $concept) {
            $concept->removeTag($tag);
        }
        foreach ($affectedPayloads as $payload) {
            $payload->removeTag($tag);
        }

        $this->entityManager->remove($tag);
        $this->entityManager->flush();

        return $this->json([
            'deleted' => true,
            'detachedConcepts' => count($affectedConcepts),
            'detachedPayloads' => count($affectedPayloads),
        ]);
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private function loadTag(string $id): ?Tag
    {
        if (!Uuid::isValid($id)) {
            return null;
        }
        return $this->tagRepository->find(Uuid::fromString($id));
    }

    /**
     * Push fresh documents for every concept + payload carrying this tag.
     * Called after an admin rename so stale tag names disappear from search.
     */
    private function reindexResourcesForTag(Tag $tag): void
    {
        foreach ($this->conceptRepository->findByTag($tag) as $concept) {
            foreach ($concept->getSnippets() as $snippet) {
                $this->snippetIndexer->indexSnippet($snippet);
            }
        }
        foreach ($this->payloadRepository->findByTag($tag) as $payload) {
            $this->payloadIndexer->indexPayload($payload);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeTag(Tag $tag): array
    {
        return [
            'id' => (string) $tag->getId(),
            'name' => $tag->getName(),
            'isOfficial' => $tag->isOfficial(),
            'createdAt' => $tag->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array<string, mixed>|JsonResponse
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
}
