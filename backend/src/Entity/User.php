<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'app_user')]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_keycloak_id', columns: ['keycloak_id'])]
#[ORM\UniqueConstraint(name: 'uniq_email', columns: ['email'])]
class User implements UserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['concept:list', 'concept:read', 'user:read'])]
    private ?Uuid $id = null;

    #[ORM\Column(type: Types::STRING, length: 255, unique: true)]
    private string $keycloakId;

    #[ORM\Column(type: Types::STRING, length: 255, unique: true)]
    private string $email;

    #[ORM\Column(type: Types::STRING, length: 255)]
    #[Groups(['concept:list', 'concept:read', 'user:read'])]
    private string $username;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $role = 'ROLE_USER';

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getKeycloakId(): string
    {
        return $this->keycloakId;
    }

    public function setKeycloakId(string $keycloakId): static
    {
        $this->keycloakId = $keycloakId;

        return $this;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;

        return $this;
    }

    public function getRole(): string
    {
        return $this->role;
    }

    public function setRole(string $role): static
    {
        $this->role = $role;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    // -----------------------------------------------------------------------
    // UserInterface implementation
    // -----------------------------------------------------------------------

    /**
     * The public representation of the user (e.g. a username, an email address, etc.)
     * Used by Symfony Security to identify the user.
     */
    public function getUserIdentifier(): string
    {
        return $this->keycloakId;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        return [$this->role];
    }

    /**
     * This method is not needed for a stateless API with external auth,
     * but is required by UserInterface.
     */
    public function eraseCredentials(): void
    {
        // No local credentials to erase
    }

    // -----------------------------------------------------------------------
    // Lifecycle callbacks
    // -----------------------------------------------------------------------

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
