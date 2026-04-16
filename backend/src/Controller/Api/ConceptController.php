<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Snippet;
use App\Entity\User;
use App\Repository\ConceptRepository;
use App\Repository\TagRepository;
use App\Security\Voter\ConceptVoter;
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
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
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
        $this->syncTags($concept, $payload['tags'] ?? []);

        // Handle snippets
        $this->syncSnippets($concept, $payload['snippets'] ?? []);

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
            $this->syncTags($concept, $payload['tags']);
        }

        if (array_key_exists('snippets', $payload)) {
            $this->replaceSnippets($concept, $payload['snippets']);
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
