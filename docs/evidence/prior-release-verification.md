# Historical verification — superseded by current release checklist

# Release verification

## 2026-09-13 — recovered baseline

Tested baseline: `fd8967d8de0e5c4ba06c5173ceaf1792a2109995` plus preserved uncommitted changes. No new gate pass is inferred from temporary artifacts.

- `git status --short`: extensive native deployment/application/test changes preserved, including intentional Docker removal.
- `df -h .`: 2.8 GiB available locally before verification.
- Private acceptance ledger: four HTTP 200 entries total 14 confirmed credits; reverse request `1b1bc8dc-6edd-4b7d-a151-dbbeedab8588` returned HTTP 402 without authoritative charge. Its maximum reservation is 100; total committed exposure is 114 of 120.
- Saved email previews, build scan scripts and PostgreSQL directories exist. Existence alone does not prove completed checks.
- Owner asked for authoritative billing evidence. Paid verification and launch remain blocked pending reconciliation; independent work continues.

Record commands and results below without credentials, research payloads or private identities.

## 2026-09-13 — constrained recovery implementation

All prior uncommitted work remains preserved. Persistent execution restrictions were added to `AGENTS.md`; `CLAUDE.md` already references it.

- Implemented the recovery lifecycle helper and original-selection guard, restored recovered-profile selection, and suppressed stale normal-request results/errors. Added eight mocked regression cases (parameterized cases included) covering completion, HTTP/network/JSON/application failures, delayed success/failure, stale selection and subsequent requests. These are source evidence only, not a test pass.
- Consolidated genuinely missing local test/verification settings into ignored `.env`, preserving existing values and restricting file permissions to 0600. Isolated test database targets are defaults, not verified reachable databases. Test setup explicitly clears live upstream/email credentials.
- Reviewed acceptance-runner reservation-before-fetch, resume checks, lock and atomic file replacement. Fixed the missing ambiguity check between requests within a run and unsafe numeric cost parsing. Ledger integrity/crash recovery remain unverified; no private ledger mutation or upstream call occurred.
- Reviewed source/build scanner traversal and suppressed diagnostics. Fixed overwritten known-value coverage across environment sources and added database/password keys. Scanners were not executed; no secret-scan pass is claimed.
- Reviewed deploy/rollback/shared-health scripts without execution. Switch, restart, readiness and public HTTPS failures share recovery; failed restoration stops the service. Post-migration rollback compatibility, signal/crash handling and runtime recovery need rehearsal. This is not deployment validation.

Only test command executed: `npm run test`.

```text
> vitest run --exclude tests/integration.test.ts
sh: 1: vitest: not found
Exit: 127
```

No tests executed. No dependencies were installed and the test script was not changed. Missing Vitest remains the immediate blocker. Browser, integration, build, production, restore, deployment and secret-scan checks are **unverified**. The browser configuration starts a dev server; browser and aggregate release runners must not run under current constraints.

The 14 confirmed credits and unresolved 100-credit reservation remain unchanged against the original 120-credit ceiling. The reported 85-credit balance is not authoritative reconciliation. Deployment and paid acceptance remain blocked pending billing reconciliation and required release evidence. See `HANDOFF.md` for remaining work.

## 2026-09-13 — dependency restoration checkpoint

User explicitly authorized `npm install` after documentation updates, superseding the earlier install restriction. Documentation was saved before installation. Initial state: not yet started; no new test pass. Existing postinstall runs `prisma generate`. Local runtime is Node v26.8.2 / npm 11.19.1 (operations target Node 24); disk available before installation: 3.7 GiB.

Install log: `/tmp/fomo-lens-install-20260913.log`. Planned permitted test log: `/tmp/fomo-lens-test-20260913.log`. On interruption inspect the process and logs before retrying; record unknown outcomes explicitly. See `../HANDOFF.md` for exact resume steps. Build, dev/start, ci, browser, integration, paid acceptance and deployment restrictions remain in force.

Installation started after all documentation updates; process in progress, exit status pending (tool session 10415).

Install attempt 1: npm registry resolution repeatedly failed with `EAI_AGAIN` in the restricted sandbox. Interrupted with exit 130 before retrying; no successful install is claimed. Next: retry the same `npm install` with sandbox network escalation, appending output to the same install log, then run `npm run test`.

Dependency restoration result: approved network retry of `npm install` succeeded (exit 0), changed 581 packages and reported 0 audit vulnerabilities. Existing postinstall generated Prisma Client 7.10.0. npm warned that four dependency lifecycle scripts are not covered by allowScripts; no additional script approvals were made. Next: `npm run test`; its outcome is pending.

## 2026-09-13 — installation and unit-test results (current)

The approved network retry of `npm install` finished with **exit 0**. npm reported 581 packages changed, 582 audited, and 0 vulnerabilities. The existing root postinstall generated Prisma Client 7.10.0. npm also warned that dependency lifecycle scripts for `@prisma/engines`, `esbuild`, `prisma`, and `unrs-resolver` are not covered by allowScripts; no additional script approvals were made. No dependency ranges were deliberately upgraded.

`npm run test` then finished with **exit 0**:

```text
Test Files  4 passed (4)
     Tests  20 passed (20)
  Duration  4.73s
```

This includes the recovery regressions and resolves the missing-Vitest blocker. Integration is explicitly excluded by the test script. Browser, integration, build, production, restore, deployment and source/build secret scans remain unverified. No paid upstream call, server startup, migration, commit, push or deployment occurred. All 11 project Markdown documents were updated before installation, then refreshed with the final results.

Logs: `/tmp/fomo-lens-install-20260913.log` and `/tmp/fomo-lens-test-20260913.log`. Both processes are finished; the earlier pending status entries above are historical checkpoints. Continue from the final state in `../HANDOFF.md`. Billing reservations and the original ceiling remain unchanged; deployment remains blocked.
