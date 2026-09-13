#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
file="${1:?Usage: bash ops/restore-test.sh backups/file.dump}"
name="atlas_restore_$(date -u +%Y%m%d%H%M%S)"
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$name"
trap 'docker compose exec -T db sh -c '\''dropdb -U "$POSTGRES_USER" "$1"'\'' sh "$name"' EXIT
docker compose exec -T db sh -c 'pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d "$1"' sh "$name" < "$file"
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c "SELECT count(*) FROM users; SELECT count(*) FROM _prisma_migrations;"' sh "$name"
echo "Isolated restore passed; production was not modified."
