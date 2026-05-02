<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Report;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

final class ReportNotifier
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly LoggerInterface $logger,
        private readonly string $fromAddress,
        private readonly string $toAddress,
        private readonly string $adminBaseUrl,
    ) {
    }

    public function notifyNewReport(Report $report): void
    {
        if ($this->toAddress === '') {
            return;
        }

        $targetType = $report->getTargetType();
        $targetId = (string) $report->getTargetId();
        $reason = $report->getReason();
        $details = $report->getDetails();
        $createdAt = $report->getCreatedAt()?->format('Y-m-d H:i:s T') ?? 'unknown';
        $reportId = (string) $report->getId();
        $adminUrl = rtrim($this->adminBaseUrl, '/').'/admin/reports';

        $subject = sprintf('[DevSecVault] New report: %s / %s', $targetType, $reason);

        $body = sprintf(
            "A new report has been submitted.\n\n".
            "Report ID: %s\n".
            "Target:    %s %s\n".
            "Reason:    %s\n".
            "Created:   %s\n".
            "Details:\n%s\n\n".
            "Admin: %s\n",
            $reportId,
            $targetType,
            $targetId,
            $reason,
            $createdAt,
            $details ?? '(none)',
            $adminUrl,
        );

        $email = (new Email())
            ->from($this->fromAddress)
            ->to($this->toAddress)
            ->subject($subject)
            ->text($body);

        try {
            $this->mailer->send($email);
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Failed to send report notification email', [
                'report_id' => $reportId,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
