<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Lot 4 — Moderation: Report entity + moderation_status on Concept/Snippet/Payload
 * + disabled flag on app_user (soft local ban, paired with manual Keycloak disable
 * until a proper Keycloak admin API integration lands).
 */
final class Version20260502000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Lot 4 — moderation: report table, moderation_status columns, user.disabled';
    }

    public function up(Schema $schema): void
    {
        // report table -------------------------------------------------------
        $this->addSql(
            'CREATE TABLE report ('
            . 'id UUID NOT NULL, '
            . 'reporter_id UUID DEFAULT NULL, '
            . 'reviewed_by_id UUID DEFAULT NULL, '
            . 'target_type VARCHAR(20) NOT NULL, '
            . 'target_id UUID NOT NULL, '
            . 'reporter_ip_hash VARCHAR(64) NOT NULL, '
            . 'reason VARCHAR(30) NOT NULL, '
            . 'details TEXT DEFAULT NULL, '
            . 'status VARCHAR(20) DEFAULT \'pending\' NOT NULL, '
            . 'created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, '
            . 'reviewed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, '
            . 'admin_notes TEXT DEFAULT NULL, '
            . 'PRIMARY KEY (id))'
        );
        $this->addSql('CREATE INDEX idx_report_status ON report (status)');
        $this->addSql('CREATE INDEX idx_report_target ON report (target_type, target_id)');
        $this->addSql('CREATE INDEX idx_report_reporter ON report (reporter_id)');
        $this->addSql('CREATE INDEX idx_report_reviewer ON report (reviewed_by_id)');
        $this->addSql(
            'ALTER TABLE report ADD CONSTRAINT fk_report_reporter '
            . 'FOREIGN KEY (reporter_id) REFERENCES app_user (id) '
            . 'ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE'
        );
        $this->addSql(
            'ALTER TABLE report ADD CONSTRAINT fk_report_reviewer '
            . 'FOREIGN KEY (reviewed_by_id) REFERENCES app_user (id) '
            . 'ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE'
        );

        // moderation_status on existing tables -------------------------------
        $this->addSql("ALTER TABLE concept ADD moderation_status VARCHAR(20) DEFAULT 'active' NOT NULL");
        $this->addSql("ALTER TABLE snippet ADD moderation_status VARCHAR(20) DEFAULT 'active' NOT NULL");
        $this->addSql("ALTER TABLE payload ADD moderation_status VARCHAR(20) DEFAULT 'active' NOT NULL");

        // app_user.disabled --------------------------------------------------
        $this->addSql('ALTER TABLE app_user ADD disabled BOOLEAN DEFAULT FALSE NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE app_user DROP COLUMN disabled');

        $this->addSql('ALTER TABLE payload DROP COLUMN moderation_status');
        $this->addSql('ALTER TABLE snippet DROP COLUMN moderation_status');
        $this->addSql('ALTER TABLE concept DROP COLUMN moderation_status');

        $this->addSql('ALTER TABLE report DROP CONSTRAINT fk_report_reviewer');
        $this->addSql('ALTER TABLE report DROP CONSTRAINT fk_report_reporter');
        $this->addSql('DROP TABLE report');
    }
}
