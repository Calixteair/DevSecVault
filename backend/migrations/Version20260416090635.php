<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260416090635 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create payload and payload_tag tables for Cyber Toolbox';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE payload (id UUID NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, category VARCHAR(50) NOT NULL, language VARCHAR(50) DEFAULT NULL, visibility VARCHAR(20) NOT NULL, body_encrypted TEXT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_422C6A157E3C61F9 ON payload (owner_id)');
        $this->addSql('CREATE TABLE payload_tag (payload_id UUID NOT NULL, tag_id UUID NOT NULL, PRIMARY KEY (payload_id, tag_id))');
        $this->addSql('CREATE INDEX IDX_CD860C30D1664B27 ON payload_tag (payload_id)');
        $this->addSql('CREATE INDEX IDX_CD860C30BAD26311 ON payload_tag (tag_id)');
        $this->addSql('ALTER TABLE payload ADD CONSTRAINT FK_422C6A157E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE payload_tag ADD CONSTRAINT FK_CD860C30D1664B27 FOREIGN KEY (payload_id) REFERENCES payload (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE payload_tag ADD CONSTRAINT FK_CD860C30BAD26311 FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE payload DROP CONSTRAINT FK_422C6A157E3C61F9');
        $this->addSql('ALTER TABLE payload_tag DROP CONSTRAINT FK_CD860C30D1664B27');
        $this->addSql('ALTER TABLE payload_tag DROP CONSTRAINT FK_CD860C30BAD26311');
        $this->addSql('DROP TABLE payload');
        $this->addSql('DROP TABLE payload_tag');
    }
}
