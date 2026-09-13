> Approved free-access plan (2026-09-13): no application request/credit caps. Current-key public launch is authorized after engineering checks. Historical billing restrictions below are superseded; preserve the private ledger and acceptance ceiling, and do not run paid acceptance automatically.

> Current checkpoint (2026-09-13): implementation complete; release verification blocked. The permitted unit suite passes 91 tests across 9 files. See [../HANDOFF.md](../HANDOFF.md) for constraints and durable evidence. Operational and other verification commands below remain future reference only.

# Native production operations

Deployment is gated on passing local and production acceptance, verified email, encrypted local backup and restore, and a maximum of 120 pre-launch credits. No public deployment has been verified yet.

Use the existing Node 24, PostgreSQL 16, Nginx and Certbot. Do not change other applications, PostgreSQL listeners or networking. Inspect disk and existing Nginx IP-specific listeners first. Stop if less than 1.5 GB would remain. Clean only obsolete Fomo Lens releases/build artifacts; retain current and previous releases.

## Provision once

Create an unprivileged system user/group `fomo-lens`, `/opt/fomo-lens/{repository,releases,ops}`, `/etc/fomo-lens`, `/var/backups/fomo-lens`, and `/var/www/fomo-lens-acme`. Clone the repository into `repository`. Install the reviewed ops scripts into `ops` as root-owned executable files. Verify `/usr/bin/node` is Node 24 (adjust service paths if the server uses a different system installation).

Create a dedicated PostgreSQL role `fomo_lens` with LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE and a generated password, and a dedicated `fomo_lens` database owned by that role. Revoke PUBLIC database/schema privileges within that database only. Connect over loopback. Never reuse the other application's database or role.

Generate separate random AUTH_SECRET, IP_HASH_SECRET, CURSOR_SECRET and database password. Store shell-compatible quoted settings in `/etc/fomo-lens/app.env`, root:fomo-lens mode 0640. Set APP_URL=https://fomo-lens.sholaayeni.xyz, TRUST_PROXY=true, FOMOLENS_MODE=stored, ADMIN_EMAILS=ayenisholah@yahoo.com, RESEND_FROM='Fomo Lens <noreply@sholaayeni.xyz>', no daily usage quotas and SERVICE_CONCURRENCY=1. Supply the server-held Fomolens and Resend keys. Secrets never enter release directories or builds.

Install `ops/fomo-lens.service`. Immediately before initial activation check `ss -ltn 'sport = :3001'`; bind only 127.0.0.1:3001. Do not open a public application port.

## HTTPS

Create a separate HTTP-only Nginx server block matching existing IP-specific listeners for this domain, serving the ACME webroot. Validate `nginx -t`, reload, then issue a dedicated certificate using `certbot certonly --webroot -w /var/www/fomo-lens-acme -d fomo-lens.sholaayeni.xyz --email ayenisholah@yahoo.com --agree-tos`. Install `ops/nginx.conf.template` after substituting the verified server IP. Validate and reload. Run a certificate renewal dry run and check the renewal timer. Verify the existing hosted application's HTTPS health after every reload.

## Backups and deletion

Install `age`. Generate `/etc/fomo-lens/backup-identity.txt` with `age-keygen`, root-only mode 0600. Retain a protected off-server copy of this identity in an owner-controlled password manager or encrypted storage; without it the backups cannot be decrypted. Never put the identity into Git or releases. `/etc/fomo-lens/backup.env` is root-only and contains shell-quoted BACKUP_DATABASE_URL and AGE_RECIPIENT (the public recipient from the identity).

Backups are encrypted locally under `/var/backups/fomo-lens`, retained for seven days. They do not survive VPS or disk loss. No S3 service or off-server backup transfer is configured. Each backup has a unique UTC timestamp and random suffix, so multiple pre-migration backups on one day are retained independently. A complete backup directory contains `database.dump.age` and `deletions.jsonl.age`; incomplete pairs remain hidden and are never treated as recoverable backups.

Initialize a protected `/etc/fomo-lens/deletions.jsonl`. Set DELETION_LEDGER to that path for account deletion. The deletion command appends and syncs an intent before deleting; if interrupted, rerun the command. An intent means the email's restored account must be deleted even if the original transaction failed. Encrypt and back up the ledger alongside each dump. Replay the current ledger after restoring an old dump and before allowing traffic.

Run `ops/backup.sh` before every migration, including the initial empty-database baseline. It atomically publishes encrypted dump/ledger pairs and removes completed pairs older than seven days only after a successful backup. Install the backup and maintenance timers plus failure alert unit. Rehearse restore on an isolated PostgreSQL instance with `RESTORE_ADMIN_URL` and `AGE_IDENTITY`; set RESTORE_EXPECT_SQL to assertions for known fixtures, and CURRENT_DELETION_LEDGER to the protected latest ledger. `restore-test.sh BACKUP_DIRECTORY` decrypts the pair, restores an isolated database, replays saved and current deletions, runs the assertions, and drops the test database. For a real recovery, keep traffic stopped, restore into a new dedicated database, run `replay-deletions.mjs SAVED_LEDGER CURRENT_LEDGER` through psql with ON_ERROR_STOP, verify records and readiness, then switch the connection. Never restore over the serving database. Expected fixtures must include an account that survives and one removed by ledger replay. Confirm an intentional backup failure sends an alert to the owner.

## Release and rollback

Run the complete release gate, commit reviewed changes, fetch that exact commit into `repository`, and run `ops/deploy.sh FULL_SHA` as root. Builds run unprivileged without runtime credentials. Deployment takes a baseline backup, applies additive migrations, atomically switches `current`, and verifies readiness. Keep `previous`. Run `ops/rollback.sh` to revert code only; never reverse migrations or overwrite production data automatically.

Before public launch verify desktop/mobile flows, actual email sign-in, ownership, unlimited usage accounting, HTTPS, retained upstream acceptance limitations, backup restoration, rollback, process restart recovery and database-outage readiness. Scripts are implementation artifacts until those rehearsals pass.

## Verified artifact deployment and provider key rotation

CI uses Node 24, isolated PostgreSQL databases and synthetic browser transports. It receives no production API keys. Successful `main` CI produces a release artifact, full commit SHA and SHA-256 checksum. Deploy verifies the originating workflow/repository/branch and checksum, then streams the artifact through the dedicated forced-command SSH account. Manual Deploy accepts a successful main CI run ID. Deployment serialization never cancels an active switch.

The root-owned installer requires `/etc/fomo-lens/launch-ready`, created only after the initial operational rehearsals pass. It verifies the checksum, safely extracts the archive within the disk reserve, scans the built output against runtime secrets, backs up, applies existing migrations, atomically switches and checks local/public readiness. The service can write only its cache. Runtime secrets remain in `/etc/fomo-lens/app.env` outside artifacts. Use `ops/rollback.sh` for code-only rollback; never roll the database back over serving data.

To rotate the provider key, replace only `FOMOLENS_KEY` in the protected server environment using an atomic file replacement that preserves root:fomo-lens ownership and mode 0640. Update repository Actions secret `FOMOLENS_KEY` from protected input, restart `fomo-lens`, and verify `/api/health/ready`. A rebuild is unnecessary. Preserve AUTH_SECRET, IP_HASH_SECRET, CURSOR_SECRET, the database and accounting history. Readiness verifies service configuration/database availability; it does not spend credits to validate provider entitlement.
