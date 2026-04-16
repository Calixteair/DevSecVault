<?php

declare(strict_types=1);

namespace App\Search;

use App\Entity\Payload;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;

/**
 * Keep the `payloads` Meilisearch index in sync with Doctrine writes.
 *
 * One document per Payload. Failures are swallowed so a transient Meili
 * outage cannot break DB flushes — the `app:meilisearch:reindex` command
 * is available to heal any drift.
 */
#[AsDoctrineListener(event: Events::postPersist)]
#[AsDoctrineListener(event: Events::postUpdate)]
#[AsDoctrineListener(event: Events::preRemove)]
class PayloadIndexListener
{
    public function __construct(
        private readonly PayloadIndexer $indexer,
    ) {
    }

    public function postPersist(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Payload) {
                $this->indexer->indexPayload($entity);
            }
        });
    }

    public function postUpdate(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Payload) {
                $this->indexer->indexPayload($entity);
            }
        });
    }

    public function preRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Payload) {
                $id = $entity->getId();
                if ($id !== null) {
                    $this->indexer->removePayload((string) $id);
                }
            }
        });
    }

    /**
     * Wrap Meilisearch calls so a transient failure never aborts a Doctrine flush.
     */
    private function safely(callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            error_log('[PayloadIndexListener] indexing failed: ' . $e->getMessage());
        }
    }
}
