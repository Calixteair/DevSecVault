<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SnippetRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SnippetRepository::class)]
#[ORM\Table(name: 'snippet')]
#[ORM\HasLifecycleCallbacks]
class Snippet
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['concept:read', 'snippet:read'])]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: Concept::class, inversedBy: 'snippets')]
    #[ORM\JoinColumn(nullable: false)]
    private Concept $concept;

    #[ORM\Column(type: Types::STRING, length: 50)]
    #[Assert\NotBlank(message: 'Language is required.')]
    #[Assert\Length(max: 50)]
    #[Groups(['concept:read', 'concept:write', 'snippet:read', 'snippet:write'])]
    private string $language;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank(message: 'Code is required.')]
    #[Groups(['concept:read', 'concept:write', 'snippet:read', 'snippet:write'])]
    private string $code;

    #[ORM\Column(type: Types::INTEGER)]
    #[Groups(['concept:read', 'concept:write', 'snippet:read', 'snippet:write'])]
    private int $sortOrder = 0;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['concept:read', 'snippet:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['concept:read', 'snippet:read'])]
    private \DateTimeImmutable $updatedAt;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getConcept(): Concept
    {
        return $this->concept;
    }

    public function setConcept(Concept $concept): static
    {
        $this->concept = $concept;

        return $this;
    }

    public function getLanguage(): string
    {
        return $this->language;
    }

    public function setLanguage(string $language): static
    {
        $this->language = strtolower(trim($language));

        return $this;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = $code;

        return $this;
    }

    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }

    public function setSortOrder(int $sortOrder): static
    {
        $this->sortOrder = $sortOrder;

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
