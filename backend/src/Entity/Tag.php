<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TagRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TagRepository::class)]
#[ORM\Table(name: 'tag')]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_tag_name', columns: ['name'])]
class Tag
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['concept:list', 'concept:read', 'tag:read'])]
    private ?Uuid $id = null;

    #[ORM\Column(type: Types::STRING, length: 100, unique: true)]
    #[Groups(['concept:list', 'concept:read', 'tag:read'])]
    private string $name;

    #[ORM\Column(type: Types::BOOLEAN)]
    #[Groups(['concept:list', 'concept:read', 'tag:read'])]
    private bool $isOfficial = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

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
        $this->name = strtolower(trim($name));

        return $this;
    }

    public function isOfficial(): bool
    {
        return $this->isOfficial;
    }

    public function setIsOfficial(bool $isOfficial): static
    {
        $this->isOfficial = $isOfficial;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
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
