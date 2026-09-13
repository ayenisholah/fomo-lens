#!/usr/bin/env bash
set -euo pipefail
umask 077
# Root runs this after native prerequisites, app.env, backup.env and the service are installed.
sha=${1:?Usage: deploy.sh FULL_SHA}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
root=${FOMO_ROOT:-/opt/fomo-lens}
source "$root/ops/release-health.sh"
exec 9>"$root/deploy.lock"
flock -n 9
free_kb=$(df --output=avail "$root" | tail -1)
(( free_kb >= 2621440 )) || { echo 'Insufficient disk for build and 1.5 GB reserve'; exit 1; }
[[ $(node -p 'process.versions.node.split(".")[0]') == 24 ]]
release="$root/releases/$sha"
[[ ! -e "$release" ]]
mkdir -p "$release"
git -C "$root/repository" archive "$sha" | tar -x -C "$release"
chown -R "${FOMO_USER:-fomo-lens}:${FOMO_GROUP:-fomo-lens}" "$release"
# Builds never receive runtime credentials.
runuser -u "${FOMO_USER:-fomo-lens}" -- sh -c 'cd "$1" && env -i PATH="$PATH" HOME="$HOME" npm ci && env -i PATH="$PATH" HOME="$HOME" npm run build && npm run scan:secrets -- --archive && npm run scan:build' sh "$release"
# Only scanner processes receive the protected configuration path. Builds above
# have neither runtime credentials nor access to the root-owned configuration.
(cd "$release" && env -i PATH="$PATH" SECRET_SCAN_ENV_FILE="${FOMO_APP_ENV:-/etc/fomo-lens/app.env}" node scripts/scan-secrets.mjs --archive && env -i PATH="$PATH" SECRET_SCAN_ENV_FILE="${FOMO_APP_ENV:-/etc/fomo-lens/app.env}" node scripts/scan-secrets.mjs --build)
mkdir -p "$release/.next/standalone/.next/cache"
cp -a "$release/.next/static" "$release/.next/standalone/.next/"
cp -a "$release/public" "$release/.next/standalone/"
chown -R "${FOMO_USER:-fomo-lens}:${FOMO_GROUP:-fomo-lens}" "$release/.next/standalone/.next/cache"
free_kb=$(df --output=avail "$root" | tail -1)
(( free_kb >= 1572864 )) || { echo 'Deployment would violate disk reserve'; exit 1; }
"$root/ops/backup.sh"
# app.env uses shell-compatible quoted values and is readable only by root/service group.
set -a
source "${FOMO_APP_ENV:-/etc/fomo-lens/app.env}"
set +a
(cd "$release" && npm run db:migrate)
old=$(readlink -f "$root/current" || true)
if [[ -z "$old" || ! -d "$old" ]]; then
  ! ss -H -ltn "sport = :${FOMO_PORT:-3001}" | grep -q . || { echo "Port ${FOMO_PORT:-3001} occupied"; exit 1; }
fi
# Arm before the first mutation so signal/error exits restore the prior code release.
arm_release_recovery "$old"
switch_release "$release"
systemctl restart "${FOMO_SERVICE:-fomo-lens}"
ready
public_ready
if [[ -n "$old" && -d "$old" ]]; then ln -sfn "$old" "$root/previous"; fi
recovery_armed=0
printf 'Verified release %s\n' "$sha"
