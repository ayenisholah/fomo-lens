# Historical checkpoint — superseded by HANDOFF.md

# Fomo Lens — resume here

Recovered checkpoint: 2026-09-13. Workspace: `/home/xaxxo/shola/lens-atlas`.
Base commit: `fd8967d8de0e5c4ba06c5173ceaf1792a2109995`; substantial existing uncommitted implementation is preserved. This is not a verified release.

## Current authorization and execution constraints

The resumed task is local recovery implementation, project-only environment consolidation, static review, and documentation. Persistent constraints are in `AGENTS.md` (referenced by `CLAUDE.md`): the user now explicitly authorizes `npm install` and its existing `prisma generate` postinstall hook; ci, build, dev, and start remain prohibited, directly or indirectly; use only `npm run test` for testing. Do not execute deployment, paid acceptance, or the browser configuration that starts a dev server. These constraints supersede earlier broad release authorization.

Preserve native Node.js/PostgreSQL/Nginx work, the shared email design, existing credentials, unrelated services, verified-user access, owner administration, shared 200-request/200-credit UTC budgets and single-request concurrency. No Docker or deliberate dependency upgrades.

## Recovered baseline

Native operations, wire adapter, accounting/recovery, account deletion, browser/integration/unit tests and email renderer exist in the working tree. Their presence is implementation evidence only. Earlier handoff claims that they do not exist were stale. Current instructions: `docs/operations.md`; dated check results: `docs/release-verification.md`.

The private acceptance ledger records 14 confirmed credits and a 100-credit unresolved reverse-wallet reservation, request `1b1bc8dc-6edd-4b7d-a151-dbbeedab8588` (HTTP 402, no cost header). Preserve both. Authoritative billing evidence is required; no further paid verification or launch until reconciliation. Original ceiling remains 120 credits.

## Changes in this resume

- Recovery now uses `src/lib/recovery-client.ts` to release the shared pending gate in `finally`, including network, HTTP, decoding, application and stale-response exits. Recovery is tied to the original request ID and selection version; recovered profiles select the returned subject. Subject, wallet-address and window selection changes invalidate delayed results. Normal requests also suppress stale response errors and operation updates.
- `tests/recovery-client.test.ts` adds mocked success, failure, stale-selection, delayed-response, concurrent-attempt and subsequent-request cases to the existing permitted test command. These tests are included in the subsequent successful 20-test run recorded below.
- Existing local `.env` values were preserved; all example keys were already present. Added isolated `TEST_DATABASE_URL` and `TEST_BROWSER_DATABASE_URL` defaults plus blank optional `VERIFICATION_LEDGER`, `VERIFICATION_SUBJECT`, `VERIFICATION_ADDRESS`, and `SECRET_SCAN_ENV_FILE`. Test database availability is unverified. `.env` remains ignored and mode 0600; test setup clears live API/email credentials. No host provisioning or backup settings were invented.
- Static review fixed acceptance-runner continuation after an unknown cost within the same run and rejected unsafe numeric cost headers. Empty optional subject/address settings retain discovery fallback. The private acceptance ledger was not changed or executed.
- Secret scanning now retains known values from every configured environment source, including database/password settings, rather than losing values through overrides. Neither source nor build scanning was executed.
- Deployment recovery statically routes switch/restart/readiness/HTTPS failure to the prior release, stopping the service if restoration cannot be verified. No deployment scripts were run or changed in this resume. Database migration compatibility and failure recovery still require evidence.

## Actual verification and remaining blockers

The initial `npm run test` failed with exit 127 (`vitest: not found`). After the user authorized installation, `npm install` succeeded (exit 0), generated Prisma Client 7.10.0, and `npm run test` passed **20 tests across 4 files** (exit 0; 4.73 seconds). The script remains `vitest run --exclude tests/integration.test.ts`, with no pretest/posttest hooks. This establishes only the permitted unit-test gate.

