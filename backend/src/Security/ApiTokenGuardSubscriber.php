<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\RateLimiter\RateLimiterFactory;

/**
 * Enforces PAT-only restrictions:
 *  - PUT and PATCH are forbidden (CLI clients are limited to create / read / delete)
 *  - /api/admin/* is forbidden unless the token was minted with `includeAdmin = true`
 *  - 60 requests / minute per token (sliding window) — returns 429 with Retry-After
 *
 * Read/write to OWN-resources via voters keeps working as usual; the User entity
 * is the same one resolved from the Keycloak handler.
 */
final readonly class ApiTokenGuardSubscriber implements EventSubscriberInterface
{
    public function __construct(
        #[Autowire(service: 'limiter.api_token')]
        private RateLimiterFactory $apiTokenLimiter,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            // Run after the firewall (priority 8) so request attributes set by the
            // ApiTokenHandler are available, but before the controller is invoked.
            KernelEvents::REQUEST => [['onKernelRequest', 7]],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        if (!$request->attributes->has(ApiTokenHandler::REQUEST_ATTR_PAT_ID)) {
            return; // Not a PAT-authenticated request.
        }

        $method = $request->getMethod();
        if ($method === 'PUT' || $method === 'PATCH') {
            $event->setResponse(new JsonResponse(
                ['error' => 'Method not allowed for personal access tokens.'],
                Response::HTTP_METHOD_NOT_ALLOWED,
            ));
            return;
        }

        $path = $request->getPathInfo();
        $includeAdmin = (bool) $request->attributes->get(ApiTokenHandler::REQUEST_ATTR_PAT_INCLUDE_ADMIN, false);

        if (!$includeAdmin && str_starts_with($path, '/api/admin')) {
            $event->setResponse(new JsonResponse(
                ['error' => 'This personal access token does not have admin scope.'],
                Response::HTTP_FORBIDDEN,
            ));
            return;
        }

        $tokenId = (string) $request->attributes->get(ApiTokenHandler::REQUEST_ATTR_PAT_ID);
        $limit = $this->apiTokenLimiter->create($tokenId)->consume();

        if (!$limit->isAccepted()) {
            $retryAfter = max(1, $limit->getRetryAfter()->getTimestamp() - time());
            $event->setResponse(new JsonResponse(
                ['error' => 'Rate limit exceeded. Try again later.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $retryAfter],
            ));
        }
    }
}
