#!/usr/bin/env bash
set -euo pipefail
umask 077
sha=${1:?}; checksum=${2:?}
[[ "$sha" =~ ^[0-9a-f]{40}$ && "$checksum" =~ ^[0-9a-f]{64}$ && $# == 2 ]]
root=/opt/fomo-lens
[[ -f /etc/fomo-lens/launch-ready ]] || { echo "Operational launch gates are incomplete"; exit 1; }
source "$root/ops/release-health.sh"
exec 9>"$root/deploy.lock"
flock -w 900 9
python3 "$root/ops/deduplicate-releases.py" "$root"
[[ $(node -p 'process.versions.node.split(".")[0]') == 24 ]]
free_kb=$(df --output=avail "$root" | tail -1)
(( free_kb >= 2621440 )) || { echo 'Insufficient disk for release and 1.5 GB reserve'; exit 1; }
archive=$(mktemp "$root/incoming.XXXXXXXX")
trap 'rm -f "$archive"' EXIT
# Bound upload to 1 GiB; a truncated/oversize stream cannot pass its checksum.
head -c 1073741824 > "$archive"
printf '%s  %s\n' "$checksum" "$archive" | sha256sum -c -
release="$root/releases/$sha"
if [[ -d "$release" ]]; then
  [[ $(cat "$release/ARTIFACT_SHA256") == "$checksum" ]] || exit 1
else
  stage=$(mktemp -d "$root/releases/.incoming.XXXXXXXX")
  python3 - "$archive" "$stage" <<'PY'
import sys,tarfile,shutil
with tarfile.open(sys.argv[1]) as archive:
    size = sum(member.size for member in archive.getmembers())
    if size + 1572864 * 1024 > shutil.disk_usage(sys.argv[2]).free:
        raise SystemExit('Archive exceeds disk reserve')
    archive.extractall(sys.argv[2], filter='data')
PY
  printf '%s\n' "$sha" > "$stage/REVISION"
  printf '%s\n' "$checksum" > "$stage/ARTIFACT_SHA256"
  chmod -R a+rX "$stage"
  mv "$stage" "$release"
fi
rm -f "$archive"
trap - EXIT
python3 "$root/ops/deduplicate-releases.py" "$root"
# Check the actual protected values against the tested build before activation.
(cd "$release" && SECRET_SCAN_ENV_FILE=/etc/fomo-lens/app.env node scripts/scan-secrets.mjs --build)
mkdir -p "$release/.next/standalone/.next/cache"
chown -R fomo-lens:fomo-lens "$release/.next/standalone/.next/cache"
free_kb=$(df --output=avail "$root" | tail -1)
(( free_kb >= 1572864 )) || { echo 'Disk reserve would be violated'; exit 1; }
"$root/ops/backup.sh"
set -a
source /etc/fomo-lens/app.env
set +a
(cd "$release" && npm run db:migrate)
old=$(readlink -f "$root/current" || true)
if [[ -z "$old" || ! -d "$old" ]]; then
  port=3001
  while ss -H -ltn "sport = :$port" | grep -q .; do
    ((port += 1))
    ((port <= 3999)) || { echo 'No free application port'; exit 1; }
  done
  mkdir -p /etc/systemd/system/fomo-lens.service.d
  printf '[Service]\nEnvironment=PORT=%s\n' "$port" > /etc/systemd/system/fomo-lens.service.d/port.conf
  printf 'FOMO_LOCAL_HEALTH_URL=http://127.0.0.1:%s/api/health/ready\n' "$port" > /etc/fomo-lens/deploy.env
  sed -i -E "s@proxy_pass http://127.0.0.1:[0-9]+;@proxy_pass http://127.0.0.1:$port;@" /etc/nginx/conf.d/fomo-lens.conf
  nginx -t
  systemctl reload nginx
  systemctl daemon-reload
  source /etc/fomo-lens/deploy.env
fi
arm_release_recovery "$old"
switch_release "$release"
systemctl restart fomo-lens
ready
public_ready
if [[ -n "$old" && "$old" != "$release" && -d "$old" ]]; then ln -sfn "$old" "$root/previous"; fi
recovery_armed=0
printf 'Verified release %s\n' "$sha"
