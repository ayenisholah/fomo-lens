# Operations draft — review before execution

No Docker commands have been run. The user explicitly requested that Docker not be installed locally. Use the provided server for Docker setup and rehearsal.

## Environment

Run `npm run setup` locally to create an ignored mode-0600 .env without overwriting an existing file. Configure APP_URL, DATABASE_URL, three independent secrets (AUTH_SECRET, IP_HASH_SECRET, CURSOR_SECRET), Resend sender/key, and ADMIN_EMAILS. Example is the default data mode.

Production requires HTTPS APP_URL, TRUST_PROXY=true, real Resend delivery, no test capture, and protected application/database networking. Stored mode additionally requires FOMOLENS_KEY and per-user owner approval; the integration gate is currently closed.

Use a protected server .env outside source control and build context. Compose DATABASE_URL must use host `db` and match POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB; URL-encode any password punctuation. DOMAIN is a bare DNS hostname.

Caddy overwrites X-Atlas-Client-IP. Never expose the application or PostgreSQL directly to the internet. Do not put another proxy in front without revisiting IP trust. Caddy is the only service with published ports.

## Server setup still required

Inspect OS, architecture, memory/disk, existing services, and firewall first. Verify SSH host keys. Prefer a supported Ubuntu LTS for a new server. Install official supported Docker Engine and Compose there, create a dedicated deployment account, and allow SSH/HTTP/HTTPS only as appropriate.

Clone the dedicated public repository into /opt/lens-atlas. Protect runtime .env and ops.env. Configure DNS and a verified Resend sender. Configure encrypted off-server backups and a deletion contact/retention policy before launch.

## Deployment drafts

- `ops/deploy.sh FULL_SHA`: deployment lock, exact commit checkout, local image build, backup of an existing deployment, migration, recreate, readiness/HTTPS checks, application fallback.
- `ops/rollback.sh [FULL_SHA]`: select retained previous image; never reverse database migrations.
- `ops/backup.sh`: custom-format dump with timestamp; calls BACKUP_UPLOAD_HOOK and retains seven daily local copies after a successful upload.
- `ops/restore-test.sh backup.dump`: restore into a new disposable database, inspect schema, drop the disposable database.
- systemd service/timer files: daily backup and retention cleanup.

Export DOMAIN and RELEASE as needed by Compose; use `RELEASE=$(cat .release)` for routine operations. The scripts are drafts. Before use, fix the outstanding deployment issues listed in HANDOFF.md, verify script syntax, and rehearse on an isolated server database.

BACKUP_UPLOAD_HOOK must be an operator-owned executable taking a dump path and encrypting/uploading it to an off-server destination. If absent, backup exits nonzero after writing a local dump. Local backups alone do not meet production requirements.

Backwards-compatible additive migrations only. A single app container may cause a brief interruption. Keep previous images until verification completes; do not reset or automatically restore production data.

## Privacy maintenance

`npm run maintenance` purges expired auth/session/rate data and 90-day events/operations, preserving minimal unresolved accounting. `npm run account:delete -- email --confirm` removes a user and owned records after checking active operations.

Review the race between deletion and verification before enabling account deletion in production. Maintain a protected deletion ledger outside this source tree and reapply it after any backup restore. Document off-server backup retention and deletion handling before launch.

## Release acceptance

Run complete format/lint/type/unit/PostgreSQL/browser/build/secret checks, then test migrations from empty PostgreSQL, non-root container execution, DB outage readiness, isolated backup restore, failed-release rollback, real email, HTTPS, and off-server backups.

Current state: no deployment, no container rehearsal, no real email test, no credentialed Fomolens verification.
