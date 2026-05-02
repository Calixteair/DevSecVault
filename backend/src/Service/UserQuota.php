<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Concept;
use App\Entity\Payload;
use App\Entity\SecretLink;
use App\Entity\User;
use App\Entity\VaultEntry;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Per-user resource quotas.
 *
 * Each `ensureCanCreateXxx` runs a `SELECT COUNT(*)` for the relevant entity
 * scoped to the owner and throws {@see QuotaExceededException} if the next
 * insert would exceed the ceiling. Callers should invoke these methods before
 * `EntityManager::persist()` to fail fast and skip the cipher / serializer
 * work on a denied write.
 */
final class UserQuota
{
    public const MAX_CONCEPTS_PER_USER = 100;
    public const MAX_SNIPPETS_PER_CONCEPT = 20;
    public const MAX_PAYLOADS_PER_USER = 100;
    public const MAX_VAULT_ITEMS_PER_USER = 50;
    public const MAX_ACTIVE_SECRET_LINKS_PER_USER = 20;

    public const QUOTA_CONCEPTS = 'concepts';
    public const QUOTA_SNIPPETS = 'snippets';
    public const QUOTA_PAYLOADS = 'payloads';
    public const QUOTA_VAULT_ITEMS = 'vault_items';
    public const QUOTA_SECRET_LINKS = 'secret_links';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function ensureCanCreateConcept(User $user): void
    {
        $count = $this->countByOwner(Concept::class, $user);
        if ($count >= self::MAX_CONCEPTS_PER_USER) {
            throw new QuotaExceededException(self::QUOTA_CONCEPTS, self::MAX_CONCEPTS_PER_USER);
        }
    }

    public function ensureCanCreateSnippet(Concept $concept): void
    {
        $count = $concept->getSnippets()->count();
        if ($count >= self::MAX_SNIPPETS_PER_CONCEPT) {
            throw new QuotaExceededException(self::QUOTA_SNIPPETS, self::MAX_SNIPPETS_PER_CONCEPT);
        }
    }

    public function ensureCanCreatePayload(User $user): void
    {
        $count = $this->countByOwner(Payload::class, $user);
        if ($count >= self::MAX_PAYLOADS_PER_USER) {
            throw new QuotaExceededException(self::QUOTA_PAYLOADS, self::MAX_PAYLOADS_PER_USER);
        }
    }

    public function ensureCanCreateVaultItem(User $user): void
    {
        $count = $this->countByOwner(VaultEntry::class, $user);
        if ($count >= self::MAX_VAULT_ITEMS_PER_USER) {
            throw new QuotaExceededException(self::QUOTA_VAULT_ITEMS, self::MAX_VAULT_ITEMS_PER_USER);
        }
    }

    /**
     * A SecretLink is "active" while expiresAt > NOW(). Past entries that
     * haven't been purged yet don't count toward the quota.
     */
    public function ensureCanCreateSecretLink(User $user): void
    {
        $count = $this->countActiveSecretLinks($user);
        if ($count >= self::MAX_ACTIVE_SECRET_LINKS_PER_USER) {
            throw new QuotaExceededException(
                self::QUOTA_SECRET_LINKS,
                self::MAX_ACTIVE_SECRET_LINKS_PER_USER,
            );
        }
    }

    /**
     * Snapshot of the user's current footprint vs. the configured limits.
     * Useful for UI badges and admin dashboards.
     *
     * @return array{
     *     concepts: array{used: int, limit: int},
     *     payloads: array{used: int, limit: int},
     *     vault_items: array{used: int, limit: int},
     *     secret_links: array{used: int, limit: int},
     * }
     */
    public function currentUsage(User $user): array
    {
        return [
            self::QUOTA_CONCEPTS => [
                'used' => $this->countByOwner(Concept::class, $user),
                'limit' => self::MAX_CONCEPTS_PER_USER,
            ],
            self::QUOTA_PAYLOADS => [
                'used' => $this->countByOwner(Payload::class, $user),
                'limit' => self::MAX_PAYLOADS_PER_USER,
            ],
            self::QUOTA_VAULT_ITEMS => [
                'used' => $this->countByOwner(VaultEntry::class, $user),
                'limit' => self::MAX_VAULT_ITEMS_PER_USER,
            ],
            self::QUOTA_SECRET_LINKS => [
                'used' => $this->countActiveSecretLinks($user),
                'limit' => self::MAX_ACTIVE_SECRET_LINKS_PER_USER,
            ],
        ];
    }

    /**
     * @param class-string $entity
     */
    private function countByOwner(string $entity, User $user): int
    {
        return (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(e.id)')
            ->from($entity, 'e')
            ->where('e.owner = :owner')
            ->setParameter('owner', $user->getId(), 'uuid')
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function countActiveSecretLinks(User $user): int
    {
        return (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(s.id)')
            ->from(SecretLink::class, 's')
            ->where('s.owner = :owner')
            ->andWhere('s.expiresAt > :now')
            ->setParameter('owner', $user->getId(), 'uuid')
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getSingleScalarResult();
    }
}
