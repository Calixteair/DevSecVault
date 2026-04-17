<?php

declare(strict_types=1);

namespace App\Search;

use App\Entity\Tag;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;

/**
 * Keep the `tags` Meilisearch index in sync with Doctrine writes.
 *
 * Failures are swallowed so transient Meili outages don't abort DB flushes —
 * `app:meilisearch:reindex` heals any drift on demand.
 */
#[AsDoctrineListener(event: Events::postPersist)]
#[AsDoctrineListener(event: Events::postUpdate)]
#[AsDoctrineListener(event: Events::preRemove)]
class TagIndexListener
{
    public function __construct(
        private readonly TagIndexer $indexer,
    ) {
    }

    public function postPersist(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Tag) {
                $this->indexer->indexTag($entity);
            }
        });
    }

    public function postUpdate(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Tag) {
                $this->indexer->indexTag($entity);
            }
        });
    }

    public function preRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Tag) {
                $id = $entity->getId();
                if ($id !== null) {
                    $this->indexer->removeTag((string) $id);
                }
            }
        });
    }

    private function safely(callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            error_log('[TagIndexListener] indexing failed: ' . $e->getMessage());
        }
    }
}
