<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\VaultEntryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Secure Bridge — personal vault (single slot per user, E2E encrypted).
 *
 * The plaintext content and the passphrase NEVER reach the server:
 *  - Angular derives an AES-256-GCM key from the user's passphrase via Argon2id.
 *  - The client encrypts locally and only uploads {ciphertext, salt}.
 *  - Decryption happens exclusively on the client after fetching the row.
 *
 * TTL is a hard 10 minutes enforced by `expiresAt`. Every read refreshes
 * nothing; every PUT resets the 10-minute window. After 3 failed decrypt
 * attempts (reported by the client) the row is burned server-side.
 */
#[ORM\Entity(repositoryClass: VaultEntryRepository::class)]
#[ORM\Table(name: 'vault_entry')]
#[ORM\UniqueConstraint(name: 'uniq_vault_owner', columns: ['owner_id'])]
#[ORM\HasLifecycleCallbacks]
class VaultEntry
{
    public const TTL_SECONDS = 600; // 10 minutes
    public const MAX_FAILED_ATTEMPTS = 3;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['vault:read'])]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $owner;

    /**
     * Base64(iv || ciphertext || tag) — AES-256-GCM envelope produced by the
     * client using a key derived from the user's passphrase.
     */
    #[ORM\Column(type: Types::TEXT)]
    #[Assert\Length(
        max: 1_000_000,
        maxMessage: 'Le contenu dépasse la taille maximale autorisée.'
    )]
    #[Groups(['vault:read'])]
    private string $ciphertext = '';

    /**
     * Base64 salt (16 bytes) used by the client to re-derive the key on read.
     */
    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['vault:read'])]
    private string $salt = '';

    #[ORM\Column(type: Types::SMALLINT, options: ['default' => 0])]
    #[Groups(['vault:read'])]
    private int $failedAttempts = 0;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['vault:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['vault:read'])]
    private \DateTimeImmutable $updatedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['vault:read'])]
    private \DateTimeImmutable $expiresAt;

    public function getId(): ?Uuid
    {
        return $this->id;
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

    public function getCiphertext(): string
    {
        return $this->ciphertext;
    }

    public function setCiphertext(string $ciphertext): static
    {
        $this->ciphertext = $ciphertext;

        return $this;
    }

    public function getSalt(): string
    {
        return $this->salt;
    }

    public function setSalt(string $salt): static
    {
        $this->salt = $salt;

        return $this;
    }

    public function getFailedAttempts(): int
    {
        return $this->failedAttempts;
    }

    public function incrementFailedAttempts(): int
    {
        return ++$this->failedAttempts;
    }

    public function resetFailedAttempts(): static
    {
        $this->failedAttempts = 0;

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

    public function getExpiresAt(): \DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function isExpired(?\DateTimeImmutable $now = null): bool
    {
        $now ??= new \DateTimeImmutable();

        return $this->expiresAt <= $now;
    }

    public function renewTtl(): static
    {
        $this->expiresAt = (new \DateTimeImmutable())->modify('+' . self::TTL_SECONDS . ' seconds');

        return $this;
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
        $this->expiresAt = $now->modify('+' . self::TTL_SECONDS . ' seconds');
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
