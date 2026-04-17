<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Payload;
use App\Entity\SecretLink;
use App\Entity\User;
use App\Repository\TeamMemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * User profile & personal dashboard endpoints (Phase 8).
 *
 * All routes require ROLE_USER (enforced by security.yaml `^/api` rule).
 */
final class UserController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TeamMemberRepository $teamMemberRepo,
    ) {
    }

    /**
     * GET /api/users/me — current user profile.
     */
    #[Route('/api/users/me', name: 'api_users_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Not authenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        $teams = $this->teamMemberRepo->findTeamsForUser($user);

        return $this->json([
            'id' => (string) $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'role' => $user->getRole(),
            'createdAt' => $user->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'teams' => array_map(fn ($t) => [
                'id' => (string) $t->getId(),
                'name' => $t->getName(),
            ], $teams),
        ]);
    }

    /**
     * GET /api/users/me/dashboard — personal stats + recent activity.
     */
    #[Route('/api/users/me/dashboard', name: 'api_users_me_dashboard', methods: ['GET'])]
    public function dashboard(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Not authenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        $em = $this->entityManager;
        $uid = $user->getId();

        $conceptCount = (int) $em->createQueryBuilder()
            ->select('COUNT(c.id)')->from(Concept::class, 'c')
            ->where('c.owner = :uid')->setParameter('uid', $uid, 'uuid')
            ->getQuery()->getSingleScalarResult();

        $payloadCount = (int) $em->createQueryBuilder()
            ->select('COUNT(p.id)')->from(Payload::class, 'p')
            ->where('p.owner = :uid')->setParameter('uid', $uid, 'uuid')
            ->getQuery()->getSingleScalarResult();

        $secretLinkCount = (int) $em->createQueryBuilder()
            ->select('COUNT(s.id)')->from(SecretLink::class, 's')
            ->where('s.owner = :uid')->setParameter('uid', $uid, 'uuid')
            ->getQuery()->getSingleScalarResult();

        $teamCount = count($this->teamMemberRepo->findTeamsForUser($user));

        // Recent activity: last 20 concepts + payloads interleaved by updatedAt
        $recentConcepts = $em->createQueryBuilder()
            ->select('c.id', 'c.title', 'c.updatedAt', 'c.createdAt')
            ->from(Concept::class, 'c')
            ->where('c.owner = :uid')->setParameter('uid', $uid, 'uuid')
            ->orderBy('c.updatedAt', 'DESC')
            ->setMaxResults(10)
            ->getQuery()->getArrayResult();

        $recentPayloads = $em->createQueryBuilder()
            ->select('p.id', 'p.title', 'p.updatedAt', 'p.createdAt')
            ->from(Payload::class, 'p')
            ->where('p.owner = :uid')->setParameter('uid', $uid, 'uuid')
            ->orderBy('p.updatedAt', 'DESC')
            ->setMaxResults(10)
            ->getQuery()->getArrayResult();

        $activity = [];
        foreach ($recentConcepts as $c) {
            $isNew = $c['createdAt']->format('U') === $c['updatedAt']->format('U');
            $activity[] = [
                'type' => 'concept',
                'action' => $isNew ? 'created' : 'updated',
                'id' => (string) $c['id'],
                'title' => $c['title'],
                'timestamp' => $c['updatedAt']->format(\DateTimeInterface::ATOM),
            ];
        }
        foreach ($recentPayloads as $p) {
            $isNew = $p['createdAt']->format('U') === $p['updatedAt']->format('U');
            $activity[] = [
                'type' => 'payload',
                'action' => $isNew ? 'created' : 'updated',
                'id' => (string) $p['id'],
                'title' => $p['title'],
                'timestamp' => $p['updatedAt']->format(\DateTimeInterface::ATOM),
            ];
        }

        // Sort interleaved list by timestamp desc, keep top 15
        usort($activity, fn ($a, $b) => strcmp($b['timestamp'], $a['timestamp']));
        $activity = array_slice($activity, 0, 15);

        return $this->json([
            'stats' => [
                'concepts' => $conceptCount,
                'payloads' => $payloadCount,
                'secretLinks' => $secretLinkCount,
                'teams' => $teamCount,
            ],
            'recentActivity' => $activity,
        ]);
    }
}
