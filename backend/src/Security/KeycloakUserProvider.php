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
        $user = $this->userRepository->findByKeycloakId($identifier);

        if ($user !== null) {
            return $user;
        }

        // Auto-provision: first login for this Keycloak user
        $user = new User();
        $user->setKeycloakId($identifier);
        $user->setEmail($identifier . '@placeholder.local');
        $user->setUsername('user_' . substr($identifier, 0, 8));
        $user->setRole('ROLE_USER');

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
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
