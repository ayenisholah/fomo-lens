#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>.deploy.lock
flock -n 9 || { echo "Deployment already in progress" >&2; exit 1; }
release="${1:?Usage: bash ops/deploy.sh FULL_COMMIT_SHA}"
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || { echo "Use an exact 40-character commit" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Checkout must be clean" >&2; exit 1; }
git fetch origin
git cat-file -e "$release^{commit}"
previous=$(cat .release 2>/dev/null || true)
git checkout --detach "$release"
export RELEASE="$release"
docker build --target runner -t "lens-atlas:$release" .
docker build --target operations -t "lens-atlas-ops:$release" .
docker compose up -d db
if [ -n "$previous" ]; then
 docker image inspect "lens-atlas:$previous" --format '{{.Id}}' > .previous-image
 bash ops/backup.sh
fi
docker compose --profile ops run --rm ops
docker compose up -d app caddy
healthy=false
for attempt in $(seq 1 18); do
 if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then healthy=true; break; fi
 sleep 5
done
if [ "$healthy" = true ] && curl --fail --silent --show-error "https://${DOMAIN:?Export DOMAIN}/api/health/ready"; then
 printf '%s\n' "$previous" > .previous-release
 printf '%s\n' "$release" > .release
 echo "Release is ready: $release"
else
 echo "Health check failed. Additive migrations remain applied." >&2
 if [ -n "$previous" ]; then RELEASE="$previous" docker compose up -d app; fi
 exit 1
fi
