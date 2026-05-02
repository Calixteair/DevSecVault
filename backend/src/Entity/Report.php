<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ReportRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Lot 4 — User-submitted moderation reports.
 *
 * Targets are referenced by (target_type, target_id) instead of a real FK
 * because the reported resource may be hard-deleted while we still need to
 * keep the report row around as legal evidence (DSA, LCEN).
 *
 * The reporter's IP is hashed (SHA-256) — never stored in clear (RGPD).
 */
#[ORM\Entity(repositoryClass: ReportRepository::class)]
#[ORM\Table(name: 'report')]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_report_status', columns: ['status'])]
#[ORM\Index(name: 'idx_report_target', columns: ['target_type', 'target_id'])]
class Report
{
    public const TARGET_CONCEPT = 'concept';
    public const TARGET_SNIPPET = 'snippet';
    public const TARGET_PAYLOAD = 'payload';

    public const TARGET_TYPES = [
        self::TARGET_CONCEPT,
        self::TARGET_SNIPPET,
        self::TARGET_PAYLOAD,
    ];

    public const REASON_ILLEGAL_CONTENT = 'illegal_content';
    public const REASON_MALWARE_DISTRIBUTION = 'malware_distribution';
    public const REASON_PHISHING = 'phishing';
    public const REASON_COPYRIGHT = 'copyright';
    public const REASON_SPAM = 'spam';
    public const REASON_CSAM = 'csam';
    public const REASON_TERRORISM = 'terrorism';
    public const REASON_OTHER = 'other';

    public const REASONS = [
        self::REASON_ILLEGAL_CONTENT,
        self::REASON_MALWARE_DISTRIBUTION,
        self::REASON_PHISHING,
        self::REASON_COPYRIGHT,
        self::REASON_SPAM,
        self::REASON_CSAM,
        self::REASON_TERRORISM,
        self::REASON_OTHER,
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_REVIEWED = 'reviewed';
    public const STATUS_DISMISSED = 'dismissed';
    public const STATUS_ACTIONED = 'actioned';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_REVIEWED,
        self::STATUS_DISMISSED,
        self::STATUS_ACTIONED,
    ];

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[Groups(['report:list', 'report:read'])]
    private ?Uuid $id = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: self::TARGET_TYPES, message: 'Invalid target type.')]
    #[Groups(['report:list', 'report:read'])]
    private string $targetType;

    #[ORM\Column(type: UuidType::NAME)]
    #[Groups(['report:list', 'report:read'])]
    private Uuid $targetId;

    /**
     * Reporter user — nullable: guests can submit reports too.
     */
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'reporter_id', nullable: true, onDelete: 'SET NULL')]
    #[Groups(['report:list', 'report:read'])]
    private ?User $reporter = null;

    /**
     * SHA-256 hex digest of the reporter's IP (RGPD: never stored in clear).
     */
    #[ORM\Column(type: Types::STRING, length: 64)]
    #[Groups(['report:read'])]
    private string $reporterIpHash;

    #[ORM\Column(type: Types::STRING, length: 30)]
    #[Assert\NotBlank]
    #[Assert\Choice(choices: self::REASONS, message: 'Invalid reason.')]
    #[Groups(['report:list', 'report:read'])]
    private string $reason;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 2000, maxMessage: 'Details must not exceed 2000 characters.')]
    #[Groups(['report:list', 'report:read'])]
    private ?string $details = null;

    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => self::STATUS_PENDING])]
    #[Assert\Choice(choices: self::STATUSES, message: 'Invalid status.')]
    #[Groups(['report:list', 'report:read'])]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['report:list', 'report:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    #[Groups(['report:list', 'report:read'])]
    private ?\DateTimeImmutable $reviewedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'reviewed_by_id', nullable: true, onDelete: 'SET NULL')]
    #[Groups(['report:read'])]
    private ?User $reviewedBy = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Assert\Length(max: 1000, maxMessage: 'Notes must not exceed 1000 characters.')]
    #[Groups(['report:read'])]
    private ?string $adminNotes = null;

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getTargetType(): string
    {
        return $this->targetType;
    }

    public function setTargetType(string $targetType): static
    {
        $this->targetType = $targetType;

        return $this;
    }

    public function getTargetId(): Uuid
    {
        return $this->targetId;
    }

    public function setTargetId(Uuid $targetId): static
    {
        $this->targetId = $targetId;

        return $this;
    }

    public function getReporter(): ?User
    {
        return $this->reporter;
    }

    public function setReporter(?User $reporter): static
    {
        $this->reporter = $reporter;

        return $this;
    }

    public function getReporterIpHash(): string
    {
        return $this->reporterIpHash;
    }

    public function setReporterIpHash(string $reporterIpHash): static
    {
        $this->reporterIpHash = $reporterIpHash;

        return $this;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function setReason(string $reason): static
    {
        $this->reason = $reason;

        return $this;
    }

    public function getDetails(): ?string
    {
        return $this->details;
    }

    public function setDetails(?string $details): static
    {
        $this->details = $details;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getReviewedAt(): ?\DateTimeImmutable
    {
        return $this->reviewedAt;
    }

    public function setReviewedAt(?\DateTimeImmutable $reviewedAt): static
    {
        $this->reviewedAt = $reviewedAt;

        return $this;
    }

    public function getReviewedBy(): ?User
    {
        return $this->reviewedBy;
    }

    public function setReviewedBy(?User $reviewedBy): static
    {
        $this->reviewedBy = $reviewedBy;

        return $this;
    }

    public function getAdminNotes(): ?string
    {
        return $this->adminNotes;
    }

    public function setAdminNotes(?string $adminNotes): static
    {
        $this->adminNotes = $adminNotes;

        return $this;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }
}
