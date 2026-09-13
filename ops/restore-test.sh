#!/usr/bin/env bash
set -euo pipefail
umask 077
folder=${1:?Usage: restore-test.sh backup-directory}
: "${RESTORE_ADMIN_URL:?}" "${AGE_IDENTITY:?}" "${RESTORE_EXPECT_SQL:?Set a SQL fixture assertion file}"
name="fomo_lens_restore_$(date -u +%Y%m%d%H%M%S)_$RANDOM"
work=$(mktemp -d)
# Admin URL must address an isolated PostgreSQL instance, never a production DB.
created=0
cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$created" == 1 ]] && ! dropdb --maintenance-db="$RESTORE_ADMIN_URL" "$name"; then
    echo 'Restore cleanup failed; isolated database requires operator cleanup' >&2
    status=1
  fi
  rm -rf -- "$work" || status=1
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
createdb --maintenance-db="$RESTORE_ADMIN_URL" "$name"
created=1
url="${RESTORE_ADMIN_URL%/*}/$name"
age -d -i "$AGE_IDENTITY" "$folder/database.dump.age" | pg_restore --exit-on-error --no-owner --no-acl --dbname="$url"
# Redirection also creates the plaintext file for a valid empty ledger.
age -d -i "$AGE_IDENTITY" "$folder/deletions.jsonl.age" > "$work/deletions.jsonl"
# Replay both the saved ledger and all deletions requested since the dump.
node "$(dirname "$0")/replay-deletions.mjs" "$work/deletions.jsonl" "${CURRENT_DELETION_LEDGER:-/etc/fomo-lens/deletions.jsonl}" > "$work/replay.sql"
psql "$url" -v ON_ERROR_STOP=1 -f "$work/replay.sql"
psql "$url" -v ON_ERROR_STOP=1 -f "$RESTORE_EXPECT_SQL"
echo 'Isolated restore, deletion replay and fixture assertions passed.'
