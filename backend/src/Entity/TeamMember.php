<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TeamMemberRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TeamMemberRepository::class)]
#[ORM\Table(name: 'team_member')]
#[ORM\UniqueConstraint(name: 'uniq_tm_team_user', columns: ['team_id', 'user_id'])]
#[ORM\Index(name: 'idx_tm_user', columns: ['user_id'])]
#[ORM\HasLifecycleCallbacks]
class TeamMember
{
    public const ROLE_LEAD = 'lead';
    public const ROLE_MEMBER = 'member';

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['team:read'])]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: Team::class, inversedBy: 'members')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Team $team;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'memberships')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    #[Groups(['team:read'])]
    private User $user;

    #[ORM\Column(length: 10)]
    #[Assert\Choice(choices: [self::ROLE_LEAD, self::ROLE_MEMBER])]
    #[Groups(['team:read'])]
    private string $role = self::ROLE_MEMBER;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['team:read'])]
    private \DateTimeImmutable $joinedAt;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getTeam(): Team
    {
        return $this->team;
    }

    public function setTeam(Team $team): static
    {
        $this->team = $team;

        return $this;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;

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

    public function getJoinedAt(): \DateTimeImmutable
    {
        return $this->joinedAt;
    }

    public function isLead(): bool
    {
        return $this->role === self::ROLE_LEAD;
    }

    // -----------------------------------------------------------------------
    // Lifecycle callbacks
    // -----------------------------------------------------------------------

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->joinedAt = new \DateTimeImmutable();
    }
}
