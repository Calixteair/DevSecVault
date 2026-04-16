<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Payload;
use App\Entity\Tag;
use App\Entity\User;
use App\Repository\PayloadRepository;
use App\Repository\TagRepository;
use App\Security\PayloadCipher;
use App\Security\PayloadCipherException;
use App\Security\Voter\PayloadVoter;
use Doctrine\ORM\EntityManagerInterface;
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
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        private readonly PayloadCipher $cipher,
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

        $data = $this->serializer->normalize($payloads, 'json', ['groups' => ['payload:list']]);

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

        $data = $this->serializer->normalize($payload, 'json', ['groups' => ['payload:read']]);
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
            return $this->json(['error' => 'Encryption failed: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $this->syncTags($payload, $data['tags'] ?? []);

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
            $this->syncTags($payload, (array) $data['tags']);
        }

        $plaintext = null;
        if (array_key_exists('body', $data)) {
            $plaintext = (string) $data['body'];
            try {
                $payload->setBodyEncrypted($this->cipher->encrypt($plaintext));
            } catch (PayloadCipherException $e) {
                return $this->json(['error' => 'Encryption failed: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
            }
        }

        $errors = $this->validator->validate($payload);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        $this->entityManager->flush();

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

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private function decryptBody(Payload $payload): string
    {
        if ($payload->getBodyEncrypted() === '') {
            return '';
        }

        try {
            return $this->cipher->decrypt($payload->getBodyEncrypted());
        } catch (PayloadCipherException $e) {
            // Surface the issue to the client rather than returning ciphertext.
            throw new \RuntimeException('Unable to decrypt payload body: ' . $e->getMessage(), 0, $e);
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
}
