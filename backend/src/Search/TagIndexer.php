<?php

declare(strict_types=1);

namespace App\Search;

use App\Entity\Tag;
use App\Repository\TagRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Sync the `tags` Meilisearch index for autocomplete dropdowns.
 *
 * Index payload is intentionally tiny: name + isOfficial + usageCount.
 * No sensitive data; tags are a shared taxonomy. Official tags get
 * surfaced first via the ranking rule sort on `isOfficial`.
 */
class TagIndexer
{
    public const INDEX = 'tags';
    public const PRIMARY_KEY = 'id';

    public function __construct(
        private readonly MeilisearchClient $meili,
        private readonly EntityManagerInterface $em,
        private readonly TagRepository $tagRepository,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {
    }

    /**
     * Create or update the `tags` index. Idempotent.
     */
    public function ensureIndex(): void
    {
        $this->meili->ensureIndex(self::INDEX, self::PRIMARY_KEY, [
            'searchableAttributes' => ['name'],
            'filterableAttributes' => ['isOfficial'],
            'sortableAttributes' => ['usageCount', 'isOfficial', 'name'],
            'rankingRules' => [
                // Officials first, then most-used, then textual relevance.
                'sort',
                'words',
                'typo',
                'proximity',
                'attribute',
                'exactness',
            ],
        ]);
    }

    public function indexTag(Tag $tag): void
    {
        $this->meili->addDocuments(self::INDEX, [$this->toDocument($tag)]);
    }

    public function removeTag(string $id): void
    {
        $this->meili->deleteDocument(self::INDEX, $id);
    }

    /**
     * Full rebuild: clear and re-push every tag from the DB.
     */
    public function reindexAll(): int
    {
        $this->ensureIndex();
        $this->meili->clearIndex(self::INDEX);

        $tags = $this->tagRepository->findAll();
        $documents = array_map(fn (Tag $t) => $this->toDocument($t), $tags);

        foreach (array_chunk($documents, 500) as $batch) {
            $this->meili->addDocuments(self::INDEX, $batch);
        }

        $this->logger->info('Reindexed tags', ['count' => count($documents)]);
        return count($documents);
    }

    /**
     * @return array<string, mixed>
     */
    private function toDocument(Tag $tag): array
    {
        return [
            'id' => (string) $tag->getId(),
            'name' => $tag->getName(),
            'isOfficial' => $tag->isOfficial(),
            'usageCount' => $this->tagRepository->usageCountFor($tag),
        ];
    }
}
