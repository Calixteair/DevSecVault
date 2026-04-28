<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\ApiToken;
use App\Entity\User;
use App\Repository\ApiTokenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Personal Access Tokens management.
 *
 * - GET    /api/me/tokens           list active tokens for the current user
 * - POST   /api/me/tokens           create a new token (returns the raw value once)
 * - DELETE /api/me/tokens/{id}      revoke (hard-delete) a token
 *
 * Browser-only: PAT-authenticated requests are blocked from creating/managing
 * tokens (see {@see \App\Security\ApiTokenGuardSubscriber}, which forbids PUT/PATCH
 * but DELETE/POST go through here — we add a defensive check below).
 */
#[Route('/api/me/tokens', name: 'api_me_tokens_')]
#[IsGranted('ROLE_USER')]
final class ApiTokenController extends AbstractController
{
    private const MAX_ACTIVE_TOKENS_PER_USER = 10;

    /**
     * Allowed expiry presets in seconds. `null` means no expiry ("never").
     */
    private const EXPIRY_PRESETS = [
        '7d' => 7 * 86_400,
        '30d' => 30 * 86_400,
        '90d' => 90 * 86_400,
        '1y' => 365 * 86_400,
        'never' => null,
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ApiTokenRepository $apiTokenRepository,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $this->ensureNotPatAuthenticated($request);

        /** @var User $user */
        $user = $this->getUser();

        $tokens = $this->apiTokenRepository->findActiveForUser($user);
        $data = $this->serializer->normalize($tokens, 'json', ['groups' => ['api_token:read']]);

        return $this->json($data);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $this->ensureNotPatAuthenticated($request);

        /** @var User $user */
        $user = $this->getUser();

        if ($this->apiTokenRepository->countForUser($user) >= self::MAX_ACTIVE_TOKENS_PER_USER) {
            return $this->json(
                ['error' => sprintf(
                    'You have reached the maximum of %d personal access tokens. Revoke an existing one first.',
                    self::MAX_ACTIVE_TOKENS_PER_USER,
                )],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        $name = trim((string) ($payload['name'] ?? ''));
        $expiryPreset = (string) ($payload['expiry'] ?? '30d');
        $includeAdmin = (bool) ($payload['includeAdmin'] ?? false);

        if (!array_key_exists($expiryPreset, self::EXPIRY_PRESETS)) {
            return $this->json(
                ['error' => 'Invalid expiry preset. Allowed: ' . implode(', ', array_keys(self::EXPIRY_PRESETS))],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        // includeAdmin is only honored if the user actually has ROLE_ADMIN.
        if ($includeAdmin && !in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return $this->json(
                ['error' => 'Cannot grant admin scope: this user is not an administrator.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $rawToken = $this->generateRawToken();
        $expiresAt = $this->computeExpiry($expiryPreset);

        $token = new ApiToken();
        $token->setUser($user);
        $token->setName($name);
        $token->setTokenHash(hash('sha256', $rawToken));
        $token->setPrefix(substr($rawToken, 0, ApiToken::PREFIX_VISIBLE_LENGTH));
        $token->setIncludeAdmin($includeAdmin);
        $token->setExpiresAt($expiresAt);

        $errors = $this->validator->validate($token);
        if (count($errors) > 0) {
            $payload = [];
            foreach ($errors as $error) {
                $payload[] = [
                    'property' => $error->getPropertyPath(),
                    'message' => $error->getMessage(),
                ];
            }
            return $this->json(['errors' => $payload], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->entityManager->persist($token);
        $this->entityManager->flush();

        $data = $this->serializer->normalize($token, 'json', ['groups' => ['api_token:read']]);
        // Raw token is returned ONCE — the client must persist it now or lose it.
        $data['token'] = $rawToken;

        return $this->json($data, Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(string $id, Request $request): JsonResponse
    {
        $this->ensureNotPatAuthenticated($request);

        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'Invalid token id.'], Response::HTTP_BAD_REQUEST);
        }

        /** @var User $user */
        $user = $this->getUser();

        $token = $this->apiTokenRepository->find(Uuid::fromString($id));
        if ($token === null || $token->getUser()->getId()?->equals($user->getId()) !== true) {
            // Timing-safe 404 — don't leak whether the id exists for another user.
            return $this->json(['error' => 'Token not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->entityManager->remove($token);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Generate a `dvs_<43 base64url chars>` token (256 bits of entropy).
     */
    private function generateRawToken(): string
    {
        $bytes = random_bytes(32);
        $b64 = rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');

        return ApiToken::PREFIX . $b64;
    }

    private function computeExpiry(string $preset): ?\DateTimeImmutable
    {
        $seconds = self::EXPIRY_PRESETS[$preset];
        if ($seconds === null) {
            return null;
        }

        return (new \DateTimeImmutable())->modify('+' . $seconds . ' seconds');
    }

    /**
     * Token management endpoints must not be reachable with a PAT — only with
     * a real Keycloak session. This prevents a leaked token from minting more
     * tokens or revoking peers.
     */
    private function ensureNotPatAuthenticated(Request $request): void
    {
        if ($request->attributes->has(\App\Security\ApiTokenHandler::REQUEST_ATTR_PAT_ID)) {
            throw $this->createAccessDeniedException(
                'Personal access tokens cannot manage other tokens. Use the web UI.',
            );
        }
    }
}
