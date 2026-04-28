<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Phase 8 — Personal Access Tokens (api_token).
 *
 * Allows users to authenticate non-browser clients (CLI, scripts) without
 * Keycloak. Stores SHA-256 hash + visible 8-char prefix, expiry, last-used
 * timestamp, and an `include_admin` opt-in flag (only honored if the user
 * actually has ROLE_ADMIN in Keycloak — checked at request time).
 */
final class Version20260428000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create api_token table for Personal Access Tokens';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE api_token (id UUID NOT NULL, user_id UUID NOT NULL, name VARCHAR(100) NOT NULL, token_hash VARCHAR(64) NOT NULL, prefix VARCHAR(16) NOT NULL, include_admin BOOLEAN DEFAULT FALSE NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, last_used_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_api_token_hash ON api_token (token_hash)');
        $this->addSql('CREATE INDEX idx_api_token_user ON api_token (user_id)');
        $this->addSql('ALTER TABLE api_token ADD CONSTRAINT fk_api_token_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE api_token DROP CONSTRAINT fk_api_token_user');
        $this->addSql('DROP TABLE api_token');
    }
}
