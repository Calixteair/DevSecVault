<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Tag;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Tag>
 *
 * @method Tag|null find($id, $lockMode = null, $lockVersion = null)
 * @method Tag|null findOneBy(array $criteria, array $orderBy = null)
 * @method Tag[]    findAll()
 * @method Tag[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TagRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Tag::class);
    }

    /**
     * Admin listing — fetch tags enriched with how many concepts + payloads
     * reference them. Emits plain array rows (not hydrated entities) so the
     * controller can stream them straight into the JSON response.
     *
     * @return list<array{tag: Tag, conceptCount: int, payloadCount: int, usageCount: int}>
     */
    public function findWithUsageCount(): array
    {
        // Two correlated scalar subqueries keep the result set compact — a
        // single JOIN would explode rows by the product of concept×payload
        // shares. DBAL-level query against the join tables because the Tag
        // entity has no inverse collection on either side (owning side is on
        // Concept::tags / Payload::tags).
        $sql = <<<'SQL'
            SELECT
                t.id AS id,
                t.name AS name,
                t.is_official AS is_official,
                t.created_at AS created_at,
                COALESCE(ct.cnt, 0)::int AS concept_count,
                COALESCE(pt.cnt, 0)::int AS payload_count
            FROM tag t
            LEFT JOIN (
                SELECT tag_id, COUNT(*) AS cnt FROM concept_tag GROUP BY tag_id
            ) ct ON ct.tag_id = t.id
            LEFT JOIN (
                SELECT tag_id, COUNT(*) AS cnt FROM payload_tag GROUP BY tag_id
            ) pt ON pt.tag_id = t.id
            ORDER BY t.is_official DESC, (COALESCE(ct.cnt, 0) + COALESCE(pt.cnt, 0)) DESC, t.name ASC
        SQL;

        $conn = $this->getEntityManager()->getConnection();
        $rows = $conn->executeQuery($sql)->fetchAllAssociative();

        $out = [];
        foreach ($rows as $row) {
            $tag = $this->find($row['id']);
            if ($tag === null) {
                continue;
            }
            $conceptCount = (int) $row['concept_count'];
            $payloadCount = (int) $row['payload_count'];
            $out[] = [
                'tag' => $tag,
                'conceptCount' => $conceptCount,
                'payloadCount' => $payloadCount,
                'usageCount' => $conceptCount + $payloadCount,
            ];
        }

        return $out;
    }

    /**
     * Count concepts + payloads attached to a single tag. Cheap helper used
     * by the indexer to keep Meilisearch's `usageCount` field fresh.
     */
    public function usageCountFor(Tag $tag): int
    {
        $sql = <<<'SQL'
            SELECT
                (SELECT COUNT(*) FROM concept_tag WHERE tag_id = :id)
              + (SELECT COUNT(*) FROM payload_tag WHERE tag_id = :id)
            AS total
        SQL;

        $conn = $this->getEntityManager()->getConnection();
        $total = $conn->executeQuery($sql, ['id' => (string) $tag->getId()])->fetchOne();

        return (int) $total;
    }
}
