<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\VaultEntry;
use App\Repository\VaultEntryRepository;
use App\Security\Voter\VaultEntryVoter;
use App\Service\QuotaExceededException;
use App\Service\UserQuota;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * REST API for the personal vault slot (Secure Bridge).
 *
 * Single slot per user: GET returns the current row, PUT upserts it. All
 * payloads are opaque ciphertexts produced client-side with a key derived
 * from the user's passphrase (Argon2id). The server never sees the key or
 * the plaintext.
 *
 * Every response checks TTL and burns the row if expired. After
 * MAX_FAILED_ATTEMPTS failed decrypts reported by the client, the row is
 * burned automatically.
 */
#[Route('/api/vault', name: 'api_vault_')]
final class VaultController extends AbstractController
{
    public function __construct(
        private readonly VaultEntryRepository $vaultRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly UserQuota $userQuota,
        #[Autowire(service: 'limiter.vault_create')]
        private readonly RateLimiterFactory $vaultCreateLimiter,
    ) {
    }

    /**
     * Fetch the caller's vault slot. 404 if empty or expired.
     * If expired, the row is burned before returning.
     */
    #[Route('', name: 'show', methods: ['GET'])]
    public function show(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $entry = $this->vaultRepository->findOneByOwner($user);

        if ($entry === null) {
            return $this->json(['error' => 'Vault is empty.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(VaultEntryVoter::VIEW, $entry);

        if ($entry->isExpired()) {
            $this->burn($entry);

            return $this->json(['error' => 'Vault entry expired.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->normalize($entry));
    }

    /**
     * Upsert the caller's vault slot. Replaces any existing entry.
     *
     * Expected JSON: { ciphertext: base64, salt: base64 }
     */
    #[Route('', name: 'upsert', methods: ['PUT'])]
    public function upsert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $limit = $this->vaultCreateLimiter->create($user->getUserIdentifier())->consume();
        if (!$limit->isAccepted()) {
            $retryAfter = max(1, $limit->getRetryAfter()->getTimestamp() - time());

            return new JsonResponse(
                ['error' => 'Trop de requêtes, réessayez plus tard.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $retryAfter],
            );
        }

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $ciphertext = isset($data['ciphertext']) && is_string($data['ciphertext']) ? $data['ciphertext'] : '';
        $salt = isset($data['salt']) && is_string($data['salt']) ? $data['salt'] : '';

        if ($ciphertext === '' || $salt === '') {
            return $this->json(['error' => 'ciphertext and salt are required.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$this->isBase64($ciphertext) || !$this->isBase64($salt)) {
            return $this->json(['error' => 'ciphertext and salt must be base64-encoded.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (strlen($ciphertext) > 1_048_576) {
            return $this->json(['error' => 'Ciphertext exceeds the maximum allowed size (1 MiB).'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $entry = $this->vaultRepository->findOneByOwner($user);
        $created = false;

        if ($entry === null) {
            try {
                $this->userQuota->ensureCanCreateVaultItem($user);
            } catch (QuotaExceededException $e) {
                return $this->json(
                    ['error' => 'Quota atteint', 'quota' => $e->getQuota(), 'limit' => $e->getLimit()],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }

            $entry = new VaultEntry();
            $entry->setOwner($user);
            $created = true;
        } else {
            $this->denyAccessUnlessGranted(VaultEntryVoter::EDIT, $entry);
            $entry->resetFailedAttempts();
            $entry->renewTtl();
        }

        $entry->setCiphertext($ciphertext);
        $entry->setSalt($salt);

        if ($created) {
            $this->entityManager->persist($entry);
        }

        $this->entityManager->flush();

        return $this->json(
            $this->normalize($entry),
            $created ? Response::HTTP_CREATED : Response::HTTP_OK,
        );
    }

    /**
     * Manually clear the caller's vault slot ("burn"). Idempotent.
     */
    #[Route('', name: 'delete', methods: ['DELETE'])]
    public function delete(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $entry = $this->vaultRepository->findOneByOwner($user);

        if ($entry !== null) {
            $this->denyAccessUnlessGranted(VaultEntryVoter::DELETE, $entry);
            $this->entityManager->remove($entry);
            $this->entityManager->flush();
        }

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Record a failed decrypt attempt reported by the client.
     * After MAX_FAILED_ATTEMPTS the entry is burned.
     *
     * Response: { burned: bool, remainingAttempts: int }
     */
    #[Route('/failed-attempt', name: 'failed_attempt', methods: ['POST'])]
    public function failedAttempt(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $entry = $this->vaultRepository->findOneByOwner($user);

        if ($entry === null) {
            return $this->json(['error' => 'Vault is empty.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(VaultEntryVoter::EDIT, $entry);

        if ($entry->isExpired()) {
            $this->burn($entry);

            return $this->json(['burned' => true, 'remainingAttempts' => 0]);
        }

        $attempts = $entry->incrementFailedAttempts();

        if ($attempts >= VaultEntry::MAX_FAILED_ATTEMPTS) {
            $this->burn($entry);

            return $this->json(['burned' => true, 'remainingAttempts' => 0]);
        }

        $this->entityManager->flush();

        return $this->json([
            'burned' => false,
            'remainingAttempts' => VaultEntry::MAX_FAILED_ATTEMPTS - $attempts,
        ]);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private function burn(VaultEntry $entry): void
    {
        $this->entityManager->remove($entry);
        $this->entityManager->flush();
    }

    private function normalize(VaultEntry $entry): array
    {
        $data = $this->serializer->normalize($entry, 'json', ['groups' => ['vault:read']]);
        $data['remainingAttempts'] = max(0, VaultEntry::MAX_FAILED_ATTEMPTS - $entry->getFailedAttempts());

        return $data;
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
