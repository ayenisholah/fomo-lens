#!/usr/bin/env bash
set -euo pipefail
# Forced SSH command: no shell, forwarding, PTY or general sudo access.
read -r verb sha checksum extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ "$verb" == deploy && "$sha" =~ ^[0-9a-f]{40}$ && "$checksum" =~ ^[0-9a-f]{64}$ && -z "$extra" ]]
exec sudo -n /opt/fomo-lens/ops/install-artifact.sh "$sha" "$checksum"
