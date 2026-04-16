<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\SecretLink;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<SecretLink>
 *
 * @method SecretLink|null find($id, $lockMode = null, $lockVersion = null)
 * @method SecretLink|null findOneBy(array $criteria, array $orderBy = null)
 * @method SecretLink[]    findAll()
 * @method SecretLink[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class SecretLinkRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SecretLink::class);
    }

    public function findOneById(Uuid $id): ?SecretLink
    {
        return $this->createQueryBuilder('s')
            ->leftJoin('s.owner', 'o')->addSelect('o')
            ->andWhere('s.id = :id')
            ->setParameter('id', $id, 'uuid')
            ->getQuery()
            ->getOneOrNullResult();
    }
}
