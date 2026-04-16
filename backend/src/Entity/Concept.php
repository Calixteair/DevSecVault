<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ConceptRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ConceptRepository::class)]
#[ORM\Table(name: 'concept')]
#[ORM\HasLifecycleCallbacks]
class Concept
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['concept:list', 'concept:read'])]
    private ?Uuid $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    #[Assert\NotBlank(message: 'Title is required.')]
    #[Assert\Length(max: 255)]
    #[Groups(['concept:list', 'concept:read', 'concept:write'])]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['concept:list', 'concept:read', 'concept:write'])]
    private ?string $description = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    #[Assert\Choice(choices: ['public', 'private', 'team'], message: 'Visibility must be public, private, or team.')]
    #[Groups(['concept:list', 'concept:read', 'concept:write'])]
    private string $visibility = 'private';

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['concept:list', 'concept:read'])]
    private User $owner;

    // Team relation — placeholder as string until Team entity is created (Phase 6)
    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    #[Groups(['concept:read'])]
    private ?Uuid $teamId = null;

    /**
     * @var Collection<int, Tag>
     */
    #[ORM\ManyToMany(targetEntity: Tag::class)]
    #[ORM\JoinTable(name: 'concept_tag')]
    #[Groups(['concept:list', 'concept:read', 'concept:write'])]
    private Collection $tags;

    /**
     * @var Collection<int, Snippet>
     */
    #[ORM\OneToMany(targetEntity: Snippet::class, mappedBy: 'concept', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    #[Groups(['concept:read', 'concept:write'])]
    private Collection $snippets;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['concept:list', 'concept:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['concept:list', 'concept:read'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->tags = new ArrayCollection();
        $this->snippets = new ArrayCollection();
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

    public function getVisibility(): string
    {
        return $this->visibility;
    }

    public function setVisibility(string $visibility): static
    {
        $this->visibility = $visibility;

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

    public function getTeamId(): ?Uuid
    {
        return $this->teamId;
    }

    public function setTeamId(?Uuid $teamId): static
    {
        $this->teamId = $teamId;

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
     * @return Collection<int, Snippet>
     */
    public function getSnippets(): Collection
    {
        return $this->snippets;
    }

    public function addSnippet(Snippet $snippet): static
    {
        if (!$this->snippets->contains($snippet)) {
            $this->snippets->add($snippet);
            $snippet->setConcept($this);
        }

        return $this;
    }

    public function removeSnippet(Snippet $snippet): static
    {
        if ($this->snippets->removeElement($snippet)) {
            // orphanRemoval will handle deletion
        }

        return $this;
    }

    #[Groups(['concept:list'])]
    public function getSnippetCount(): int
    {
        return $this->snippets->count();
    }

    /**
     * @return string[]
     */
    #[Groups(['concept:list'])]
    public function getLanguages(): array
    {
        $languages = [];
        foreach ($this->snippets as $snippet) {
            $lang = $snippet->getLanguage();
            if ($lang !== '' && !in_array($lang, $languages, true)) {
                $languages[] = $lang;
            }
        }
        return $languages;
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
