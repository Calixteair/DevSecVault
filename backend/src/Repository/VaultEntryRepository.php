<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use App\Entity\VaultEntry;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<VaultEntry>
 *
 * @method VaultEntry|null find($id, $lockMode = null, $lockVersion = null)
 * @method VaultEntry|null findOneBy(array $criteria, array $orderBy = null)
 * @method VaultEntry[]    findAll()
 * @method VaultEntry[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class VaultEntryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, VaultEntry::class);
    }

    /**
     * Single-slot lookup: each user has at most one vault entry.
     */
    public function findOneByOwner(User $user): ?VaultEntry
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.owner = :owner')
            ->setParameter('owner', $user->getId(), 'uuid')
            ->getQuery()
            ->getOneOrNullResult();
    }
}
