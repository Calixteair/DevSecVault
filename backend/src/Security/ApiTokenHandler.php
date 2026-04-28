<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\ApiToken;
use App\Repository\ApiTokenRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

/**
 * Validates Personal Access Tokens (PATs) prefixed with "dvs_".
 *
 * The token is hashed (SHA-256 hex) and looked up in `api_token`. On success,
 * the request is tagged with `_pat_id` and `_pat_include_admin` attributes so
 * the {@see ApiTokenGuardSubscriber} can enforce method and admin restrictions
 * later in the request lifecycle.
 *
 * `lastUsedAt` is bumped on every successful authentication.
 */
final readonly class ApiTokenHandler implements AccessTokenHandlerInterface
{
    public const REQUEST_ATTR_PAT_ID = '_pat_id';
    public const REQUEST_ATTR_PAT_INCLUDE_ADMIN = '_pat_include_admin';

    public function __construct(
        private ApiTokenRepository $apiTokenRepository,
        private UserRepository $userRepository,
        private EntityManagerInterface $entityManager,
        private RequestStack $requestStack,
    ) {
    }

    public function getUserBadgeFrom(string $accessToken): UserBadge
    {
        if (!str_starts_with($accessToken, ApiToken::PREFIX)) {
            throw new BadCredentialsException('Not a personal access token.');
        }

        $hash = hash('sha256', $accessToken);
        $token = $this->apiTokenRepository->findByTokenHash($hash);

        if ($token === null) {
            throw new BadCredentialsException('Invalid personal access token.');
        }

        if ($token->isExpired()) {
            throw new BadCredentialsException('Personal access token expired.');
        }

        $token->setLastUsedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        $request = $this->requestStack->getCurrentRequest();
        if ($request !== null) {
            $request->attributes->set(self::REQUEST_ATTR_PAT_ID, (string) $token->getId());
            $request->attributes->set(self::REQUEST_ATTR_PAT_INCLUDE_ADMIN, $token->getIncludeAdmin());
        }

        // Bypass the Keycloak user provider: it would re-sync the user's role
        // from empty claims and inadvertently downgrade ROLE_ADMIN to ROLE_USER.
        // The ApiToken row is the source of truth here — load the User directly.
        $keycloakId = $token->getUser()->getUserIdentifier();
        $userRepo = $this->userRepository;

        return new UserBadge(
            userIdentifier: $keycloakId,
            userLoader: function (string $identifier) use ($userRepo) {
                $user = $userRepo->findByKeycloakId($identifier);
                if ($user === null) {
                    throw new UserNotFoundException();
                }
                return $user;
            },
        );
    }
}
