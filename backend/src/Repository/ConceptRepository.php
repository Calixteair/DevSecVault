<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Concept;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Concept>
 *
 * @method Concept|null find($id, $lockMode = null, $lockVersion = null)
 * @method Concept|null findOneBy(array $criteria, array $orderBy = null)
 * @method Concept[]    findAll()
 * @method Concept[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ConceptRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Concept::class);
    }

    /**
     * Find all concepts owned by a user.
     *
     * @return Concept[]
     */
    public function findByOwner(User $user): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.owner = :owner')
            ->setParameter('owner', $user->getId(), 'uuid')
            ->orderBy('c.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find all public concepts.
     *
     * @return Concept[]
     */
    public function findPublicConcepts(): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.visibility = :visibility')
            ->setParameter('visibility', 'public')
            ->orderBy('c.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find concepts owned by a user filtered by visibility.
     *
     * @return Concept[]
     */
    public function findByOwnerAndVisibility(User $user, string $visibility): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.owner = :owner')
            ->andWhere('c.visibility = :visibility')
            ->setParameter('owner', $user->getId(), 'uuid')
            ->setParameter('visibility', $visibility)
            ->orderBy('c.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find all concepts visible to a user: their own (any visibility) + public from others.
     *
     * @return Concept[]
     */
    public function findVisibleToUser(User $user): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.owner = :owner OR c.visibility = :public')
            ->setParameter('owner', $user->getId(), 'uuid')
            ->setParameter('public', 'public')
            ->orderBy('c.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
