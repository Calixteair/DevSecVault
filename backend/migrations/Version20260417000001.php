<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 6 — Teams + RBAC.
 *
 * Creates team, team_member, team_invite_link, and the two N:N sharing
 * join tables (concept_team_share, payload_team_share). Also drops the
 * legacy `team_id` placeholder column on concept that was introduced in
 * Phase 2 before the Team entity existed.
 */
final class Version20260417000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create team, team_member, team_invite_link, and team-sharing join tables (Phase 6)';
    }

    public function up(Schema $schema): void
    {
        // team ---------------------------------------------------------------
        $this->addSql('CREATE TABLE team (id UUID NOT NULL, owner_id UUID NOT NULL, name VARCHAR(120) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_team_owner ON team (owner_id)');
        $this->addSql('ALTER TABLE team ADD CONSTRAINT fk_team_owner FOREIGN KEY (owner_id) REFERENCES app_user (id) NOT DEFERRABLE INITIALLY IMMEDIATE');

        // team_member --------------------------------------------------------
        $this->addSql('CREATE TABLE team_member (id UUID NOT NULL, team_id UUID NOT NULL, user_id UUID NOT NULL, role VARCHAR(10) NOT NULL, joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_tm_user ON team_member (user_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_tm_team_user ON team_member (team_id, user_id)');
        $this->addSql('ALTER TABLE team_member ADD CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE team_member ADD CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // team_invite_link ---------------------------------------------------
        $this->addSql('CREATE TABLE team_invite_link (id UUID NOT NULL, team_id UUID NOT NULL, created_by_id UUID NOT NULL, is_active BOOLEAN DEFAULT TRUE NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX idx_til_team ON team_invite_link (team_id)');
        $this->addSql('ALTER TABLE team_invite_link ADD CONSTRAINT fk_til_team FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE team_invite_link ADD CONSTRAINT fk_til_creator FOREIGN KEY (created_by_id) REFERENCES app_user (id) NOT DEFERRABLE INITIALLY IMMEDIATE');

        // concept <-> team sharing (N:N) -------------------------------------
        $this->addSql('CREATE TABLE concept_team_share (concept_id UUID NOT NULL, team_id UUID NOT NULL, PRIMARY KEY (concept_id, team_id))');
        $this->addSql('CREATE INDEX idx_cts_team ON concept_team_share (team_id)');
        $this->addSql('ALTER TABLE concept_team_share ADD CONSTRAINT fk_cts_concept FOREIGN KEY (concept_id) REFERENCES concept (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE concept_team_share ADD CONSTRAINT fk_cts_team FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // payload <-> team sharing (N:N) -------------------------------------
        $this->addSql('CREATE TABLE payload_team_share (payload_id UUID NOT NULL, team_id UUID NOT NULL, PRIMARY KEY (payload_id, team_id))');
        $this->addSql('CREATE INDEX idx_pts_team ON payload_team_share (team_id)');
        $this->addSql('ALTER TABLE payload_team_share ADD CONSTRAINT fk_pts_payload FOREIGN KEY (payload_id) REFERENCES payload (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE payload_team_share ADD CONSTRAINT fk_pts_team FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // Drop the legacy placeholder team_id column on concept (never used).
        // IF EXISTS keeps the migration idempotent across environments where
        // the column may or may not have been created.
        $this->addSql('ALTER TABLE concept DROP COLUMN IF EXISTS team_id');
    }

    public function down(Schema $schema): void
    {
        // Restore the legacy placeholder column first.
        $this->addSql('ALTER TABLE concept ADD team_id UUID DEFAULT NULL');

        $this->addSql('ALTER TABLE payload_team_share DROP CONSTRAINT fk_pts_payload');
        $this->addSql('ALTER TABLE payload_team_share DROP CONSTRAINT fk_pts_team');
        $this->addSql('DROP TABLE payload_team_share');

        $this->addSql('ALTER TABLE concept_team_share DROP CONSTRAINT fk_cts_concept');
        $this->addSql('ALTER TABLE concept_team_share DROP CONSTRAINT fk_cts_team');
        $this->addSql('DROP TABLE concept_team_share');

        $this->addSql('ALTER TABLE team_invite_link DROP CONSTRAINT fk_til_team');
        $this->addSql('ALTER TABLE team_invite_link DROP CONSTRAINT fk_til_creator');
        $this->addSql('DROP TABLE team_invite_link');

        $this->addSql('ALTER TABLE team_member DROP CONSTRAINT fk_tm_team');
        $this->addSql('ALTER TABLE team_member DROP CONSTRAINT fk_tm_user');
        $this->addSql('DROP TABLE team_member');

        $this->addSql('ALTER TABLE team DROP CONSTRAINT fk_team_owner');
        $this->addSql('DROP TABLE team');
    }
}
