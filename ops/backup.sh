#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="backups/atlas-$stamp.dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$file.partial"
mv "$file.partial" "$file"
# Mandatory in production: executable encrypt-and-upload hook supplied by the operator.
if [ -n "${BACKUP_UPLOAD_HOOK:-}" ]; then
 "$BACKUP_UPLOAD_HOOK" "$file"
else
 echo "Off-server encrypted backup hook missing; local backup created but backup policy is NOT satisfied." >&2
 exit 2
fi
find backups -type f -name 'atlas-*.dump' -mtime +6 -delete
