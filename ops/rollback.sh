#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>.deploy.lock
flock -n 9 || exit 1
release="${1:-$(cat .previous-release)}"
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || exit 1
docker image inspect "lens-atlas:$release" >/dev/null
RELEASE="$release" docker compose up -d app
printf '%s\n' "$release" > .release
echo "Previous application image selected. Verify HTTPS/readiness. Database migrations were not reversed."
