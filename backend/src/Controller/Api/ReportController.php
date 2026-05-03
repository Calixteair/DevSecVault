<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Payload;
use App\Entity\Report;
use App\Entity\Snippet;
use App\Entity\User;
use App\Repository\ConceptRepository;
use App\Repository\PayloadRepository;
use App\Repository\ReportRepository;
use App\Repository\SnippetRepository;
use App\Service\ReportNotifier;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Lot 4 — public report submission endpoint.
 *
 * Anyone (including guests) can submit a report against a concept / snippet /
 * payload. The IP is hashed (SHA-256) before persistence — never stored clear.
 * Rate-limited at 5 / hour / IP via `limiter.report_submit`.
 */
#[Route('/api/reports', name: 'api_reports_')]
final class ReportController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ReportRepository $reportRepository,
        private readonly ConceptRepository $conceptRepository,
        private readonly SnippetRepository $snippetRepository,
        private readonly PayloadRepository $payloadRepository,
        private readonly ValidatorInterface $validator,
        private readonly ReportNotifier $reportNotifier,
        #[Autowire(service: 'limiter.report_submit')]
        private readonly RateLimiterFactory $reportSubmitLimiter,
        #[Autowire(env: 'REPORT_IP_HASH_SALT')]
        private readonly string $reportIpHashSalt,
    ) {
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        // Rate-limit by IP — 5/h. Returns 429 with Retry-After when exceeded.
        $clientIp = $request->getClientIp() ?? '0.0.0.0';
        $limit = $this->reportSubmitLimiter->create($clientIp)->consume();
        if (!$limit->isAccepted()) {
            $retryAfter = max(1, $limit->getRetryAfter()->getTimestamp() - time());
            return $this->json(
                ['error' => 'Rate limit exceeded. Try again later.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $retryAfter],
            );
        }

        $body = $this->decodeJson($request);
        if ($body instanceof JsonResponse) {
            return $body;
        }

        $targetType = (string) ($body['target_type'] ?? '');
        $targetIdRaw = (string) ($body['target_id'] ?? '');
        $reason = (string) ($body['reason'] ?? '');
        $details = $body['details'] ?? null;
        $details = is_string($details) ? trim($details) : null;
        if ($details === '') {
            $details = null;
        }

        if (!in_array($targetType, Report::TARGET_TYPES, true)) {
            return $this->json(['error' => 'Invalid target_type.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (!Uuid::isValid($targetIdRaw)) {
            return $this->json(['error' => 'Invalid target_id.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (!in_array($reason, Report::REASONS, true)) {
            return $this->json(['error' => 'Invalid reason.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $targetId = Uuid::fromString($targetIdRaw);

        $target = $this->loadTarget($targetType, $targetId);
        if ($target === null) {
            return $this->json(['error' => 'Target not found.'], Response::HTTP_NOT_FOUND);
        }
        if ($this->isRemoved($target)) {
            // Treat removed content like deleted — no further reports accepted.
            return $this->json(['error' => 'Target not found.'], Response::HTTP_NOT_FOUND);
        }

        $report = new Report();
        $report->setTargetType($targetType);
        $report->setTargetId($targetId);
        $report->setReason($reason);
        $report->setDetails($details);
        // HMAC-SHA256 with a server-side secret salt: prevents brute-force IPv4
        // recovery (the 2^32 search space would be trivial against a plain SHA-256).
        // Salt lives in OpenBao (REPORT_IP_HASH_SALT) — rotating it invalidates
        // correlations across past reports, which is desirable.
        $report->setReporterIpHash(hash_hmac('sha256', $clientIp, $this->reportIpHashSalt));

        $user = $this->getUser();
        if ($user instanceof User) {
            $report->setReporter($user);
        }

        $errors = $this->validator->validate($report);
        if (count($errors) > 0) {
            $messages = [];
            foreach ($errors as $error) {
                $messages[] = [
                    'property' => $error->getPropertyPath(),
                    'message' => $error->getMessage(),
                ];
            }
            return $this->json(['errors' => $messages], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->entityManager->persist($report);
        $this->entityManager->flush();

        $this->reportNotifier->notifyNewReport($report);

        return $this->json(['id' => (string) $report->getId()], Response::HTTP_CREATED);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function loadTarget(string $type, Uuid $id): Concept|Snippet|Payload|null
    {
        return match ($type) {
            Report::TARGET_CONCEPT => $this->conceptRepository->find($id),
            Report::TARGET_SNIPPET => $this->snippetRepository->find($id),
            Report::TARGET_PAYLOAD => $this->payloadRepository->find($id),
            default => null,
        };
    }

    private function isRemoved(Concept|Snippet|Payload $target): bool
    {
        return $target->getModerationStatus() === 'removed';
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function decodeJson(Request $request): array|JsonResponse
    {
        $content = $request->getContent();
        if ($content === '') {
            return $this->json(['error' => 'Request body is empty.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $data = json_decode($content, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Invalid JSON.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($data)) {
            return $this->json(['error' => 'Request body must be a JSON object.'], Response::HTTP_BAD_REQUEST);
        }

        return $data;
    }
}
