<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
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
    #[Groups(['concept:list', 'concept:read', 'payload:list', 'payload:read', 'user:read', 'team:list', 'team:read', 'invite:read'])]
    private ?Uuid $id = null;

    #[ORM\Column(type: Types::STRING, length: 255, unique: true)]
    private string $keycloakId;

    #[ORM\Column(type: Types::STRING, length: 255, unique: true)]
    #[Groups(['team:list', 'team:read', 'invite:read'])]
    private string $email;

    #[ORM\Column(type: Types::STRING, length: 255)]
    #[Groups(['concept:list', 'concept:read', 'payload:list', 'payload:read', 'user:read', 'team:list', 'team:read', 'invite:read'])]
    private string $username;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $role = 'ROLE_USER';

    /**
     * Lot 4 — admin-controlled local kill switch. When true, the user is
     * blocked at the firewall (no API access). The Keycloak account itself
     * must also be disabled via the Keycloak admin UI for full lockout —
     * see ReportController::resolve() for the TODO on the admin API call.
     */
    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $disabled = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * Team memberships for this user (internal — not exposed via serializer).
     *
     * @var Collection<int, TeamMember>
     */
    #[ORM\OneToMany(
        mappedBy: 'user',
        targetEntity: TeamMember::class,
        fetch: 'EXTRA_LAZY',
    )]
    private Collection $memberships;

    public function __construct()
    {
        $this->memberships = new ArrayCollection();
    }

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

    /**
     * Display name used by the Teams UI. Currently aliases `username` — kept
     * as a dedicated getter so we can swap to a profile-level field later
     * without breaking the frontend contract.
     */
    #[Groups(['team:list', 'team:read', 'invite:read'])]
    public function getDisplayName(): string
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

    public function isDisabled(): bool
    {
        return $this->disabled;
    }

    public function setDisabled(bool $disabled): static
    {
        $this->disabled = $disabled;

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
        $roles = [$this->role];

        // ROLE_TEAM_LEAD is app-derived from TeamMember rows, not from Keycloak claims.
        // Guard against uninitialized collection for freshly-constructed users
        // (e.g. auto-provisioned from Keycloak before persist).
        $memberships = $this->memberships ?? new ArrayCollection();
        $isLead = $memberships->exists(
            static fn (int|string $_key, TeamMember $m): bool => $m->isLead(),
        );

        if ($isLead) {
            $roles[] = 'ROLE_TEAM_LEAD';
        }

        return array_values(array_unique($roles));
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
    // Team memberships
    // -----------------------------------------------------------------------

    /**
     * @return Collection<int, TeamMember>
     */
    public function getMemberships(): Collection
    {
        return $this->memberships ??= new ArrayCollection();
    }

    /**
     * Whether this user is the lead of at least one team.
     */
    public function isLeadOfAny(): bool
    {
        $memberships = $this->memberships ?? new ArrayCollection();

        return $memberships->exists(
            static fn (int|string $_key, TeamMember $m): bool => $m->isLead(),
        );
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
