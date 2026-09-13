#!/usr/bin/env bash
set -euo pipefail
umask 077
source "${BACKUP_CONFIG:-/etc/fomo-lens/backup.env}"
: "${BACKUP_DATABASE_URL:?}" "${AGE_RECIPIENT:?}"
folder=${BACKUP_DIRECTORY:-/var/backups/fomo-lens}
mkdir -p "$folder"
exec 9>"$folder/backup.lock"
flock -n 9
# A private staging directory keeps incomplete pairs out of the backup inventory.
work=$(mktemp -d "$folder/.partial.XXXXXXXX")
trap 'rm -rf -- "$work"' EXIT
name="fomo-lens-$(date -u +%Y%m%dT%H%M%S)-${work##*.partial.}"
pg_dump "$BACKUP_DATABASE_URL" --format=custom --no-owner --no-acl | age -r "$AGE_RECIPIENT" -o "$work/database.dump.age"
age -r "$AGE_RECIPIENT" -o "$work/deletions.jsonl.age" "${DELETION_LEDGER:-/etc/fomo-lens/deletions.jsonl}"
sync "$work/database.dump.age" "$work/deletions.jsonl.age"
mv "$work" "$folder/$name"
# Expire only complete application backup directories, after a successful backup.
find "$folder" -mindepth 1 -maxdepth 1 -type d -name 'fomo-lens-*' -mmin +10080 -exec rm -rf -- {} +
printf 'Encrypted backup: %s\n' "$folder/$name"
