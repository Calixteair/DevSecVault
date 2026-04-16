<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260416024003 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create concept, concept_tag, and snippet tables for Dev Library';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE concept (id UUID NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, visibility VARCHAR(20) NOT NULL, team_id UUID DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, owner_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_E74A60507E3C61F9 ON concept (owner_id)');
        $this->addSql('CREATE TABLE concept_tag (concept_id UUID NOT NULL, tag_id UUID NOT NULL, PRIMARY KEY (concept_id, tag_id))');
        $this->addSql('CREATE INDEX IDX_F9C0BAAFF909284E ON concept_tag (concept_id)');
        $this->addSql('CREATE INDEX IDX_F9C0BAAFBAD26311 ON concept_tag (tag_id)');
        $this->addSql('CREATE TABLE snippet (id UUID NOT NULL, language VARCHAR(50) NOT NULL, code TEXT NOT NULL, sort_order INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, concept_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_961C8CD5F909284E ON snippet (concept_id)');
        $this->addSql('ALTER TABLE concept ADD CONSTRAINT FK_E74A60507E3C61F9 FOREIGN KEY (owner_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE concept_tag ADD CONSTRAINT FK_F9C0BAAFF909284E FOREIGN KEY (concept_id) REFERENCES concept (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE concept_tag ADD CONSTRAINT FK_F9C0BAAFBAD26311 FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE snippet ADD CONSTRAINT FK_961C8CD5F909284E FOREIGN KEY (concept_id) REFERENCES concept (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE app_user ALTER role DROP DEFAULT');
        $this->addSql('COMMENT ON COLUMN app_user.id IS \'\'');
        $this->addSql('COMMENT ON COLUMN app_user.created_at IS \'\'');
        $this->addSql('COMMENT ON COLUMN app_user.updated_at IS \'\'');
        $this->addSql('ALTER TABLE tag ALTER is_official DROP DEFAULT');
        $this->addSql('COMMENT ON COLUMN tag.id IS \'\'');
        $this->addSql('COMMENT ON COLUMN tag.created_at IS \'\'');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE concept DROP CONSTRAINT FK_E74A60507E3C61F9');
        $this->addSql('ALTER TABLE concept_tag DROP CONSTRAINT FK_F9C0BAAFF909284E');
        $this->addSql('ALTER TABLE concept_tag DROP CONSTRAINT FK_F9C0BAAFBAD26311');
        $this->addSql('ALTER TABLE snippet DROP CONSTRAINT FK_961C8CD5F909284E');
        $this->addSql('DROP TABLE concept');
        $this->addSql('DROP TABLE concept_tag');
        $this->addSql('DROP TABLE snippet');
        $this->addSql('ALTER TABLE app_user ALTER role SET DEFAULT \'ROLE_USER\'');
        $this->addSql('COMMENT ON COLUMN app_user.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN app_user.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('COMMENT ON COLUMN app_user.updated_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE tag ALTER is_official SET DEFAULT false');
        $this->addSql('COMMENT ON COLUMN tag.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN tag.created_at IS \'(DC2Type:datetime_immutable)\'');
    }
}
