> Approved free-access plan (2026-09-13): no application request/credit caps. Current-key public launch is authorized after engineering checks. Historical billing restrictions below are superseded; preserve the private ledger and acceptance ceiling, and do not run paid acceptance automatically.

# Active execution — 2026-09-13

The user approved the full verification/deployment plan, superseding the historical restrictions below. Independent verification and rehearsals are authorized. Public stored-mode launch requires engineering release gates; historical billing reconciliation is not a launch gate. Node 24 installation is preparation for the newly authorized verification; dependency ranges will be preserved.

# Release verification — 2026-09-13

**Implementation complete for this constrained checkpoint. Release verification remains blocked.** See the [capability inventory](capability-inventory.md) for implementation, tested helpers and the evidence still required for each capability.

Only `npm run test` was executed for verification in this continuation. Its unchanged entry point is `vitest run --exclude tests/integration.test.ts`; there are no pretest/posttest hooks. No ci, install, build, dev/start, browser, integration, migration, secret scanner, operations, paid acceptance, deployment, commit or push was run. No emails were sent. No database schema changes were made.

## Permitted test evidence

- Preserved baseline: 20 tests / 4 files passed after the earlier completed dependency install and Prisma generation.
- First expanded run: exit 0; 78 tests / 8 files; 5.28 seconds. [Sanitized output](evidence/unit-tests-first-20260913.log).
- Second expanded run: exit 0; 91 tests / 9 files; 5.52 seconds. [Sanitized output](evidence/unit-tests-second-20260913.log).
- Final run after lost-response identity retention and timeout changes: **exit 0; 91 tests / 9 files; 5.58 seconds**. [Durable output](evidence/unit-tests-20260913.log).

Tests use injected transport, synthetic environment values/files and pure helpers. They do not contact upstream, run PostgreSQL, start a browser/server, scan real source/build output or execute operational scripts. They do not prove PostgreSQL atomicity, production billing, crash durability, browser usability or recovery on a host. Local Node is the earlier recorded v26.8.2; Node 24 compatibility is still unverified.

## Required release gates — execution now authorized

These gates are authorized by the approved resume plan. Record exit status, exact code revision/worktree, runtime version and sanitized evidence for every future gate. A failed gate blocks release.

