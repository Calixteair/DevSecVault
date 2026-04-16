<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * Loads or creates a local User entity from the Keycloak subject identifier.
 *
 * When a user authenticates for the first time, a new User row is created
 * with default ROLE_USER. Subsequent requests find and return the existing user.
 * Email and username will be synced from Keycloak claims in a later phase.
 *
 * @implements UserProviderInterface<User>
 */
final readonly class KeycloakUserProvider implements UserProviderInterface
{
    public function __construct(
        private UserRepository $userRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Load or auto-provision a user from the Keycloak 'sub' identifier.
     */
    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        return $this->loadUserFromClaims($identifier, []);
    }

    /**
     * Load or auto-provision a user, syncing role/email/username from Keycloak claims.
     *
     * @param array<string, mixed> $claims The full userinfo payload from Keycloak
     */
    public function loadUserFromClaims(string $identifier, array $claims): User
    {
        $user = $this->userRepository->findByKeycloakId($identifier);

        $role = $this->extractRoleFromClaims($claims);
        $email = is_string($claims['email'] ?? null) ? $claims['email'] : $identifier . '@placeholder.local';
        $username = is_string($claims['preferred_username'] ?? null)
            ? $claims['preferred_username']
            : 'user_' . substr($identifier, 0, 8);

        if ($user !== null) {
            // Sync role/email/username if they changed in Keycloak
            $changed = false;
            if ($user->getRoles() !== [$role]) {
                $user->setRole($role);
                $changed = true;
            }
            if ($user->getUsername() !== $username) {
                $user->setUsername($username);
                $changed = true;
            }
            // Email: only update if claim differs AND no unique-conflict risk; we keep it simple
            if ($changed) {
                $this->entityManager->flush();
            }

            return $user;
        }

        // Auto-provision: first login for this Keycloak user
        $user = new User();
        $user->setKeycloakId($identifier);
        $user->setEmail($email);
        $user->setUsername($username);
        $user->setRole($role);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    /**
     * Map Keycloak realm roles to a single Symfony role.
     * Priority: admin > user.
     *
     * ROLE_TEAM_LEAD is derived per-request from TeamMember rows, not from
     * Keycloak realm roles. See User::getRoles().
     *
     * @param array<string, mixed> $claims
     */
    private function extractRoleFromClaims(array $claims): string
    {
        $realmRoles = $claims['realm_access']['roles'] ?? [];

        if (!is_array($realmRoles)) {
            return 'ROLE_USER';
        }

        if (in_array('admin', $realmRoles, true) || in_array('ROLE_ADMIN', $realmRoles, true)) {
            return 'ROLE_ADMIN';
        }

        return 'ROLE_USER';
    }

    /**
     * Refresh the user. Since this is a stateless API, we return the user as-is.
     */
    public function refreshUser(UserInterface $user): UserInterface
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf(
                'Instances of "%s" are not supported.',
                $user::class,
            ));
        }

        return $user;
    }

    /**
     * Whether this provider supports the given user class.
     */
    public function supportsClass(string $class): bool
    {
        return $class === User::class || is_subclass_of($class, User::class);
    }
}
