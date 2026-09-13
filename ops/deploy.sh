#!/usr/bin/env bash
set -euo pipefail
# Operator entry point: stream the exact artifact from a successful main CI run.
sha=${1:?Usage: deploy.sh FULL_SHA SHA256 < release.tar.gz}
checksum=${2:?SHA256 checksum required}
exec /opt/fomo-lens/ops/install-artifact.sh "$sha" "$checksum"