1. **Static/build/source gates:** after authorization, run `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run scan:secrets`, `npm run build`, and `npm run scan:build`. Build without runtime credentials. Supply protected environment sources only to scanner processes through `SECRET_SCAN_ENV_FILE`; never expose values in logs. Expected: no lint/type/format errors, successful production build and complete scans with zero detections. For a Git archive use `npm run scan:secrets -- --archive`; symlinks, unreadable sources and files over 32 MiB must fail rather than silently pass. No current pass is claimed for any of these commands.
2. **Isolated PostgreSQL:** provision an isolated PostgreSQL 16 instance/database named `fomo_lens_test...`; use a protected `TEST_DATABASE_URL` and apply `npm run db:migrate` with DATABASE_URL targeting only that isolated database. Then `npm run test:integration`. Expected: all migration, concurrent usage/code, duplicate operation, shared concurrency, exact replay, Retry-After, unknown-charge, UTC, ownership, session and deletion assertions pass. Include running-worker interruption, deletion with unresolved accounting and maintenance across 90 days. Never use a production URL; tests truncate tables. The added retained-billing response regression remains unexecuted.
3. **Browser/email:** set isolated `TEST_BROWSER_DATABASE_URL` and test mail capture, then `npm run test:browser` after authorization (its configuration starts a dev server). Expected desktop/mobile success for synthetic no-dispatch, signup/signin, session reload and signout, every research kind, shared selections, empty/error states, pagination, comparison, history and owner redaction. Exercise delayed and lost responses, stale selection during decoding/recovery, refresh failure and subsequent requests. Check keyboard focus, connection list, mobile panels, screen-reader labels and contrast. Separately authorize and verify real email delivery; captured test mail is not real delivery evidence.
4. **Node 24/native operations:** follow [operations](operations.md) on an isolated rehearsal host with equivalent systemd/Nginx/PostgreSQL configuration and two reviewed code releases. After successful build/scan/database gates, `ops/deploy.sh FULL_SHA` must create a pre-migration backup, switch current and verify local/public readiness. `ops/rollback.sh` must restore code only, preserve the database and leave a verified previous release. Inject INT/TERM immediately before/after switching, restart failure, failed local/public readiness and failed restore/stop. Expected: nonzero exit; prior verified code restored, or service stopped; a stop failure must report CRITICAL rather than claim success. Rehearse SIGKILL/power loss separately: inspect current/previous and process state before restoring verified code. Do not infer handling of uncatchable signals from the new shell traps.
5. **Readiness and restart:** on that isolated host, stop only its dedicated database, request `/api/health/ready` and `/api/health/live`, then restore it and restart the app. Expected: readiness fails during outage/schema absence, liveness can remain alive, readiness recovers with all required migrations; unfinished operations retain reservations and explicit replay identity. Check HTTPS and isolation from other applications.
6. **Encrypted backup/restore/deletions:** create a surviving fixture and a fixture deleted after backup. Run `ops/backup.sh`, then `RESTORE_ADMIN_URL=... AGE_IDENTITY=... RESTORE_EXPECT_SQL=... CURRENT_DELETION_LEDGER=... ops/restore-test.sh BACKUP_DIRECTORY` using protected values and an isolated admin URL. SQL assertions must prove survivor presence, deleted user/challenges/sessions absence and unresolved accounting retention. Expected: encrypted pair published only after both files sync, isolated restore/deletion assertions pass, test database removed. Corrupt one encrypted file and force cleanup failure; both must exit nonzero with accurate reporting. Test two backups in a day and seven-day retention. Never restore over serving data. Local encrypted backups do not survive host/disk loss.
7. **Maintenance/timers/alerts:** install the reviewed units on the rehearsal host; run `systemctl start fomo-lens-maintenance.service` and `systemctl start fomo-lens-backup.service`, inspect their exit statuses and `systemctl list-timers 'fomo-lens-*'`. Expected expired sessions/challenges/rate buckets removed, unresolved operation accounting retained and completed backups retained for seven days. Under separate email authorization, force a backup/maintenance failure and verify owner alert delivery and a nonzero alert-unit status when delivery itself fails.
8. **Authoritative billing and credentialed acceptance:** the private ledger remains untouched at **14 confirmed credits + unresolved 100-credit reservation = 114 exposure / original 120 ceiling**. The reported 85-credit balance is not reconciliation evidence. Obtain authoritative charge evidence for the unresolved request and saved validation evidence for legacy successful entries. Reconcile in a separately authorized, audited private step. Review retained `.lock` and `.next` files against durable ledger and billing evidence; never automatically remove an abandoned lock or replay successful paid work merely to obtain fixtures. Only after reconciliation and authorization, use `VERIFICATION_LEDGER`, previously observed subject/address and the existing credentials with `node --import tsx scripts/verify-upstream.ts`. Expected no duplicate paid successes, no ambiguous outcome continuation, durable reservation before each dispatch and total exposure at most 120. Do not raise the ceiling. Failed validation or persistence keeps the lock and blocks further requests.

Execution and public launch are authorized after operational and engineering gates pass.

## Historical evidence

[Prior installation/recovery verification](evidence/prior-release-verification.md) and [prior handoff](evidence/prior-handoff.md) preserve the earlier failed missing-Vitest run, interrupted DNS install attempt and subsequent successful installation. All pending installation statements there are historical. Earlier September 10 build/lint/typecheck claims do not validate the current working tree. `docs.md` is a dated upstream reference; its API claims were not rewritten.

## Fresh resume evidence

- Base commit confirmed: `fd8967d8de0e5c4ba06c5173ceaf1792a2109995`; preserved dirty tree and Docker removals.
- No running test/server/PostgreSQL processes at recovery. Isolated cluster remains on disk at `/tmp/fomo-release-postgres` (port 55433). No acceptance locks removed.
- Local `.env` and protected server environment files have mode 0600. Credential synchronization is inherited, not repeated.
- Inherited lint/unit/integration passes are not fresh release evidence. Browser log contains startup only.

## Continuation checkpoint — 2026-09-13

