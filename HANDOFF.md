# Fomo Lens handoff

The user approved free access and public stored-mode deployment with the current provider key. Historical billing launch restrictions are superseded. Do not run more paid acceptance automatically or modify the private ledger/locks. Preserve all signing secrets, sessions, accounting history and unrelated services.

Engineering CI passed for `4cc17dca10b99304646a4dc290f0f7177d413fc9`: [run 34783473322](https://github.com/ayenisholah/fomo-lens/actions/runs/34783473322). Deployment and public acceptance results are recorded in [release verification](docs/release-verification.md).

Production uses `/opt/fomo-lens/releases`, atomic `current`/`previous` links, `/etc/fomo-lens/app.env`, systemd and a dedicated Nginx certificate. The deploy SSH account has a forced command and only the artifact installer in sudoers. CI receives no production API keys. See [operations](docs/operations.md) for deployment, rollback, backups and key rotation.

The free-access change adds no migrations or dependency-range upgrades. Both existing reviewed migrations remain required. Owner allowance response limits are null; stale SERVICE_DAILY environment entries cannot restore caps.

The off-server encrypted copy restored successfully, but continuous off-server backup replication is still a follow-up; current automated backups are local. Live following/followers and successful reverse-wallet acceptance remain documented limitations. Earlier checkpoints are retained in [historical handoff](docs/evidence/pre-free-handoff.md) and [historical release notes](docs/evidence/pre-free-release-verification.md).
