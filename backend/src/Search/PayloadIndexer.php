<?php

declare(strict_types=1);

namespace App\Search;

use App\Entity\Payload;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Sync the `payloads` Meilisearch index with Cyber Toolbox data.
 *
 * SECURITY (critical): the payload body is NEVER indexed. Meilisearch stores
 * documents on disk, so pushing offensive scripts into the index would hand
 * them to the hosting AV on a platter. Only metadata (title, description,
 * tags, category, language, visibility, owner_id) leaves Symfony.
 */
class PayloadIndexer
{
    public const INDEX = 'payloads';
    public const PRIMARY_KEY = 'id';

    public function __construct(
        private readonly MeilisearchClient $meili,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {
    }

    /**
     * Create the index with its settings if it doesn't already exist.
     * Idempotent — safe to call on boot or from a reindex command.
     */
    public function ensureIndex(): void
    {
        $this->meili->ensureIndex(self::INDEX, self::PRIMARY_KEY, [
            // NOTE: NEVER add `body` / `bodyEncrypted` here.
            'searchableAttributes' => ['title', 'description', 'tags', 'category', 'language'],
            'filterableAttributes' => ['visibility', 'owner_id', 'category', 'language', 'tags'],
            'sortableAttributes' => ['updated_at'],
            'rankingRules' => [
                'words',
                'typo',
                'proximity',
                'attribute',
                'sort',
                'exactness',
            ],
        ]);
    }

    public function indexPayload(Payload $payload): void
    {
        $this->meili->addDocuments(self::INDEX, [$this->toDocument($payload)]);
    }

    public function removePayload(string $id): void
    {
        $this->meili->deleteDocument(self::INDEX, $id);
    }

    /**
     * Full rebuild: clear the index and re-push every payload in the DB.
     */
    public function reindexAll(): int
    {
        $this->ensureIndex();
        $this->meili->clearIndex(self::INDEX);

        $payloads = $this->em->getRepository(Payload::class)->findAll();
        $documents = array_map(fn (Payload $p) => $this->toDocument($p), $payloads);

        foreach (array_chunk($documents, 500) as $batch) {
            $this->meili->addDocuments(self::INDEX, $batch);
        }

        $this->logger->info('Reindexed payloads', ['count' => count($documents)]);
        return count($documents);
    }

    /**
     * @return array<string, mixed>
     */
    private function toDocument(Payload $payload): array
    {
        $tags = [];
        foreach ($payload->getTags() as $tag) {
            $tags[] = $tag->getName();
        }

        return [
            'id' => (string) $payload->getId(),
            'title' => $payload->getTitle(),
            'description' => $payload->getDescription(),
            'category' => $payload->getCategory(),
            'language' => $payload->getLanguage(),
            'tags' => $tags,
            'visibility' => $payload->getVisibility(),
            'owner_id' => (string) $payload->getOwner()->getId(),
            'updated_at' => $payload->getUpdatedAt()->getTimestamp(),
        ];
    }
}
