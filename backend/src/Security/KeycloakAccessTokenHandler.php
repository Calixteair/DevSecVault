<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Validates bearer tokens against the Keycloak userinfo endpoint.
 *
 * On success, the 'sub' claim from the Keycloak response is used as the user
 * identifier. The full userinfo payload is stored as attributes on the UserBadge
 * so the UserProvider can sync profile data (email, username, roles).
 */
final readonly class KeycloakAccessTokenHandler implements AccessTokenHandlerInterface
{
    public function __construct(
        private HttpClientInterface $httpClient,
        private KeycloakUserProvider $userProvider,
        private string $keycloakUrl,
        private string $keycloakRealm,
    ) {
    }

    public function getUserBadgeFrom(string $accessToken): UserBadge
    {
        $userinfoUrl = sprintf(
            '%s/realms/%s/protocol/openid-connect/userinfo',
            rtrim($this->keycloakUrl, '/'),
            $this->keycloakRealm,
        );

        try {
            $response = $this->httpClient->request('GET', $userinfoUrl, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Accept' => 'application/json',
                ],
            ]);

            $statusCode = $response->getStatusCode();

            if ($statusCode !== 200) {
                throw new BadCredentialsException(sprintf(
                    'Keycloak userinfo endpoint returned HTTP %d.',
                    $statusCode,
                ));
            }

            $userinfo = $response->toArray();
        } catch (BadCredentialsException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new BadCredentialsException(
                'Failed to validate access token against Keycloak.',
                previous: $e,
            );
        }

        $sub = $userinfo['sub'] ?? null;

        if (!is_string($sub) || $sub === '') {
            throw new BadCredentialsException(
                'Keycloak userinfo response is missing the "sub" claim.',
            );
        }

        // Custom loader: passes the full userinfo payload (including realm_access.roles)
        // to the UserProvider so it can sync the local User's role from Keycloak claims.
        return new UserBadge(
            userIdentifier: $sub,
            userLoader: fn (string $identifier) => $this->userProvider->loadUserFromClaims($identifier, $userinfo),
            attributes: $userinfo,
        );
    }
}
