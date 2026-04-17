<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Payload;
use App\Entity\Tag;
use App\Entity\TeamMember;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Payload>
 *
 * @method Payload|null find($id, $lockMode = null, $lockVersion = null)
 * @method Payload|null findOneBy(array $criteria, array $orderBy = null)
 * @method Payload[]    findAll()
 * @method Payload[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class PayloadRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Payload::class);
    }

    /**
     * Find all payloads owned by a user (eager-load tags + owner).
     *
     * @return Payload[]
     */
    public function findByOwner(User $user): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.tags', 't')->addSelect('t')
            ->leftJoin('p.owner', 'o')->addSelect('o')
            ->andWhere('p.owner = :owner')
            ->setParameter('owner', $user->getId(), 'uuid')
            ->orderBy('p.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find all public payloads.
     *
     * @return Payload[]
     */
    public function findPublicPayloads(): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.tags', 't')->addSelect('t')
            ->leftJoin('p.owner', 'o')->addSelect('o')
            ->andWhere('p.visibility = :visibility')
            ->setParameter('visibility', 'public')
            ->orderBy('p.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Public + own payloads + team-shared payloads for an authenticated user.
     *
     * @return Payload[]
     */
    public function findVisibleToUser(User $user): array
    {
        $sharedIdsDql = $this->getEntityManager()->createQueryBuilder()
            ->select('p2share.id')
            ->from(Payload::class, 'p2share')
            ->innerJoin('p2share.sharedTeams', 'st')
            ->innerJoin(TeamMember::class, 'tm', 'WITH', 'tm.team = st')
            ->where('tm.user = :owner')
            ->getDQL();

        return $this->createQueryBuilder('p')
            ->leftJoin('p.tags', 't')->addSelect('t')
            ->leftJoin('p.owner', 'o')->addSelect('o')
            ->andWhere(
                'p.owner = :owner '
                . 'OR p.visibility = :public '
                . 'OR p.id IN (' . $sharedIdsDql . ')'
            )
            ->setParameter('owner', $user->getId(), 'uuid')
            ->setParameter('public', 'public')
            ->orderBy('p.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Fetch a payload only if the viewer is allowed to see it (public, owner,
     * or member of a team the payload is shared with). Used by the controller
     * before running the Voter check to avoid leaking existence through
     * 403 vs 404 timing.
     */
    public function findOneByIdVisibleToUser(Uuid $id, ?User $user): ?Payload
    {
        $qb = $this->createQueryBuilder('p')
            ->leftJoin('p.tags', 't')->addSelect('t')
            ->leftJoin('p.owner', 'o')->addSelect('o')
            ->andWhere('p.id = :id')
            ->setParameter('id', $id, 'uuid');

        if ($user instanceof User) {
            $sharedIdsDql = $this->getEntityManager()->createQueryBuilder()
                ->select('p2share.id')
                ->from(Payload::class, 'p2share')
                ->innerJoin('p2share.sharedTeams', 'st')
                ->innerJoin(TeamMember::class, 'tm', 'WITH', 'tm.team = st')
                ->where('tm.user = :owner')
                ->getDQL();

            $qb->andWhere(
                'p.owner = :owner '
                . 'OR p.visibility = :public '
                . 'OR p.id IN (' . $sharedIdsDql . ')'
            )
                ->setParameter('owner', $user->getId(), 'uuid')
                ->setParameter('public', 'public');
        } else {
            $qb->andWhere('p.visibility = :public')
                ->setParameter('public', 'public');
        }

        return $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * Find every payload that has the given tag attached. Used by the admin
     * merge flow to rewrite references from a source tag onto a target tag.
     *
     * @return Payload[]
     */
    public function findByTag(Tag $tag): array
    {
        return $this->createQueryBuilder('p')
            ->innerJoin('p.tags', 't')
            ->andWhere('t = :tag')
            ->setParameter('tag', $tag)
            ->getQuery()
            ->getResult();
    }
}
