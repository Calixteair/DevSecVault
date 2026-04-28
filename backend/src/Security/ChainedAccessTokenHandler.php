<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\ApiToken;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

/**
 * Routes the bearer token to the right handler:
 *  - tokens prefixed with "dvs_" → {@see ApiTokenHandler} (Personal Access Token)
 *  - everything else            → {@see KeycloakAccessTokenHandler} (Keycloak OIDC)
 *
 * Both handlers ultimately resolve to the same local User entity, so the rest
 * of the security stack (voters, controllers) is unchanged.
 */
final readonly class ChainedAccessTokenHandler implements AccessTokenHandlerInterface
{
    public function __construct(
        private ApiTokenHandler $patHandler,
        private KeycloakAccessTokenHandler $keycloakHandler,
    ) {
    }

    public function getUserBadgeFrom(string $accessToken): UserBadge
    {
        if (str_starts_with($accessToken, ApiToken::PREFIX)) {
            return $this->patHandler->getUserBadgeFrom($accessToken);
        }

        return $this->keycloakHandler->getUserBadgeFrom($accessToken);
    }
}