1. Dependency restoration and the permitted tests are complete. Do not repeat installation solely to resume. npm reported 0 audit vulnerabilities and warned that dependency lifecycle scripts for `@prisma/engines`, `esbuild`, `prisma`, and `unrs-resolver` are not covered by allowScripts. No additional script approvals were made; the authorized root Prisma generation and tests nevertheless succeeded.
2. Browser, integration, build, source/build secret scans and production checks remain unverified. Browser/release/deployment runners indirectly invoke prohibited commands and must not run under current constraints.
3. Acceptance ledger schema integrity, private validation evidence, crash durability and lock recovery still need verification. Preserve 14 confirmed credits plus the unresolved 100-credit reservation (114 exposure of the original 120 ceiling). The reported 85-credit balance does not reconcile the disputed request. No further paid requests or launch without authoritative billing evidence.
4. Server/database state, encrypted restore/deletion replay, alerts, timers, readiness during outages, restart, migration compatibility and rollback rehearsals lack fresh evidence.
5. Deployment remains blocked until required release evidence exists and execution constraints permit the necessary gates. No commit, push or deployment was performed.

Never label implementation or static review as production verification. Keep secrets and private research results out of documentation.

## Install checkpoint — 2026-09-13 (written before installation)

User requested `npm install` and updates to all docs first so an interrupted session can resume. All project Markdown docs now link to this checkpoint; historical evidence remains historical.

- State: COMPLETE. Documentation was saved first; attempt 1 hit sandbox DNS failures and was interrupted (exit 130). Approved network retry succeeded (exit 0); subsequent `npm run test` passed (exit 0). Working directory: `/home/xaxxo/shola/lens-atlas`. Node v26.8.2, npm 11.19.1; 3.7 GiB free before installation. Operations target Node 24; this local version does not establish production compatibility.
- Executed command: `npm install`, with output saved privately to `/tmp/fomo-lens-install-20260913.log`. Existing root postinstall is `prisma generate`; no preinstall/install/prepare hooks are defined. The existing package manifest and lockfile must be preserved, allowing npm’s normal lockfile reconciliation without intentional upgrades.
- If interrupted: inspect running npm processes and the install log before retrying; do not run concurrent installs. A partial `node_modules` tree or Prisma output is not proof of completion. Record the exit status when available; if unknown, say so.
- Completed follow-up: `npm run test`, saving output to `/tmp/fomo-lens-test-20260913.log`; diagnose failures within current constraints, then update this file and `docs/release-verification.md` with exact results. Never substitute build/browser/integration/release runners.
- Missing registry access may require sandbox network escalation. No live research, database migration, server startup, or deployment is authorized by this installation request.
- Preserve all uncommitted changes, ignored `.env`, and the private billing ledger. Do not print secrets. Billing and release gates above remain in force.

Install attempt 1: npm registry resolution repeatedly failed with `EAI_AGAIN` in the restricted sandbox. Interrupted with exit 130 before retrying; no successful install is claimed. Next: retry the same `npm install` with sandbox network escalation, appending output to the same install log, then run `npm run test`.

Dependency restoration result: approved network retry of `npm install` succeeded (exit 0), changed 581 packages and reported 0 audit vulnerabilities. Existing postinstall generated Prisma Client 7.10.0. npm warned that four dependency lifecycle scripts are not covered by allowScripts; no additional script approvals were made. Next: `npm run test`; its outcome is pending.

## Final resume state — dependency restoration complete

- Install: exit 0; 581 packages changed, 582 audited, 0 reported vulnerabilities; Prisma Client 7.10.0 generated. npm may reconcile the already modified lockfile; no package ranges were deliberately changed, and earlier uncommitted work remains preserved.
- Tests: `npm run test`, exit 0; 4 files / 20 tests passed, duration 4.73 seconds. Recovery regression cases are included.
- Logs: `/tmp/fomo-lens-install-20260913.log` (includes failed first-attempt output followed by successful retry) and `/tmp/fomo-lens-test-20260913.log`. These are local temporary logs; the durable result is recorded here and in release verification.
- No install/test process remains running from this task. Resume with the unresolved release and billing blockers listed above, not dependency installation. Browser, integration, build, source/build secret scans and production checks remain unverified. No server was started, no paid endpoint called, no database migration run, and no deployment performed.
