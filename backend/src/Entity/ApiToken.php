<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ApiTokenRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ApiTokenRepository::class)]
#[ORM\Table(name: 'api_token')]
#[ORM\HasLifecycleCallbacks]
#[ORM\UniqueConstraint(name: 'uniq_api_token_hash', columns: ['token_hash'])]
#[ORM\Index(name: 'idx_api_token_user', columns: ['user_id'])]
class ApiToken
{
    public const PREFIX = 'dvs_';
    public const PREFIX_VISIBLE_LENGTH = 8;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['api_token:read'])]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::STRING, length: 100)]
    #[Assert\NotBlank(message: 'Name is required.')]
    #[Assert\Length(max: 100)]
    #[Groups(['api_token:read'])]
    private string $name;

    /**
     * Hex-encoded SHA-256 of the raw token. Lookup key for authentication.
     */
    #[ORM\Column(type: Types::STRING, length: 64, unique: true)]
    private string $tokenHash;

    /**
     * First N characters of the raw token (e.g. "dvs_a3f2"), shown in the UI
     * to help the user identify a token without exposing it.
     */
    #[ORM\Column(type: Types::STRING, length: 16)]
    #[Groups(['api_token:read'])]
    private string $prefix;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    #[Groups(['api_token:read'])]
    private bool $includeAdmin = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['api_token:read'])]
    private ?\DateTimeImmutable $expiresAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['api_token:read'])]
    private ?\DateTimeImmutable $lastUsedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['api_token:read'])]
    private \DateTimeImmutable $createdAt;

    public function getId(): ?Uuid
    {
        return $this->id;
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

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getTokenHash(): string
    {
        return $this->tokenHash;
    }

    public function setTokenHash(string $tokenHash): static
    {
        $this->tokenHash = $tokenHash;

        return $this;
    }

    public function getPrefix(): string
    {
        return $this->prefix;
    }

    public function setPrefix(string $prefix): static
    {
        $this->prefix = $prefix;

        return $this;
    }

    public function getIncludeAdmin(): bool
    {
        return $this->includeAdmin;
    }

    public function setIncludeAdmin(bool $includeAdmin): static
    {
        $this->includeAdmin = $includeAdmin;

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

    public function getLastUsedAt(): ?\DateTimeImmutable
    {
        return $this->lastUsedAt;
    }

    public function setLastUsedAt(?\DateTimeImmutable $lastUsedAt): static
    {
        $this->lastUsedAt = $lastUsedAt;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    #[Groups(['api_token:read'])]
    public function isExpired(): bool
    {
        return $this->expiresAt !== null && $this->expiresAt <= new \DateTimeImmutable();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }
}
