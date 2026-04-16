<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Team;
use App\Entity\TeamMember;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TeamMember>
 *
 * @method TeamMember|null find($id, $lockMode = null, $lockVersion = null)
 * @method TeamMember|null findOneBy(array $criteria, array $orderBy = null)
 * @method TeamMember[]    findAll()
 * @method TeamMember[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TeamMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TeamMember::class);
    }

    /**
     * Membership lookup — used for duplicate checks on join + role checks.
     */
    public function findOneByTeamAndUser(Team $team, User $user): ?TeamMember
    {
        return $this->createQueryBuilder('tm')
            ->andWhere('tm.team = :team')
            ->andWhere('tm.user = :user')
            ->setParameter('team', $team->getId(), 'uuid')
            ->setParameter('user', $user->getId(), 'uuid')
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * All teams the user belongs to (any role). Eager-joins team to avoid
     * N+1 when building a "my teams" listing or Meilisearch tenant scope.
     *
     * @return Team[]
     */
    public function findTeamsForUser(User $user): array
    {
        $rows = $this->createQueryBuilder('tm')
            ->leftJoin('tm.team', 't')->addSelect('t')
            ->andWhere('tm.user = :user')
            ->setParameter('user', $user->getId(), 'uuid')
            ->orderBy('t.name', 'ASC')
            ->getQuery()
            ->getResult();

        $teams = [];
        foreach ($rows as $tm) {
            $teams[] = $tm->getTeam();
        }

        return $teams;
    }

    /**
     * Counts memberships for a user — used to enforce the "max N teams per
     * user" cap before inserting a new TeamMember row.
     */
    public function countByUser(User $user): int
    {
        return (int) $this->createQueryBuilder('tm')
            ->select('COUNT(tm.id)')
            ->andWhere('tm.user = :user')
            ->setParameter('user', $user->getId(), 'uuid')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Returns the user whose role is 'lead' for this team, if any.
     */
    public function findLeadForTeam(Team $team): ?User
    {
        $tm = $this->createQueryBuilder('tm')
            ->leftJoin('tm.user', 'u')->addSelect('u')
            ->andWhere('tm.team = :team')
            ->andWhere('tm.role = :role')
            ->setParameter('team', $team->getId(), 'uuid')
            ->setParameter('role', TeamMember::ROLE_LEAD)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        return $tm?->getUser();
    }

    public function userIsLeadOf(User $user, Team $team): bool
    {
        $count = (int) $this->createQueryBuilder('tm')
            ->select('COUNT(tm.id)')
            ->andWhere('tm.team = :team')
            ->andWhere('tm.user = :user')
            ->andWhere('tm.role = :role')
            ->setParameter('team', $team->getId(), 'uuid')
            ->setParameter('user', $user->getId(), 'uuid')
            ->setParameter('role', TeamMember::ROLE_LEAD)
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    public function userIsMemberOf(User $user, Team $team): bool
    {
        $count = (int) $this->createQueryBuilder('tm')
            ->select('COUNT(tm.id)')
            ->andWhere('tm.team = :team')
            ->andWhere('tm.user = :user')
            ->setParameter('team', $team->getId(), 'uuid')
            ->setParameter('user', $user->getId(), 'uuid')
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }
}
