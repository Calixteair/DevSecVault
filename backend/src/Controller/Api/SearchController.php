<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Search\MeilisearchClient;
use App\Search\PayloadIndexer;
use App\Search\SnippetIndexer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Expose a Meilisearch tenant token scoped to the current user's rights.
 *
 * The token is safe to send to the browser: its permissions are locked by
 * the search rules baked into the JWT signature. The frontend will call
 * Meilisearch directly with this token, bypassing Symfony for search traffic.
 */
final class SearchController extends AbstractController
{
    /**
     * Tokens expire after 1 hour; the frontend is expected to refresh them
     * (short-lived tokens limit the blast radius if one leaks).
     */
    private const TOKEN_TTL_SECONDS = 3600;

    public function __construct(
        private readonly MeilisearchClient $meili,
    ) {
    }

    #[Route('/api/search/token', name: 'api_search_token', methods: ['GET'])]
    public function token(): JsonResponse
    {
        $user = $this->getUser();
        $rules = $this->buildSearchRules($user);

        $expiresAt = (new \DateTimeImmutable())->modify('+' . self::TOKEN_TTL_SECONDS . ' seconds');
        $token = $this->meili->generateTenantToken($rules, $expiresAt);

        return $this->json([
            'token' => $token,
            'expiresAt' => $expiresAt->format(\DateTimeInterface::ATOM),
            // Hint for the frontend to pick the right host — keeps config
            // on one side only.
            'host' => $_ENV['MEILI_PUBLIC_URL'] ?? null,
        ]);
    }

    /**
     * Build per-index search rules.
     *
     * Guest: only public content.
     * Authenticated: public content OR their own private content.
     *   (Team scoping added in Phase 6 — just extend the filter then.)
     *
     * @return array<string, array<string, mixed>>
     */
    private function buildSearchRules(?object $user): array
    {
        if ($user instanceof User && $user->getId() !== null) {
            $ownerFilter = sprintf(
                'visibility = public OR owner_id = "%s"',
                (string) $user->getId(),
            );
        } else {
            $ownerFilter = 'visibility = public';
        }

        return [
            SnippetIndexer::INDEX => [
                'filter' => $ownerFilter,
            ],
            PayloadIndexer::INDEX => [
                'filter' => $ownerFilter,
            ],
        ];
    }
}
