<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260416181148 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create vault_entry and secret_link tables for Secure Bridge (Phase 5)';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE secret_link (id UUID NOT NULL, ciphertext TEXT NOT NULL, require_confirmation BOOLEAN DEFAULT true NOT NULL, require_auth BOOLEAN DEFAULT false NOT NULL, consumed BOOLEAN DEFAULT false NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_548453C47E3C61F9 ON secret_link (owner_id)');
        $this->addSql('CREATE TABLE vault_entry (id UUID NOT NULL, ciphertext TEXT NOT NULL, salt TEXT NOT NULL, failed_attempts SMALLINT DEFAULT 0 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_vault_owner ON vault_entry (owner_id)');
        $this->addSql('ALTER TABLE secret_link ADD CONSTRAINT FK_548453C47E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE vault_entry ADD CONSTRAINT FK_76B9510B7E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE secret_link DROP CONSTRAINT FK_548453C47E3C61F9');
        $this->addSql('ALTER TABLE vault_entry DROP CONSTRAINT FK_76B9510B7E3C61F9');
        $this->addSql('DROP TABLE secret_link');
        $this->addSql('DROP TABLE vault_entry');
    }
}
