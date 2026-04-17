<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Payload;
use App\Entity\Tag;
use App\Entity\Team;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * Admin dashboard endpoints (Phase 7). Guarded by /api/admin → ROLE_ADMIN in
 * security.yaml; double-check here via IsGranted so any future route drift
 * doesn't accidentally expose the data.
 *
 * The admin only gets aggregate numbers + moderation listings for PUBLIC
 * content. Private/team content stays out of reach — E2E trust extends to
 * admin accounts (see ConceptVoter/PayloadVoter::canEdit, which restricts
 * admin moderation to `visibility = 'public'`).
 */
#[Route('/api/admin', name: 'api_admin_')]
#[IsGranted('ROLE_ADMIN')]
final class AdminController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
    ) {
    }

    /**
     * GET /api/admin/stats — high-level counters for the dashboard home.
     * All counts are computed in-DB (cheap) rather than hydrated.
     */
    #[Route('/stats', name: 'stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $em = $this->entityManager;

        $users = (int) $em->createQueryBuilder()
            ->select('COUNT(u.id)')->from(User::class, 'u')
            ->getQuery()->getSingleScalarResult();

        $teams = (int) $em->createQueryBuilder()
            ->select('COUNT(t.id)')->from(Team::class, 't')
            ->getQuery()->getSingleScalarResult();

        $tagsTotal = (int) $em->createQueryBuilder()
            ->select('COUNT(t.id)')->from(Tag::class, 't')
            ->getQuery()->getSingleScalarResult();

        $tagsOfficial = (int) $em->createQueryBuilder()
            ->select('COUNT(t.id)')->from(Tag::class, 't')
            ->where('t.isOfficial = true')
            ->getQuery()->getSingleScalarResult();

        $conceptsByVisibility = $this->countByVisibility(Concept::class, 'c');
        $payloadsByVisibility = $this->countByVisibility(Payload::class, 'p');

        return $this->json([
            'users' => $users,
            'teams' => $teams,
            'tags' => [
                'total' => $tagsTotal,
                'official' => $tagsOfficial,
            ],
            'concepts' => [
                'total' => array_sum($conceptsByVisibility),
                'public' => $conceptsByVisibility['public'] ?? 0,
                'team' => $conceptsByVisibility['team'] ?? 0,
                'private' => $conceptsByVisibility['private'] ?? 0,
            ],
            'payloads' => [
                'total' => array_sum($payloadsByVisibility),
                'public' => $payloadsByVisibility['public'] ?? 0,
                'team' => $payloadsByVisibility['team'] ?? 0,
                'private' => $payloadsByVisibility['private'] ?? 0,
            ],
        ]);
    }

    /**
     * GET /api/admin/public-content — paginated listing of public concepts +
     * payloads for moderation. Optional `?q=` filters on title.
     *
     * Response groups concepts and payloads into two arrays so the UI can
     * render them in dedicated tables without additional plumbing.
     */
    #[Route('/public-content', name: 'public_content', methods: ['GET'])]
    public function publicContent(Request $request): JsonResponse
    {
        $query = trim((string) $request->query->get('q', ''));

        $concepts = $this->findPublic(Concept::class, 'c', $query);
        $payloads = $this->findPublic(Payload::class, 'p', $query);

        return $this->json([
            'concepts' => $this->serializer->normalize($concepts, 'json', ['groups' => ['concept:list']]),
            'payloads' => $this->serializer->normalize($payloads, 'json', ['groups' => ['payload:list']]),
        ]);
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    /**
     * @param class-string $class
     * @return array<string, int>
     */
    private function countByVisibility(string $class, string $alias): array
    {
        $rows = $this->entityManager->createQueryBuilder()
            ->select(sprintf('%s.visibility AS visibility, COUNT(%s.id) AS cnt', $alias, $alias))
            ->from($class, $alias)
            ->groupBy(sprintf('%s.visibility', $alias))
            ->getQuery()
            ->getArrayResult();

        $out = ['public' => 0, 'team' => 0, 'private' => 0];
        foreach ($rows as $row) {
            $out[$row['visibility']] = (int) $row['cnt'];
        }

        return $out;
    }

    /**
     * @template T of Concept|Payload
     * @param class-string<T> $class
     * @return T[]
     */
    private function findPublic(string $class, string $alias, string $query): array
    {
        $qb = $this->entityManager->createQueryBuilder()
            ->select($alias)
            ->from($class, $alias)
            ->where(sprintf('%s.visibility = :v', $alias))
            ->setParameter('v', 'public')
            ->orderBy(sprintf('%s.updatedAt', $alias), 'DESC')
            ->setMaxResults(200);

        if ($query !== '') {
            $qb->andWhere(sprintf('LOWER(%s.title) LIKE :q', $alias))
               ->setParameter('q', '%' . mb_strtolower($query) . '%');
        }

        return $qb->getQuery()->getResult();
    }
}
