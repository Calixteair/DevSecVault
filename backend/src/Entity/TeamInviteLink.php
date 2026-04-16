<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TeamInviteLinkRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * Team invite link — the UUID id is the token shown in invite URLs
 * (e.g. /teams/invite/{id}). Keeping it as the PK avoids needing a
 * separate token column and gives us 128 bits of entropy for free.
 */
#[ORM\Entity(repositoryClass: TeamInviteLinkRepository::class)]
#[ORM\Table(name: 'team_invite_link')]
#[ORM\HasLifecycleCallbacks]
class TeamInviteLink
{
    public const DEFAULT_TTL_DAYS = 7;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['invite:read', 'team:read'])]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: Team::class, inversedBy: 'inviteLinks')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups(['invite:read'])]
    private Team $team;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['invite:read'])]
    private User $createdBy;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    #[Groups(['invite:read', 'team:read'])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['invite:read', 'team:read'])]
    private ?\DateTimeImmutable $expiresAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['invite:read', 'team:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct(Team $team, User $createdBy, ?int $expiresInDays = self::DEFAULT_TTL_DAYS)
    {
        $this->team = $team;
        $this->createdBy = $createdBy;

        if ($expiresInDays !== null) {
            $this->expiresAt = new \DateTimeImmutable("+{$expiresInDays} days");
        }
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getTeam(): Team
    {
        return $this->team;
    }

    public function getCreatedBy(): User
    {
        return $this->createdBy;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    /**
     * Computed status surfaced in the JSON response so the UI can colour-code
     * invite links without re-deriving the rule. Exposed under BOTH the
     * `invite:read` group (used by TeamInviteLinkController) and `team:read`
     * (used when the invite list is nested inside a Team detail response).
     */
    #[Groups(['invite:read', 'team:read'])]
    public function getStatus(): string
    {
        if (!$this->isActive) {
            return 'disabled';
        }

        if ($this->expiresAt !== null && $this->expiresAt <= new \DateTimeImmutable()) {
            return 'expired';
        }

        return 'active';
    }

    public function setIsActive(bool $isActive): static
    {
        $this->isActive = $isActive;

        return $this;
    }

    public function getExpiresAt(): ?\DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function setExpiresAt(?\DateTimeImmutable $expiresAt): static
    {
        $this->expiresAt = $expiresAt;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function isUsable(): bool
    {
        return $this->isActive
            && ($this->expiresAt === null || $this->expiresAt > new \DateTimeImmutable());
    }

    // -----------------------------------------------------------------------
    // Lifecycle callbacks
    // -----------------------------------------------------------------------

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }
}
