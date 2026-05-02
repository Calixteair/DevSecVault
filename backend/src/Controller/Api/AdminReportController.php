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
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

/**
 * Lot 4 — admin moderation endpoints.
 *
 * - GET  /api/admin/reports?status=pending  list reports (default: pending)
 * - POST /api/admin/reports/{id}/resolve    apply an action and close the report
 *
 * Actions:
 *   dismiss   → report.status = dismissed (no impact on target)
 *   hide      → report.status = actioned, target.moderation_status = hidden
 *   remove    → report.status = actioned, target.moderation_status = removed
 *               (soft-delete: row kept for legal evidence)
 *   ban_user  → as `remove` + flag the target's owner as locally disabled.
 *               Keycloak account itself must be disabled out-of-band until a
 *               proper Keycloak admin API integration ships (see TODO below).
 */
#[Route('/api/admin/reports', name: 'api_admin_reports_')]
#[IsGranted('ROLE_ADMIN')]
final class AdminReportController extends AbstractController
{
    private const ALLOWED_STATUS_FILTERS = [
        Report::STATUS_PENDING,
        Report::STATUS_REVIEWED,
        Report::STATUS_DISMISSED,
        Report::STATUS_ACTIONED,
    ];

    private const ACTIONS = ['dismiss', 'hide', 'remove', 'ban_user'];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ReportRepository $reportRepository,
        private readonly ConceptRepository $conceptRepository,
        private readonly SnippetRepository $snippetRepository,
        private readonly PayloadRepository $payloadRepository,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * GET /api/admin/reports?status=pending — list reports for triage.
     *
     * The response embeds a `target_preview` for each report, showing the
     * current title / description (and visibility / moderation status) of the
     * reported resource if it still exists. If the target was hard-deleted,
     * `target_preview` is null so the admin can still close the report.
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $status = (string) $request->query->get('status', Report::STATUS_PENDING);
        if (!in_array($status, self::ALLOWED_STATUS_FILTERS, true)) {
            return $this->json(
                ['error' => 'Invalid status filter.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $reports = $status === Report::STATUS_PENDING
            ? $this->reportRepository->findPendingOrderedByCreatedAt()
            : $this->reportRepository->findByStatusOrderedByCreatedAt($status);

        $items = [];
        foreach ($reports as $report) {
            $items[] = $this->serializeReport($report);
        }

        return $this->json(['items' => $items, 'count' => count($items)]);
    }

    /**
     * POST /api/admin/reports/{id}/resolve — apply an action and close the report.
     */
    #[Route('/{id}/resolve', name: 'resolve', methods: ['POST'])]
    public function resolve(string $id, Request $request): JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'Invalid report id.'], Response::HTTP_NOT_FOUND);
        }

        $report = $this->reportRepository->find(Uuid::fromString($id));
        if ($report === null) {
            return $this->json(['error' => 'Report not found.'], Response::HTTP_NOT_FOUND);
        }

        $body = $this->decodeJson($request);
        if ($body instanceof JsonResponse) {
            return $body;
        }

        $action = (string) ($body['action'] ?? '');
        $notes = $body['notes'] ?? null;
        $notes = is_string($notes) ? trim($notes) : null;
        if ($notes === '') {
            $notes = null;
        }

        if (!in_array($action, self::ACTIONS, true)) {
            return $this->json(
                ['error' => 'Invalid action. Allowed: ' . implode(', ', self::ACTIONS)],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        /** @var User $admin */
        $admin = $this->getUser();

        $target = $this->loadTarget($report);

        $applyError = $this->applyAction($action, $report, $target);
        if ($applyError !== null) {
            return $applyError;
        }

        $report->setReviewedBy($admin);
        $report->setReviewedAt(new \DateTimeImmutable());
        if ($notes !== null) {
            $report->setAdminNotes($notes);
        }

        $this->entityManager->flush();

        return $this->json($this->serializeReport($report));
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function applyAction(
        string $action,
        Report $report,
        Concept|Snippet|Payload|null $target,
    ): ?JsonResponse {
        if ($action === 'dismiss') {
            $report->setStatus(Report::STATUS_DISMISSED);
            return null;
        }

        if ($target === null) {
            return $this->json(
                ['error' => 'Target no longer exists; only "dismiss" is available.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        switch ($action) {
            case 'hide':
                $target->setModerationStatus('hidden');
                $report->setStatus(Report::STATUS_ACTIONED);
                return null;

            case 'remove':
                $target->setModerationStatus('removed');
                $report->setStatus(Report::STATUS_ACTIONED);
                return null;

            case 'ban_user':
                $owner = $this->getOwner($target);
                if ($owner === null) {
                    return $this->json(
                        ['error' => 'Target has no owner to ban.'],
                        Response::HTTP_UNPROCESSABLE_ENTITY,
                    );
                }
                $target->setModerationStatus('removed');
                $owner->setDisabled(true);
                $this->logger->warning(
                    'Admin banned user {user} via report {report}. '
                    . 'Disable the Keycloak account manually until admin API is wired.',
                    [
                        'user' => (string) $owner->getId(),
                        'report' => (string) $report->getId(),
                    ],
                );
                // TODO Keycloak admin API call — disable the user account
                // upstream so they can no longer obtain new access tokens.
                $report->setStatus(Report::STATUS_ACTIONED);
                return null;
        }

        return $this->json(['error' => 'Unhandled action.'], Response::HTTP_INTERNAL_SERVER_ERROR);
    }

    private function getOwner(Concept|Snippet|Payload $target): ?User
    {
        if ($target instanceof Snippet) {
            return $target->getConcept()->getOwner();
        }

        return $target->getOwner();
    }

    private function loadTarget(Report $report): Concept|Snippet|Payload|null
    {
        return match ($report->getTargetType()) {
            Report::TARGET_CONCEPT => $this->conceptRepository->find($report->getTargetId()),
            Report::TARGET_SNIPPET => $this->snippetRepository->find($report->getTargetId()),
            Report::TARGET_PAYLOAD => $this->payloadRepository->find($report->getTargetId()),
            default => null,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeReport(Report $report): array
    {
        $reporter = $report->getReporter();
        $reviewer = $report->getReviewedBy();

        return [
            'id' => (string) $report->getId(),
            'target_type' => $report->getTargetType(),
            'target_id' => (string) $report->getTargetId(),
            'reason' => $report->getReason(),
            'details' => $report->getDetails(),
            'status' => $report->getStatus(),
            'created_at' => $report->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'reviewed_at' => $report->getReviewedAt()?->format(\DateTimeInterface::ATOM),
            'admin_notes' => $report->getAdminNotes(),
            'reporter' => $reporter !== null ? [
                'id' => (string) $reporter->getId(),
                'username' => $reporter->getUsername(),
                'email' => $reporter->getEmail(),
            ] : null,
            'reviewed_by' => $reviewer !== null ? [
                'id' => (string) $reviewer->getId(),
                'username' => $reviewer->getUsername(),
            ] : null,
            'target_preview' => $this->buildTargetPreview($report),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildTargetPreview(Report $report): ?array
    {
        $target = $this->loadTarget($report);
        if ($target === null) {
            return null;
        }

        if ($target instanceof Concept) {
            return [
                'kind' => 'concept',
                'title' => $target->getTitle(),
                'description' => $target->getDescription(),
                'visibility' => $target->getVisibility(),
                'moderation_status' => $target->getModerationStatus(),
                'owner_id' => $target->getOwner()->getId() !== null
                    ? (string) $target->getOwner()->getId()
                    : null,
            ];
        }

        if ($target instanceof Snippet) {
            return [
                'kind' => 'snippet',
                'language' => $target->getLanguage(),
                'concept_id' => (string) $target->getConcept()->getId(),
                'concept_title' => $target->getConcept()->getTitle(),
                'visibility' => $target->getConcept()->getVisibility(),
                'moderation_status' => $target->getModerationStatus(),
                'owner_id' => $target->getConcept()->getOwner()->getId() !== null
                    ? (string) $target->getConcept()->getOwner()->getId()
                    : null,
            ];
        }

        // Payload
        return [
            'kind' => 'payload',
            'title' => $target->getTitle(),
            'description' => $target->getDescription(),
            'category' => $target->getCategory(),
            'visibility' => $target->getVisibility(),
            'moderation_status' => $target->getModerationStatus(),
            'owner_id' => $target->getOwner()->getId() !== null
                ? (string) $target->getOwner()->getId()
                : null,
        ];
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