- User authorized implementing the continuation plan, with paid acceptance and public deployment deferred. The original exposure remains 114 / 120; no ledger changes or paid requests.
- User confirmed receipt of verification/design and operations emails and approved the template. Provider acceptance and user-confirmed delivery are both recorded; this does not establish deployed sign-in yet.
- Saved Node 24 resume logs show 91 unit tests and 16 integration tests passing; see `evidence/resume-unit-20260913.log` and `evidence/resume-integration-20260913.log`. Later edits still require final validation.
- Fresh isolated VPS backup rehearsal passed after fixing empty decrypted ledger creation: two daily backups, seven-day retention, encrypted restore, post-backup deletion replay, unresolved accounting preservation, corrupt backup rejection and cleanup-failure reporting. See `evidence/resume-backup-20260913.log`. The isolated PostgreSQL instance was stopped afterward.
- Initial fresh rehearsal setup failed because a root-only parent prevented service-user traversal; corrected to traversal-only access on that isolated parent. Existing failed-run artifacts preserved.
- Browser suite and clean dependency installation are running; no complete browser/build pass is claimed.

## Second restart — 2026-09-13

- Clean credential-free snapshot installation passed with Node 24.21.0 and the existing lockfile: 581 packages installed, audit reported zero vulnerabilities. See `evidence/restart-install-20260913.log`.
- Fresh isolated integration suite passed 17 tests, including killing a separate dispatch worker with SIGKILL and recovering using its original URL/idempotency key without releasing its credit reservation. See `evidence/restart-integration-20260913.log`. The test advances the persisted heartbeat to exercise the existing 90-second stale-worker threshold.
- Browser run inherited from the interrupted session recorded one desktop pass only; it is incomplete.
- Production build in the credential-free snapshot failed under sandbox process/port restrictions; the approved retry also exited 1 with the same process/port permission failure in `/home/xaxxo/shola/fomo-release-candidate`, logged to `/tmp/fomo-restart-build-approved.log`. Build verification remains open and should be attempted in a suitable GitHub runner or isolated host environment.
- Supplied runtime keys saved to ignored local `.env` with mode 0600. FOMOLENS_KEY successfully updated via gh in repository Actions secrets. Existing RESEND_API_KEY secret is present; its value was not read or compared. Newly supplied keys have not yet been synchronized with server runtime configuration.
- VPS inspection: Node 24.21.0; Nginx configuration valid; Certbot renewal timer active; DNS resolves to 45.67.128.88; port 3001 available; 4.8 GB free. No current application release or dedicated domain certificate exists. Backup timer active; maintenance timer absent.
- Encrypted off-VPS rehearsal archive returned to a separate VPS directory; restoration from that returned copy remains pending.
- GitHub Actions enabled, no repository workflow files or registered self-hosted runners. CI/CD requested; design captured in `../production-plan.md`. No commit/push/public deployment or paid API dispatch performed in this restart.

## Free-access implementation — 2026-09-13

The approved free-access plan supersedes historical billing launch restrictions. Removed both SERVICE_DAILY configuration fields and all daily quota rejection. Owner allowance fields return null limits; atomic requests/reservations/settlement and the existing database schema remain intact. Provider availability errors offer retry guidance without payment prompts.

Fresh Node 24 evidence: 91 unit tests and 17 isolated PostgreSQL integration tests pass, including usage above both former limits with stale environment entries, recovery, SIGKILL interruption and owner-only accounting. Typechecking passes after correcting the existing worker test's Node events import. The off-server encrypted backup restored successfully with survivor, deletion replay and unresolved-accounting assertions. Initial browser runs found an invalid last-page button assertion (fixed); complete reruns are pending. The webpack production build compiles and typechecks; final trace/build completion remains pending at this checkpoint.

Added GitHub-hosted CI and verified-artifact deployment with pinned actions, isolated PostgreSQL, Node 24, no provider secrets in CI, commit/checksum binding, successful-main provenance validation, dedicated forced-command SSH and serialized deployment. Runtime provider/email keys are synchronized separately from signing secrets. A dedicated HTTPS certificate has been issued. First activation requires the root-owned operational launch marker; it has not yet been created.

No paid acceptance was run and the private ledger was not changed. The retained live following/followers/reverse-wallet limitations are evidence limitations, not launch blockers. Final CI, operational rollout and public acceptance results will be recorded below.
