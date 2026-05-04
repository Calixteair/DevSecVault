<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Payload;
use App\Entity\SecretLink;
use App\Entity\User;
use App\Repository\TeamMemberRepository;
use App\Service\AccountDeletionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
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
        private readonly AccountDeletionService $accountDeletion,
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

    /**
     * DELETE /api/users/me — self-service account deletion (Lot 0 / RGPD).
     *
     * Cascade-deletes all owned content (concepts, snippets, payloads, vault
     * entries, secret links, API tokens, team memberships, owned teams,
     * invite links) and the user row itself. Reports made by the user keep
     * pointing to NULL (FK SET NULL — preserves LCEN evidence).
     *
     * The Keycloak account itself is deleted by the frontend via the user's
     * own token against Keycloak's Account API (`/realms/{r}/account`).
     *
     * Body must contain {"confirm": "DELETE"} to prevent accidental calls.
     * If the user is the lead of a team that still has other members, returns
     * 409 Conflict — they must transfer or dissolve those teams first.
     */
    #[Route('/api/users/me', name: 'api_users_me_delete', methods: ['DELETE'])]
    public function delete(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Not authenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || ($body['confirm'] ?? null) !== 'DELETE') {
            return $this->json(
                ['error' => 'Confirmation required: send {"confirm":"DELETE"}.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        if ($this->accountDeletion->isBlockedByTeamLeadership($user)) {
            return $this->json(
                [
                    'error' => 'team_leadership_blocks_deletion',
                    'message' => 'Vous êtes lead d\'une ou plusieurs équipes avec d\'autres membres. Transférez le rôle ou supprimez ces équipes avant de supprimer votre compte.',
                ],
                Response::HTTP_CONFLICT,
            );
        }

        $this->accountDeletion->deleteAccount($user);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
