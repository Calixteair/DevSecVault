<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ApiToken;
use App\Entity\Concept;
use App\Entity\Payload;
use App\Entity\SecretLink;
use App\Entity\Snippet;
use App\Entity\Team;
use App\Entity\TeamInviteLink;
use App\Entity\TeamMember;
use App\Entity\User;
use App\Entity\VaultEntry;
use App\Search\PayloadIndexer;
use App\Search\SnippetIndexer;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class AccountDeletionService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SnippetIndexer $snippetIndexer,
        private readonly PayloadIndexer $payloadIndexer,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function isBlockedByTeamLeadership(User $user): bool
    {
        $count = (int) $this->em->createQueryBuilder()
            ->select('COUNT(other.id)')
            ->from(TeamMember::class, 'lead')
            ->innerJoin(TeamMember::class, 'other', 'WITH', 'other.team = lead.team AND other.id != lead.id')
            ->where('lead.user = :uid')
            ->andWhere("lead.role = 'lead'")
            ->setParameter('uid', $user->getId(), 'uuid')
            ->getQuery()->getSingleScalarResult();

        return $count > 0;
    }

    public function deleteAccount(User $user): void
    {
        $uid = $user->getId();

        $snippetIds = array_map(
            static fn (array $r): string => (string) $r['id'],
            $this->em->createQueryBuilder()
                ->select('s.id')->from(Snippet::class, 's')
                ->innerJoin('s.concept', 'c')
                ->where('c.owner = :uid')
                ->setParameter('uid', $uid, 'uuid')
                ->getQuery()->getArrayResult(),
        );

        $payloadIds = array_map(
            static fn (array $r): string => (string) $r['id'],
            $this->em->createQueryBuilder()
                ->select('p.id')->from(Payload::class, 'p')
                ->where('p.owner = :uid')
                ->setParameter('uid', $uid, 'uuid')
                ->getQuery()->getArrayResult(),
        );

        $this->em->wrapInTransaction(function () use ($user, $uid): void {
            // ORM cascade ['persist', 'remove'] removes Snippets via Concept.
            $concepts = $this->em->getRepository(Concept::class)->findBy(['owner' => $user]);
            foreach ($concepts as $concept) {
                $this->em->remove($concept);
            }
            $payloads = $this->em->getRepository(Payload::class)->findBy(['owner' => $user]);
            foreach ($payloads as $payload) {
                $this->em->remove($payload);
            }
            $this->em->flush();

            // Bulk DQL for the rest — no cascade dependency on associated entities.
            foreach ([
                [VaultEntry::class, 'v', 'v.owner'],
                [SecretLink::class, 's', 's.owner'],
                [ApiToken::class, 't', 't.user'],
                [TeamMember::class, 'm', 'm.user'],
                [TeamInviteLink::class, 'l', 'l.createdBy'],
                [Team::class, 't', 't.owner'],
            ] as [$class, $alias, $field]) {
                $this->em->createQueryBuilder()
                    ->delete($class, $alias)
                    ->where("$field = :uid")
                    ->setParameter('uid', $uid, 'uuid')
                    ->getQuery()->execute();
            }

            $this->em->createQueryBuilder()
                ->delete(User::class, 'u')->where('u.id = :uid')
                ->setParameter('uid', $uid, 'uuid')
                ->getQuery()->execute();
        });

        if ($snippetIds !== []) {
            $this->reindexBestEffort(
                fn () => $this->snippetIndexer->removeSnippets($snippetIds),
                'snippets',
            );
        }
        foreach ($payloadIds as $id) {
            $this->reindexBestEffort(
                fn () => $this->payloadIndexer->removePayload($id),
                "payload $id",
            );
        }
    }

    private function reindexBestEffort(callable $action, string $context): void
    {
        try {
            $action();
        } catch (\Throwable $e) {
            $this->logger->warning('Meilisearch deindex failed during account deletion', [
                'context' => $context,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
