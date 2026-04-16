<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\SecretLink;
use App\Entity\User;
use App\Repository\SecretLinkRepository;
use App\Security\Voter\SecretLinkVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * REST API for one-shot shared secret links (Secure Bridge).
 *
 *  - POST /api/secret-links           (ROLE_USER)    create a link
 *  - GET  /api/secret-links/{id}      (public)*      fetch ciphertext (no burn)
 *  - POST /api/secret-links/{id}/consume (public)*   burn after successful decrypt
 *
 *  * Public unless the link sets requireAuth=true, in which case both GET and
 *    consume demand a ROLE_USER token. That constraint is enforced by
 *    SecretLinkVoter — the routes themselves are declared PUBLIC_ACCESS in
 *    security.yaml because the firewall runs before we can read the entity.
 */
#[Route('/api/secret-links', name: 'api_secret_links_')]
final class SecretLinkController extends AbstractController
{
    public function __construct(
        private readonly SecretLinkRepository $secretLinkRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
    ) {
    }

    /**
     * Create a new shared secret link.
     *
     * Expected JSON: { ciphertext: base64, requireConfirmation?: bool, requireAuth?: bool }
     * TTL is forced to 10 minutes server-side.
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Authentication required.'], Response::HTTP_UNAUTHORIZED);
        }

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $ciphertext = isset($data['ciphertext']) && is_string($data['ciphertext']) ? $data['ciphertext'] : '';
        if ($ciphertext === '' || !$this->isBase64($ciphertext)) {
            return $this->json(['error' => 'ciphertext must be a non-empty base64 string.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $link = new SecretLink();
        $link->setOwner($user);
        $link->setCiphertext($ciphertext);
        $link->setRequireConfirmation((bool) ($data['requireConfirmation'] ?? true));
        $link->setRequireAuth((bool) ($data['requireAuth'] ?? false));

        $this->entityManager->persist($link);
        $this->entityManager->flush();

        $out = $this->serializer->normalize($link, 'json', ['groups' => ['secret_link:created']]);

        return $this->json($out, Response::HTTP_CREATED);
    }

    /**
     * Fetch a secret link's ciphertext (no burn). Returns 404 for missing,
     * expired, or already-consumed links to avoid leaking existence.
     */
    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '[0-9a-fA-F-]{36}'])]
    public function show(string $id): JsonResponse
    {
        $link = $this->loadVisibleLink($id);
        if ($link instanceof JsonResponse) {
            return $link;
        }

        $this->denyAccessUnlessGranted(SecretLinkVoter::VIEW, $link);

        return $this->json($this->serializer->normalize($link, 'json', ['groups' => ['secret_link:read']]));
    }

    /**
     * Burn a secret link. Called by the client after a successful decrypt.
     * Idempotent — returns 404 if the link is already gone.
     */
    #[Route('/{id}/consume', name: 'consume', methods: ['POST'], requirements: ['id' => '[0-9a-fA-F-]{36}'])]
    public function consume(string $id): JsonResponse
    {
        $link = $this->loadVisibleLink($id);
        if ($link instanceof JsonResponse) {
            return $link;
        }

        $this->denyAccessUnlessGranted(SecretLinkVoter::CONSUME, $link);

        $link->markConsumed();
        // Hard-delete — nothing useful to keep once the recipient has read it.
        $this->entityManager->remove($link);
        $this->entityManager->flush();

        return $this->json(['consumed' => true]);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Load a link by id, returning a 404 JsonResponse if missing/expired/consumed.
     * Also burns expired rows opportunistically.
     */
    private function loadVisibleLink(string $id): SecretLink|JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'Secret link not found.'], Response::HTTP_NOT_FOUND);
        }

        $link = $this->secretLinkRepository->findOneById(Uuid::fromString($id));

        if ($link === null || $link->isConsumed()) {
            return $this->json(['error' => 'Secret link not found.'], Response::HTTP_NOT_FOUND);
        }

        if ($link->isExpired()) {
            $this->entityManager->remove($link);
            $this->entityManager->flush();

            return $this->json(['error' => 'Secret link not found.'], Response::HTTP_NOT_FOUND);
        }

        return $link;
    }

    private function isBase64(string $value): bool
    {
        return (bool) preg_match('#^[A-Za-z0-9+/]+={0,2}$#', $value);
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
