#!/usr/bin/env bash
# Sourced by deployment and rollback.
ready() {
  local attempt
  for attempt in {1..20}; do
    if curl --max-time 5 -fsS "${FOMO_LOCAL_HEALTH_URL:-http://127.0.0.1:3001/api/health/ready}" >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}
public_ready() {
  curl --max-time 15 -fsS "${FOMO_PUBLIC_HEALTH_URL:-https://fomo-lens.sholaayeni.xyz/api/health/ready}" >/dev/null
}
switch_release() {
  ln -sfn "$1" "$root/current.next" && mv -Tf "$root/current.next" "$root/current"
}
restore_release() {
  if [[ -n "$1" && "$1" == "$root/releases/"* && -d "$1" ]]; then
    if switch_release "$1" && systemctl restart "${FOMO_SERVICE:-fomo-lens}" && ready && public_ready; then
      echo 'Prior release restored and verified'
      return 0
    fi
  fi
  if systemctl stop "${FOMO_SERVICE:-fomo-lens}" && ! systemctl is-active --quiet "${FOMO_SERVICE:-fomo-lens}"; then
    echo 'Recovery could not verify a serving release; service stopped' >&2
  else
    echo 'CRITICAL: recovery failed and service stop could not be verified' >&2
  fi
  return 1
}

# Arm before switching. EXIT also covers INT/TERM; SIGKILL/power loss requires rehearsal.
arm_release_recovery() {
  recovery_target=$1
  recovery_armed=1
  trap 'exit 130' INT
  trap 'exit 143' TERM
  trap 'release_exit $?' EXIT
}
release_exit() {
  local status=$1
  trap - EXIT INT TERM
  if [[ "${recovery_armed:-0}" == 1 ]]; then
    restore_release "$recovery_target" || true
    (( status != 0 )) || status=1
  fi
  exit "$status"
}
