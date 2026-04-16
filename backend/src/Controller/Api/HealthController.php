<?php

declare(strict_types=1);

namespace App\Controller\Api;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController extends AbstractController
{
    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function __invoke(Connection $connection): JsonResponse
    {
        $databaseOk = false;

        try {
            $connection->executeQuery('SELECT 1');
            $databaseOk = true;
        } catch (\Throwable) {
            // Database is not reachable
        }

        return $this->json([
            'status' => $databaseOk ? 'ok' : 'degraded',
            'database' => $databaseOk,
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ]);
    }
}
