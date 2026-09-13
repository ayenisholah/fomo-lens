# Free-access release verification — 2026-09-13

Public stored-mode launch is authorized with the current provider key after engineering checks. Historical billing reconciliation is not a launch gate. No application daily request or credit quotas remain; accounting, concurrency one and recovery are preserved.

## Engineering evidence

[GitHub CI 34783473322](https://github.com/ayenisholah/fomo-lens/actions/runs/34783473322) passed for `4cc17dca10b99304646a4dc290f0f7177d413fc9` on a hosted Ubuntu runner with Node 24 and the existing lockfile. Gates include formatting, lint, type generation/typechecking, 91 unit tests, source scanning, both reviewed migrations in isolated PostgreSQL databases, 17 integration tests, all 16 desktop/mobile browser tests, production build and artifact scanning. No production provider/email keys were supplied to CI.

The integration suite proves requests above both former limits still settle across users, including stale SERVICE_DAILY entries. It also covers concurrency, duplicates, Retry-After, unknown charges, exact-identity recovery, real worker SIGKILL, UTC rollover, sessions, owner redaction, deletion and unresolved retention. Browser coverage includes all eight research kinds, pagination, comparison/history/shared selections, email-code sign-in/signout, failed recovery, delayed response selection, provider errors and subsequent requests.

Local Node 24 unit/integration/type checks also passed. The credential-free webpack build and complete build scan passed after removing disposable compiler caches that exceeded the scanner's 32 MiB limit. The scanner still rejects oversized shipped files. Initial browser assertions exposed final-page button disappearance and a selector label issue; the added delayed-response test found and fixed overwritten input. Initial lint caught synchronous hydration state; useSyncExternalStore now supplies hydration state. An overloaded local browser rerun was stopped and is not claimed as passing.

## Operational evidence

- The saved off-server encrypted backup restored into an isolated PostgreSQL instance with survivor, post-backup deletion replay and unresolved-accounting assertions passing. Earlier encrypted pair publication, corrupt-backup rejection, cleanup failure, two daily backups and seven-day retention evidence remains in the historical record.
- The scanned application build ran under a dedicated rehearsal systemd unit and isolated database. Startup/restart, readiness 503 during database outage, liveness during outage and recovered readiness passed. The schema fixture was created from reviewed SQL; migration-runner verification is separately covered by CI.
- Two rehearsal release directories used the scanned build with distinct server entry points. Atomic switch, code rollback and return passed. INT/TERM before/after switching restored the previous app; a failed entry point restored the working app. SIGKILL left the expected switch state for inspection and explicit recovery. This is process-kill evidence, not a physical power-loss simulation.
- Injected release-helper failures confirmed failed public readiness stops an unverifiable release, failed restoration never claims success, and failed service stop reports CRITICAL/nonzero.
- Dedicated Nginx host and certificate installed using the existing IP-specific listener layout. Nginx configuration and Certbot renewal dry run passed; Mone Beauty remained reachable after reload.
- Supplied provider/email keys synchronized into protected server configuration and GitHub repository secrets. Signing secrets were preserved. The dedicated forced-command deployment key and pinned host keys are stored in the GitHub production environment. Runtime secrets are excluded from artifacts.

## Production activation

Initial release `4cc17dca10b99304646a4dc290f0f7177d413fc9` deployed successfully through [manual Deploy 34784421378](https://github.com/ayenisholah/fomo-lens/actions/runs/34784421378), using [successful CI 34783473322](https://github.com/ayenisholah/fomo-lens/actions/runs/34783473322). The first automatic attempt correctly refused activation while the operational launch marker was absent.

The artifact checksum, protected-value build scan, encrypted pre-migration backup, both existing migration states, atomic switch and local/public readiness passed. The app serves stored mode on `127.0.0.1:3001` behind dedicated HTTPS. Free disk after first activation was 3.6 GB, above the 1.5 GB reserve. The trusted Nginx client-IP header is explicitly overwritten from the connection address for authentication throttling.

A real owner verification email was dispatched through the deployed authentication delivery function; its code was retained only in the root-owned verification process and consumed through the public HTTPS verify endpoint. Secure/HttpOnly/SameSite session cookie, owner session with null limits, authenticated app/admin access and anonymous 401 passed. A disposable non-owner database/session fixture proved allowance redaction and admin 403, then was deleted. This proves provider dispatch and public verification; fresh inbox receipt was not independently confirmed. No research requests were dispatched.

Production maintenance and encrypted backup services returned success. Backup (02:15 UTC), maintenance (03:15 UTC), certificate renewal and app boot enablement are configured. The final documentation/UI release and code rollback checks are recorded in the GitHub production deployment history and the protected server release evidence file.

## Retained limitations

No additional paid acceptance was performed. The private ledger remains 14 confirmed plus 100 unresolved reserved credits under its original 120 ceiling. Live following/followers and successful reverse-wallet acceptance remain unverified. Provider restrictions may temporarily prevent production research; the application does not charge users or substitute synthetic results on failure.

An off-server encrypted copy was restored successfully, but automatic continuous off-server replication is not configured. The automated backup timer retains encrypted local backups for seven days. Preserve the separately protected decryption identity.

Historical evidence and failed checkpoints remain in [pre-free release verification](evidence/pre-free-release-verification.md).
