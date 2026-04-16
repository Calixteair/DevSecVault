<?php

declare(strict_types=1);

namespace App\Command;

use App\Search\SnippetIndexer;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Rebuild every Meilisearch index from scratch.
 * Safe to run at boot or after a schema change — the indexer clears the
 * target index before re-pushing the full dataset from PostgreSQL.
 */
#[AsCommand(
    name: 'app:meilisearch:reindex',
    description: 'Rebuild Meilisearch indexes from the database (clears then repopulates).'
)]
class MeilisearchReindexCommand extends Command
{
    public function __construct(
        private readonly SnippetIndexer $snippetIndexer,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Meilisearch reindex');

        $io->section('snippets');
        $count = $this->snippetIndexer->reindexAll();
        $io->success(sprintf('Reindexed %d snippet document(s).', $count));

        return Command::SUCCESS;
    }
}
