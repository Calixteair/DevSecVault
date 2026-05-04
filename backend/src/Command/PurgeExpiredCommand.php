<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\ApiToken;
use App\Entity\Report;
use App\Entity\SecretLink;
use App\Entity\VaultEntry;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Unified purge command for time-bound entities.
 *
 *  - SecretLink : drop rows whose expiresAt is in the past (Secure Bridge TTL).
 *  - VaultEntry : drop rows whose expiresAt is in the past (personal vault TTL).
 *  - ApiToken   : drop rows expired more than 30 days ago (cleanup of old
 *    revoked / expired tokens; recent ones stay around for the UI list).
 *  - Report     : drop reviewed rows older than 1 year (LCEN/DSA evidence
 *    retention requirement honored to the letter, then expunged).
 *
 * Idempotent: emits "purged: 0" lines when nothing matches. Designed to run
 * every few minutes from the Ofelia sidecar in prod, so output is plain and
 * stable to make grep / log parsing easy.
 */
#[AsCommand(
    name: 'app:purge-expired',
    description: 'Purge expired SecretLink / VaultEntry / old ApiToken / aged Report rows.'
)]
class PurgeExpiredCommand extends Command
{
    private const API_TOKEN_GRACE_DAYS = 30;
    private const REPORT_RETENTION_DAYS = 365;

    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $startedAt = microtime(true);
        $now = new \DateTimeImmutable();
        $apiTokenCutoff = $now->modify('-' . self::API_TOKEN_GRACE_DAYS . ' days');
        $reportCutoff = $now->modify('-' . self::REPORT_RETENTION_DAYS . ' days');

        $secretLinkPurged = $this->purgeExpired(SecretLink::class, $now);
        $vaultPurged = $this->purgeExpired(VaultEntry::class, $now);
        $apiTokenPurged = $this->purgeExpiredApiTokens($apiTokenCutoff);
        $reportPurged = $this->purgeAgedReports($reportCutoff);

        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        $io->writeln(sprintf('SecretLink purged: %d', $secretLinkPurged));
        $io->writeln(sprintf('Vault purged: %d', $vaultPurged));
        $io->writeln(sprintf('ApiToken purged: %d', $apiTokenPurged));
        $io->writeln(sprintf('Report purged: %d', $reportPurged));
        $io->writeln(sprintf('Total duration: %dms', $durationMs));

        return Command::SUCCESS;
    }

    /**
     * Bulk-delete every row whose expiresAt is strictly in the past.
     *
     * @param class-string $entityClass
     */
    private function purgeExpired(string $entityClass, \DateTimeImmutable $now): int
    {
        return (int) $this->em->createQueryBuilder()
            ->delete($entityClass, 'e')
            ->where('e.expiresAt < :now')
            ->setParameter('now', $now)
            ->getQuery()
            ->execute();
    }

    /**
     * ApiToken.expiresAt is nullable (long-lived tokens). Only the rows that
     * actually expired and have been so for more than 30 days are removed.
     */
    private function purgeExpiredApiTokens(\DateTimeImmutable $cutoff): int
    {
        return (int) $this->em->createQueryBuilder()
            ->delete(ApiToken::class, 't')
            ->where('t.expiresAt IS NOT NULL')
            ->andWhere('t.expiresAt < :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }

    /**
     * Reports are kept for 1 year after the moderation decision (LCEN / DSA
     * evidence requirement). Pending reports — those without a reviewedAt —
     * are left untouched: a stuck-pending report is a moderation backlog
     * issue, not a candidate for automatic deletion.
     */
    private function purgeAgedReports(\DateTimeImmutable $cutoff): int
    {
        return (int) $this->em->createQueryBuilder()
            ->delete(Report::class, 'r')
            ->where('r.reviewedAt IS NOT NULL')
            ->andWhere('r.reviewedAt < :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }
}
