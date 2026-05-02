<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Thrown by {@see UserQuota} when a write would exceed the configured limit
 * for a given resource type. Carries the quota name (e.g. "concepts") and the
 * numeric ceiling so the controller can build a structured 422 payload.
 */
final class QuotaExceededException extends \RuntimeException
{
    public function __construct(
        private readonly string $quota,
        private readonly int $limit,
        ?string $message = null,
    ) {
        parent::__construct($message ?? sprintf('Quota "%s" exceeded (limit %d).', $quota, $limit));
    }

    public function getQuota(): string
    {
        return $this->quota;
    }

    public function getLimit(): int
    {
        return $this->limit;
    }
}
