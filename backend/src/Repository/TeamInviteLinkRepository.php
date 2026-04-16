<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Team;
use App\Entity\TeamInviteLink;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TeamInviteLink>
 *
 * @method TeamInviteLink|null find($id, $lockMode = null, $lockVersion = null)
 * @method TeamInviteLink|null findOneBy(array $criteria, array $orderBy = null)
 * @method TeamInviteLink[]    findAll()
 * @method TeamInviteLink[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TeamInviteLinkRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TeamInviteLink::class);
    }

    /**
     * Single-query lookup used by the "accept invite" endpoint: token (UUID)
     * must match, link must be active and not expired. Team is fetched
     * eagerly so the caller can attach the new TeamMember right away.
     */
    public function findUsableByToken(string $tokenUuid): ?TeamInviteLink
    {
        return $this->createQueryBuilder('til')
            ->leftJoin('til.team', 't')->addSelect('t')
            ->andWhere('til.id = :token')
            ->andWhere('til.isActive = :active')
            ->andWhere('til.expiresAt IS NULL OR til.expiresAt > :now')
            ->setParameter('token', $tokenUuid, 'uuid')
            ->setParameter('active', true)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * All links (active + inactive + expired) for the team-management UI,
     * ordered newest first.
     *
     * @return TeamInviteLink[]
     */
    public function findByTeam(Team $team): array
    {
        return $this->createQueryBuilder('til')
            ->leftJoin('til.createdBy', 'c')->addSelect('c')
            ->andWhere('til.team = :team')
            ->setParameter('team', $team->getId(), 'uuid')
            ->orderBy('til.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
