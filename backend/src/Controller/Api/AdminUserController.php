<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

/**
 * Admin user-moderation endpoints.
 *
 * The kill-switch is local: setting `disabled = true` on the User row blocks
 * authentication via both Keycloak and PAT (see KeycloakUserProvider and
 * ApiTokenHandler — both throw DisabledException). To fully evict the user,
 * an admin must also disable the Keycloak account itself; this controller
 * only owns the local layer.
 */
#[Route('/api/admin/users', name: 'api_admin_users_')]
#[IsGranted('ROLE_ADMIN')]
final class AdminUserController extends AbstractController
{
    private const PAGE_SIZE = 50;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserRepository $userRepository,
    ) {
    }

    /**
     * GET /api/admin/users — paginated user list with optional `?q=` filter
     * on username or email (case-insensitive substring match).
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $query = trim((string) $request->query->get('q', ''));
        $page = max(1, (int) $request->query->get('page', 1));
        $offset = ($page - 1) * self::PAGE_SIZE;

        $qb = $this->entityManager->createQueryBuilder()
            ->select('u')
            ->from(User::class, 'u')
            ->orderBy('u.createdAt', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults(self::PAGE_SIZE);

        $countQb = $this->entityManager->createQueryBuilder()
            ->select('COUNT(u.id)')
            ->from(User::class, 'u');

        if ($query !== '') {
            $qb->andWhere('LOWER(u.username) LIKE :q OR LOWER(u.email) LIKE :q')
                ->setParameter('q', '%' . strtolower($query) . '%');
            $countQb->andWhere('LOWER(u.username) LIKE :q OR LOWER(u.email) LIKE :q')
                ->setParameter('q', '%' . strtolower($query) . '%');
        }

        $users = $qb->getQuery()->getResult();
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        return $this->json([
            'items' => array_map([$this, 'serializeUser'], $users),
            'total' => $total,
            'page' => $page,
            'pageSize' => self::PAGE_SIZE,
        ]);
    }

    #[Route('/{id}/ban', name: 'ban', methods: ['POST'], requirements: ['id' => '[0-9a-fA-F-]{36}'])]
    public function ban(string $id): JsonResponse
    {
        return $this->setDisabled($id, true);
    }

    #[Route('/{id}/unban', name: 'unban', methods: ['POST'], requirements: ['id' => '[0-9a-fA-F-]{36}'])]
    public function unban(string $id): JsonResponse
    {
        return $this->setDisabled($id, false);
    }

    private function setDisabled(string $id, bool $disabled): JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'Invalid user id.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user = $this->userRepository->find(Uuid::fromString($id));
        if ($user === null) {
            return $this->json(['error' => 'User not found.'], Response::HTTP_NOT_FOUND);
        }

        $current = $this->getUser();
        if ($current instanceof User && (string) $current->getId() === (string) $user->getId()) {
            return $this->json(['error' => 'You cannot ban yourself.'], Response::HTTP_FORBIDDEN);
        }

        if ($user->isDisabled() === $disabled) {
            return $this->json($this->serializeUser($user));
        }

        $user->setDisabled($disabled);
        $this->entityManager->flush();

        return $this->json($this->serializeUser($user));
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUser(User $user): array
    {
        return [
            'id' => (string) $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'role' => $user->getRole(),
            'disabled' => $user->isDisabled(),
            'teamCount' => $user->getMemberships()->count(),
            'createdAt' => $user->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
