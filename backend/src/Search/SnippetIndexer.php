<?php

declare(strict_types=1);

namespace App\Search;

use App\Entity\Concept;
use App\Entity\Snippet;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Sync the `snippets` Meilisearch index with Concept/Snippet data.
 *
 * Design choice: one document per Snippet (not per Concept). This lets users
 * search for "python snippets about sort" — the language is a first-class
 * filterable attribute. Concept-level metadata (title, description, tags,
 * visibility, owner) is denormalised onto each snippet document so a single
 * query can match without joins. The trade-off is that concept updates
 * require reindexing all child snippets; acceptable given the scale.
 *
 * SECURITY: the `code` field is intentionally NEVER indexed. Meilisearch
 * stores data on disk and the CC.md explicitly forbids pushing snippet
 * bodies into the index (prevents hosting-AV detection of offensive code).
 */
class SnippetIndexer
{
    public const INDEX = 'snippets';
    public const PRIMARY_KEY = 'id';

    public function __construct(
        private readonly MeilisearchClient $meili,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {
    }

    /**
     * Create the index with its settings if it doesn't already exist.
     * Idempotent.
     */
    public function ensureIndex(): void
    {
        $this->meili->ensureIndex(self::INDEX, self::PRIMARY_KEY, [
            // What users can type against
            'searchableAttributes' => ['title', 'description', 'language', 'tags'],
            // What the tenant token rules (and UI filters) can filter on
            'filterableAttributes' => ['visibility', 'owner_id', 'language', 'tags', 'concept_id'],
            'sortableAttributes' => ['updated_at'],
            // Title matters more than a stray word in the description
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

    /**
     * Reindex every snippet of a single concept. Called by listeners when a
     * concept's metadata changes (title/description/tags/visibility) since
     * those are denormalised onto every child snippet document.
     */
    public function indexConcept(Concept $concept): void
    {
        $documents = [];
        foreach ($concept->getSnippets() as $snippet) {
            $documents[] = $this->toDocument($snippet);
        }
        if (!empty($documents)) {
            $this->meili->addDocuments(self::INDEX, $documents);
        }
    }

    public function indexSnippet(Snippet $snippet): void
    {
        $this->meili->addDocuments(self::INDEX, [$this->toDocument($snippet)]);
    }

    public function removeSnippet(string $snippetId): void
    {
        $this->meili->deleteDocument(self::INDEX, $snippetId);
    }

    /**
     * @param array<int, string> $snippetIds
     */
    public function removeSnippets(array $snippetIds): void
    {
        $this->meili->deleteDocuments(self::INDEX, $snippetIds);
    }

    /**
     * Full rebuild: clear the index and re-push every snippet in the DB.
     * Used by the CLI command and for bootstrap scenarios.
     */
    public function reindexAll(): int
    {
        $this->ensureIndex();
        $this->meili->clearIndex(self::INDEX);

        $snippets = $this->em->getRepository(Snippet::class)->findAll();
        $documents = array_map(fn (Snippet $s) => $this->toDocument($s), $snippets);

        // Push in chunks to avoid hitting Meili's 2 GB body limit on huge datasets
        foreach (array_chunk($documents, 500) as $batch) {
            $this->meili->addDocuments(self::INDEX, $batch);
        }

        $this->logger->info('Reindexed snippets', ['count' => count($documents)]);
        return count($documents);
    }

    /**
     * @return array<string, mixed>
     */
    private function toDocument(Snippet $snippet): array
    {
        $concept = $snippet->getConcept();
        $tags = [];
        foreach ($concept->getTags() as $tag) {
            $tags[] = $tag->getName();
        }

        return [
            'id' => (string) $snippet->getId(),
            'concept_id' => (string) $concept->getId(),
            'title' => $concept->getTitle(),
            'description' => $concept->getDescription(),
            'language' => $snippet->getLanguage(),
            'tags' => $tags,
            'visibility' => $concept->getVisibility(),
            'owner_id' => (string) $concept->getOwner()->getId(),
            'updated_at' => $snippet->getUpdatedAt()->getTimestamp(),
        ];
    }
}
