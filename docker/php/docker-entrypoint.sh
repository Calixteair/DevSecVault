#!/bin/sh
set -e

# Wait for PostgreSQL via Symfony (uses DATABASE_URL)
until php bin/console dbal:run-sql "SELECT 1" >/dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 1
done

# Run migrations (idempotent)
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

# Load fixtures only in dev (idempotent: removes the demo concept then re-creates it)
if [ "${APP_ENV}" = "dev" ]; then
    php bin/console doctrine:fixtures:load --append --no-interaction
fi

# Rebuild Meilisearch indexes from the DB (idempotent, fast)
# Runs in background because it's not blocking for API serving.
(php bin/console app:meilisearch:reindex >/dev/null 2>&1 &)

exec "$@"
