#!/usr/bin/env bash
set -euo pipefail
root=${FOMO_ROOT:-/opt/fomo-lens}
source "$root/ops/release-health.sh"
exec 9>"$root/deploy.lock"
flock -n 9
previous=$(readlink -f "$root/previous")
current=$(readlink -f "$root/current")
[[ "$previous" == "$root/releases/"* && -d "$previous" ]]
arm_release_recovery "$current"
switch_release "$previous"
systemctl restart "${FOMO_SERVICE:-fomo-lens}"
ready
public_ready
ln -sfn "$current" "$root/previous"
recovery_armed=0
