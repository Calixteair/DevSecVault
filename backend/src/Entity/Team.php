<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TeamRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TeamRepository::class)]
#[ORM\Table(name: 'team')]
#[ORM\HasLifecycleCallbacks]
class Team
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    // `concept:*` / `payload:*` groups allow nested exposure when a concept or
    // payload serializes its `sharedTeams` collection (we need at least id+name
    // for the client-side "SHARED WITH" chips + unshare buttons).
    #[Groups(['team:list', 'team:read', 'concept:list', 'concept:read', 'payload:list', 'payload:read'])]
    private ?Uuid $id = null;

    #[ORM\Column(length: 120)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 120)]
    #[Groups(['team:list', 'team:read', 'concept:list', 'concept:read', 'payload:list', 'payload:read'])]
    private string $name;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['team:list', 'team:read'])]
    private User $owner;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['team:list', 'team:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['team:list', 'team:read'])]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, TeamMember>
     */
    #[ORM\OneToMany(targetEntity: TeamMember::class, mappedBy: 'team', cascade: ['remove'], orphanRemoval: true)]
    #[Groups(['team:read'])]
    private Collection $members;

    /**
     * @var Collection<int, TeamInviteLink>
     */
    #[ORM\OneToMany(targetEntity: TeamInviteLink::class, mappedBy: 'team', cascade: ['remove'], orphanRemoval: true)]
    #[Groups(['team:read'])]
    private Collection $inviteLinks;

    /**
     * Inverse side — Concept owns the join table (concept_team_share).
     *
     * @var Collection<int, Concept>
     */
    #[ORM\ManyToMany(targetEntity: Concept::class, mappedBy: 'sharedTeams')]
    private Collection $sharedConcepts;

    /**
     * Inverse side — Payload owns the join table (payload_team_share).
     *
     * @var Collection<int, Payload>
     */
    #[ORM\ManyToMany(targetEntity: Payload::class, mappedBy: 'sharedTeams')]
    private Collection $sharedPayloads;

    public function __construct()
    {
        $this->members = new ArrayCollection();
        $this->inviteLinks = new ArrayCollection();
        $this->sharedConcepts = new ArrayCollection();
        $this->sharedPayloads = new ArrayCollection();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getOwner(): User
    {
        return $this->owner;
    }

    public function setOwner(User $owner): static
    {
        $this->owner = $owner;

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

    /**
     * @return Collection<int, TeamMember>
     */
    public function getMembers(): Collection
    {
        return $this->members;
    }

    /**
     * @return Collection<int, TeamInviteLink>
     */
    public function getInviteLinks(): Collection
    {
        return $this->inviteLinks;
    }

    /**
     * @return Collection<int, Concept>
     */
    public function getSharedConcepts(): Collection
    {
        return $this->sharedConcepts;
    }

    /**
     * @return Collection<int, Payload>
     */
    public function getSharedPayloads(): Collection
    {
        return $this->sharedPayloads;
    }

    #[Groups(['team:list', 'team:read'])]
    public function getMemberCount(): int
    {
        return $this->members->count();
    }

    /**
     * Returns the user whose TeamMember role is 'lead'.
     * Falls back to the owner if no lead member row exists (e.g. fresh team
     * before the first membership row has been persisted).
     */
    public function getLead(): ?User
    {
        foreach ($this->members as $member) {
            if ($member->isLead()) {
                return $member->getUser();
            }
        }

        return $this->owner ?? null;
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
