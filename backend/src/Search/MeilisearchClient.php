<?php

declare(strict_types=1);

namespace App\Search;

use Symfony\Component\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface as HttpClientContract;

/**
 * Thin HTTP wrapper around the Meilisearch REST API.
 *
 * We avoid the official SDK to keep dependencies minimal and to have direct
 * control over tenant token generation (HS256 signed JWT).
 */
class MeilisearchClient
{
    public function __construct(
        private readonly HttpClientContract $http,
        private readonly string $meiliUrl,
        private readonly string $masterKey,
    ) {
    }

    /**
     * Ensure an index exists with the correct settings. Idempotent — safe to
     * call at boot or from a reindex command.
     *
     * @param array<string, mixed> $settings Meilisearch settings payload
     */
    public function ensureIndex(string $indexUid, string $primaryKey, array $settings): void
    {
        // Create or update index
        $this->request('POST', '/indexes', [
            'uid' => $indexUid,
            'primaryKey' => $primaryKey,
        ], allowConflict: true);

        // Apply settings (filterable/searchable/sortable attributes, etc.)
        $this->request('PATCH', "/indexes/$indexUid/settings", $settings);
    }

    /**
     * @param array<int, array<string, mixed>> $documents
     */
    public function addDocuments(string $indexUid, array $documents): void
    {
        if (empty($documents)) {
            return;
        }
        $this->request('POST', "/indexes/$indexUid/documents", $documents);
    }

    public function deleteDocument(string $indexUid, string $id): void
    {
        $this->request('DELETE', "/indexes/$indexUid/documents/$id");
    }

    /**
     * @param array<int, string> $ids
     */
    public function deleteDocuments(string $indexUid, array $ids): void
    {
        if (empty($ids)) {
            return;
        }
        $this->request('POST', "/indexes/$indexUid/documents/delete-batch", $ids);
    }

    /**
     * Remove every document from an index without touching its settings.
     */
    public function clearIndex(string $indexUid): void
    {
        $this->request('DELETE', "/indexes/$indexUid/documents");
    }

    /**
     * Generate a Meilisearch tenant token (HS256 JWT) scoped to search rules.
     *
     * Tenant tokens are signed with a real API key (not the master key —
     * Meilisearch rejects tokens signed with the master). We use the
     * built-in "Default Search API Key" whose permissions are already
     * scoped to `search` only; the tenant token narrows that further per
     * user via the filter rules.
     *
     * The returned token is safe to expose to the client: its permissions
     * are locked by the rules baked into the JWT signature.
     *
     * @param array<string, mixed> $searchRules E.g. ['snippets' => ['filter' => 'visibility = public']]
     */
    public function generateTenantToken(
        array $searchRules,
        ?\DateTimeImmutable $expiresAt = null,
    ): string {
        [$apiKey, $apiKeyUid] = $this->getSearchApiKey();

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload = [
            'searchRules' => $searchRules,
            'apiKeyUid' => $apiKeyUid,
        ];
        if ($expiresAt !== null) {
            $payload['exp'] = $expiresAt->getTimestamp();
        }

        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signingInput = implode('.', $segments);
        // HMAC secret = the raw API key value (NOT the master key)
        $signature = hash_hmac('sha256', $signingInput, $apiKey, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * Find the default search API key. Returns [key, uid].
     * Cached per process.
     *
     * @return array{0: string, 1: string}
     */
    private ?array $searchApiKey = null;

    private function getSearchApiKey(): array
    {
        if ($this->searchApiKey !== null) {
            return $this->searchApiKey;
        }
        $response = $this->request('GET', '/keys');
        $keys = $response['results'] ?? [];
        foreach ($keys as $key) {
            $actions = $key['actions'] ?? [];
            // The default search key exposes only the 'search' action across all indexes
            if (in_array('search', $actions, true) && !in_array('*', $actions, true)) {
                return $this->searchApiKey = [$key['key'], $key['uid']];
            }
        }
        throw new \RuntimeException('Could not locate a Meilisearch search API key.');
    }

    /**
     * @param array<string, mixed>|array<int, mixed>|null $body
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, array|null $body = null, bool $allowConflict = false): array
    {
        $options = [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->masterKey,
                'Content-Type' => 'application/json',
            ],
        ];
        if ($body !== null) {
            $options['json'] = $body;
        }

        $response = $this->http->request($method, rtrim($this->meiliUrl, '/') . $path, $options);
        $status = $response->getStatusCode();

        // Meilisearch returns 202 for enqueued tasks, 200 for synchronous reads,
        // and 409 when creating an index that already exists (idempotency).
        if ($status >= 400 && !($allowConflict && $status === 409)) {
            $content = $response->getContent(false);
            throw new \RuntimeException(
                "Meilisearch $method $path failed ($status): $content"
            );
        }

        $raw = $response->getContent(false);
        return $raw === '' ? [] : (json_decode($raw, true) ?? []);
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
