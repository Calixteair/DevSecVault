<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PayloadRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: PayloadRepository::class)]
#[ORM\Table(name: 'payload')]
#[ORM\HasLifecycleCallbacks]
class Payload
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['payload:list', 'payload:read'])]
    private ?Uuid $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    #[Assert\NotBlank(message: 'Title is required.')]
    #[Assert\Length(max: 255)]
    #[Groups(['payload:list', 'payload:read', 'payload:write'])]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['payload:list', 'payload:read', 'payload:write'])]
    private ?string $description = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    #[Assert\NotBlank(message: 'Category is required.')]
    #[Assert\Choice(
        choices: ['recon', 'exploitation', 'privesc', 'post-exploitation', 'defense', 'other'],
        message: 'Category must be one of: recon, exploitation, privesc, post-exploitation, defense, other.'
    )]
    #[Groups(['payload:list', 'payload:read', 'payload:write'])]
    private string $category = 'other';

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    #[Assert\Length(max: 50)]
    #[Groups(['payload:list', 'payload:read', 'payload:write'])]
    private ?string $language = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    #[Assert\Choice(choices: ['public', 'private', 'team'], message: 'Visibility must be public, private, or team.')]
    #[Groups(['payload:list', 'payload:read', 'payload:write'])]
    private string $visibility = 'private';

    /**
     * Lot 4 — moderation lifecycle. `active` for normal content, `flagged`
     * while under admin review, `hidden` if soft-removed (visible only to
     * the owner and admins), `removed` for legal-hold soft delete.
     *
     * Exposed only to admins via `payload:admin` group.
     */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'active'])]
    #[Assert\Choice(choices: ['active', 'flagged', 'hidden', 'removed'], message: 'Invalid moderation status.')]
    #[Groups(['payload:admin'])]
    private string $moderationStatus = 'active';

    /**
     * Base64(nonce || ciphertext || tag) — AES-256-GCM envelope.
     * NEVER exposed via serialization groups. The plaintext is attached at
     * response time by the controller as a virtual `body` field (payload:read).
     */
    #[ORM\Column(type: Types::TEXT, name: 'body_encrypted')]
    #[Assert\Length(
        max: 1_000_000,
        maxMessage: 'Le contenu dépasse la taille maximale autorisée.'
    )]
    private string $bodyEncrypted = '';

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['payload:list', 'payload:read'])]
    private User $owner;

    /**
     * Teams this payload is shared with (owning side of the M2M).
     *
     * @var Collection<int, Team>
     */
    #[ORM\ManyToMany(targetEntity: Team::class, inversedBy: 'sharedPayloads')]
    #[ORM\JoinTable(name: 'payload_team_share')]
    #[ORM\JoinColumn(name: 'payload_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'team_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    #[Groups(['payload:read', 'payload:list'])]
    private Collection $sharedTeams;

    /**
     * @var Collection<int, Tag>
     */
    #[ORM\ManyToMany(targetEntity: Tag::class)]
    #[ORM\JoinTable(name: 'payload_tag')]
    #[Groups(['payload:list', 'payload:read', 'payload:write'])]
    private Collection $tags;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['payload:list', 'payload:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['payload:list', 'payload:read'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->tags = new ArrayCollection();
        $this->sharedTeams = new ArrayCollection();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getCategory(): string
    {
        return $this->category;
    }

    public function setCategory(string $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getLanguage(): ?string
    {
        return $this->language;
    }

    public function setLanguage(?string $language): static
    {
        if ($language === null || trim($language) === '') {
            $this->language = null;
        } else {
            $this->language = strtolower(trim($language));
        }

        return $this;
    }

    public function getVisibility(): string
    {
        return $this->visibility;
    }

    public function setVisibility(string $visibility): static
    {
        $this->visibility = $visibility;

        return $this;
    }

    public function getModerationStatus(): string
    {
        return $this->moderationStatus;
    }

    public function setModerationStatus(string $moderationStatus): static
    {
        $this->moderationStatus = $moderationStatus;

        return $this;
    }

    public function getBodyEncrypted(): string
    {
        return $this->bodyEncrypted;
    }

    public function setBodyEncrypted(string $bodyEncrypted): static
    {
        $this->bodyEncrypted = $bodyEncrypted;

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

    /**
     * @return Collection<int, Tag>
     */
    public function getTags(): Collection
    {
        return $this->tags;
    }

    public function addTag(Tag $tag): static
    {
        if (!$this->tags->contains($tag)) {
            $this->tags->add($tag);
        }

        return $this;
    }

    public function removeTag(Tag $tag): static
    {
        $this->tags->removeElement($tag);

        return $this;
    }

    public function clearTags(): static
    {
        $this->tags->clear();

        return $this;
    }

    /**
     * @return Collection<int, Team>
     */
    public function getSharedTeams(): Collection
    {
        return $this->sharedTeams;
    }

    public function addSharedTeam(Team $team): static
    {
        if (!$this->sharedTeams->contains($team)) {
            $this->sharedTeams->add($team);
        }

        return $this;
    }

    public function removeSharedTeam(Team $team): static
    {
        $this->sharedTeams->removeElement($team);

        return $this;
    }

    public function isSharedWithTeam(Team $team): bool
    {
        return $this->sharedTeams->contains($team);
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
