<?php

declare(strict_types=1);

namespace App\Search;

use App\Entity\Concept;
use App\Entity\Snippet;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;

/**
 * Keep the Meilisearch `snippets` index in sync with Doctrine writes.
 *
 * Strategy: react to Snippet AND Concept lifecycle events.
 * - Snippet persist/update → index just that document
 * - Snippet remove → delete the document (captured pre-remove while the id
 *   is still accessible on the entity)
 * - Concept persist/update → reindex every child snippet, since concept
 *   metadata (title, description, tags, visibility, owner) is denormalised
 *   onto each snippet document
 * - Concept remove → batch-delete all child snippet documents
 *
 * Error handling: failures are swallowed so that a temporarily unreachable
 * Meilisearch instance cannot break writes to the primary DB. An explicit
 * reindex command is available to heal drift.
 */
#[AsDoctrineListener(event: Events::postPersist)]
#[AsDoctrineListener(event: Events::postUpdate)]
#[AsDoctrineListener(event: Events::preRemove)]
class SnippetIndexListener
{
    public function __construct(
        private readonly SnippetIndexer $indexer,
    ) {
    }

    public function postPersist(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Snippet) {
                $this->indexer->indexSnippet($entity);
            } elseif ($entity instanceof Concept) {
                $this->indexer->indexConcept($entity);
            }
        });
    }

    public function postUpdate(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Snippet) {
                $this->indexer->indexSnippet($entity);
            } elseif ($entity instanceof Concept) {
                // Concept metadata changed — reindex all child snippets so
                // denormalised fields (title/description/tags/visibility) stay
                // consistent across documents.
                $this->indexer->indexConcept($entity);
            }
        });
    }

    public function preRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        $this->safely(function () use ($entity): void {
            if ($entity instanceof Snippet) {
                $id = $entity->getId();
                if ($id !== null) {
                    $this->indexer->removeSnippet((string) $id);
                }
            } elseif ($entity instanceof Concept) {
                $ids = [];
                foreach ($entity->getSnippets() as $snippet) {
                    $sid = $snippet->getId();
                    if ($sid !== null) {
                        $ids[] = (string) $sid;
                    }
                }
                if (!empty($ids)) {
                    $this->indexer->removeSnippets($ids);
                }
            }
        });
    }

    /**
     * Wrap Meilisearch calls in a try/catch so a transient indexing failure
     * never aborts a Doctrine flush. Failures are silent by design; the
     * reindex command rebuilds state if it drifts.
     */
    private function safely(callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            // Intentional swallow — see class docblock.
            error_log('[SnippetIndexListener] indexing failed: ' . $e->getMessage());
        }
    }
}
