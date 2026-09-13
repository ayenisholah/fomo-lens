#!/usr/bin/env bash
set -euo pipefail
sha=${1:?Full tested commit SHA required}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
[[ $(git rev-parse HEAD) == "$sha" ]]
mkdir -p /tmp/fomo-artifact
printf '%s\n' "$sha" > /tmp/fomo-artifact/REVISION
cp -a public .next/standalone/
cp -a .next/static .next/standalone/.next/
# Explicit allowlist excludes runtime configuration, browser sessions and test mail.
tar --exclude='.next/cache' --exclude='node_modules/.cache' -czf /tmp/fomo-artifact/release.tar.gz \
  .next node_modules src scripts prisma prisma.config.ts package.json package-lock.json tsconfig.json ops public
(cd /tmp/fomo-artifact && sha256sum release.tar.gz > release.sha256)
