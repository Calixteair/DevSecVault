<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Snippet;
use App\Security\Voter\ConceptVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class SnippetController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
    ) {
    }

    /**
     * Add a snippet to an existing concept.
     */
    #[Route('/api/concepts/{id}/snippets', name: 'api_snippets_create', methods: ['POST'])]
    public function create(Request $request, Concept $concept): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::EDIT, $concept);

        $payload = $this->decodeJson($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $snippet = new Snippet();
        $snippet->setLanguage($payload['language'] ?? '');
        $snippet->setCode($payload['code'] ?? '');
        $snippet->setSortOrder($payload['sortOrder'] ?? $concept->getSnippets()->count());

        $errors = $this->validator->validate($snippet);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        $concept->addSnippet($snippet);
        $this->entityManager->flush();

        $data = $this->serializer->normalize($snippet, 'json', ['groups' => ['snippet:read']]);

        return $this->json($data, Response::HTTP_CREATED);
    }

    /**
     * Update a single snippet.
     */
    #[Route('/api/snippets/{id}', name: 'api_snippets_update', methods: ['PUT'])]
    public function update(Request $request, Snippet $snippet): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::EDIT, $snippet->getConcept());

        $payload = $this->decodeJson($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        if (array_key_exists('language', $payload)) {
            $snippet->setLanguage($payload['language']);
        }

        if (array_key_exists('code', $payload)) {
            $snippet->setCode($payload['code']);
        }

        if (array_key_exists('sortOrder', $payload)) {
            $snippet->setSortOrder($payload['sortOrder']);
        }

        $errors = $this->validator->validate($snippet);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        $this->entityManager->flush();

        $data = $this->serializer->normalize($snippet, 'json', ['groups' => ['snippet:read']]);

        return $this->json($data);
    }

    /**
     * Delete a single snippet.
     */
    #[Route('/api/snippets/{id}', name: 'api_snippets_delete', methods: ['DELETE'])]
    public function delete(Snippet $snippet): JsonResponse
    {
        $this->denyAccessUnlessGranted(ConceptVoter::EDIT, $snippet->getConcept());

        $concept = $snippet->getConcept();
        $concept->removeSnippet($snippet);
        $this->entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

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
