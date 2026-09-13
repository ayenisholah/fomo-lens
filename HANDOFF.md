# Lens Atlas — resume here

Checkpoint date: 2026-09-10. Repository: https://github.com/ayenisholah/lens-atlas. Workspace: /Users/Dijha/shola/fomolens.

The user asked to pause, prepare handoff/changelog documents, and commit/push all checkpoint changes without ChatGPT attribution. This is **unfinished implementation**, not a release.

## User decisions that persist

- Implement the full Lens Atlas product plan; retain this isolated repository and workspace.
- Use **Prisma**, replacing the original plan's Drizzle ORM.
- Use the **latest stable Next.js App Router**: registry confirmed Next.js 16.3.4 during this session.
- **Do not install Docker locally.** The user will provision a server and provide full access later. Install and rehearse Docker there.
- No GitHub Actions or container registry requirement.
- No ChatGPT attribution or co-author trailers in commits.
- Keep all runtime credentials out of Git, images, browser assets, logs, and shared links.
- No API credentials or VPS details have been supplied. No paid upstream calls are authorized by this checkpoint.

## What exists

Public landing, methodology, privacy, email verification, synthetic example workspace, protected research workspace, owner dashboard; React Flow graph and connection list; manually initiated profile/PnL/wallet/social/leaderboard actions; comparison and sharing; Prisma schema/migration; auth/session/ownership foundations; operation/budget/cursor foundations; maintenance and deployment drafts.

The prototype is archived under `prototype/`. It is not the contract source and is not a production entry point.

Key files:

- `src/lib/auth.ts`: Resend/test capture, code request/verification, limits, cookies, owner checks.
- `prisma/schema.prisma` and `prisma/migrations/202609100001_initial/migration.sql`: first schema.
- `src/app/api/[...path]/route.ts`: explicit GET/POST dispatch for API families.
- `src/lib/research.ts`: durable operations, reservations, status, recovery.
- `src/lib/upstream.ts`: injectable transport; **verifiedContract is null**.
- `src/lib/research-contract.ts`: internal DTOs, NOT upstream wire shapes.
- `src/components/workspace.tsx`: main client research UI.
- `ops/`, `Dockerfile`, `compose.yml`: unexecuted operations drafts.
- `docs/fomolens-contract-notes.md`: authoritative API findings.
- `docs/operations.md`: environment/operations draft.
- `CHANGELOG.md`: checkpoint change summary.

## Verification record

- Original repository inspected: empty remote, no previous local commits, original prototype only.
- Latest stable Next.js checked against registry: 16.3.4.
- Prisma's registry `latest` CLI tag unexpectedly resolved to 8.0.0-rc.13, whose CLI did not support the required generate workflow. Stable Prisma 7.10.0 selected instead. Keep CLI/client/adapter aligned; do not use Prisma CLI `@latest` blindly.
- Initial dependency installation ran out of disk. With user/tool approval, cleared only the regenerable npm cache and retried. Last observed free space was about 1.6 GiB; check before builds.
- PostgreSQL 14.8 and Chrome are installed locally. PostgreSQL was not started; no migration has run.
- Docker is not installed and must not be installed locally.
- Formatting and source secret-pattern scan passed before this handoff was written.
- `bash -n` passed for deploy, backup, restore-test, and rollback scripts. This is syntax validation only.
- Automated unit, PostgreSQL integration, and Playwright test cases **have not been written**. Only test-tool configuration exists. The full release command must fail until suites exist.
- No browser, DB integration, backup restore, image inspection, or production verification has passed yet. The production build passed during final checkpoint checks.
- See appended final checkpoint results below for any additional checks completed before commit.

## Highest-priority next steps

1. Confirm dependency install, lockfile consistency, Prisma generation, lint, and strict typecheck. Run a production build without runtime secrets and fix any App Router/runtime validation or Suspense issues.
2. Start an isolated existing PostgreSQL instance (not Docker), configure local .env and private test-only email capture, apply the first migration, and implement authentication integration tests before trusting the auth flow.
3. Implement the authoritative Fomolens wire client using the contract notes. Preserve nullable wallet IDs/handles, count/mappings, independent timestamps, per-row PnL times, coverage, hasMore, planLimitReached, and unchanged cursor parameters. Current normalized DTOs lose some required upstream metadata; revise them.
4. Review/fix accounting and recovery before replacing verifiedContract=null. Add acceptance tests using injectable transport; do not make paid calls without explicit approval.
5. Finish browser/UI acceptance and documentation, then run the complete local release check.
6. Once server details arrive, inspect and bootstrap it, install Docker there, and execute deployment/backup/rollback rehearsal and production activation.

## Known incomplete or risky areas — fix before release

### Authentication / ownership

- No concurrent verification, expiration, supersession, delivery failure, fixed-expiry, device-session, origin, or rate-limit integration tests yet.
- Owner access changes record actor/type but do not yet store an audit target identifier. Add a minimal target field without adding handles to analytics.
- Account deletion and verification need a shared email lock so verification cannot race with deletion and recreate an account unexpectedly.
- The API's safe error handler currently returns generic errors without all effective-mode/operation metadata required by the plan. Research failures need safe operation IDs and actionable states.
- The 200-user admin list is explicitly bounded but lacks pagination.
- Test-email simulation is implemented as local protected files, never logs/public HTTP. It has not been exercised.
- Review request body size enforcement and trusted proxy behavior on the actual deployment.

### Research / billing

- Stored adapter is intentionally disabled. Do not activate it by guessing a wire shape.
- Recovery lacks the documented 24-hour idempotency deadline, retry request budget accounting, Retry-After enforcement, and detailed upstream in-progress/replay/abandoned distinctions.
- Preserve known accounting across an ambiguous recovery; do not overwrite a known cost with unknown metadata or double-adjust reservations.
- Persist only safe cost/request/rate metadata; the shared account balance must be owner-only. Currently upstream rate metadata/balance support is incomplete.
- Combined profile-plus-PnL action with two grouped operations and combined atomic preview/reservation is not implemented. Current controls run profile and PnL independently.
- Coverage API/UI is incomplete; synthetic coverage exists but actual aggregate wire fields and unavailable state are not mapped.
- Current operation parameters include full request JSON (including signed cursor); audit retention and recovery access to ensure no unnecessary tokens leak.
- Maintenance only converts stale running operations daily; consider a safe explicit stale-operation recovery path without redispatching active work.
- No accounting reconciliation command yet.
- Verify that input handle normalization matches upstream case/UUID semantics.

### UI / evidence

- No browser acceptance or visual inspection yet; responsive styles are written but unverified.
- Mobile navigation and tabs need keyboard/focus testing.
- Shared selected handle validation should use the shared schema instead of only truncating it.
- Profile image rendering/URL validation is not implemented; current initials fallback avoids arbitrary image requests.
- Leaderboard rows need exact independent observation times and nullable identity handling after wire integration.
- Graph expansion currently exposes following only; followers need their independently controlled view if included.
- Explicit recovery reports completion but does not repopulate the corresponding view.
- Switching subjects while a request is pending and changing user mode must not display stale/mixed data.
- Aggregate coverage and comparison metadata need complete evidence presentation.
- Public /example is available but not yet linked prominently from the landing page.

### Deployment / operations

- Dockerfile and Compose are drafts and untested, including Prisma generation in build/ops images and production startup validation.
- No Docker rehearsal locally by user instruction.
- Deployment script backs up only an existing release. Ensure initial deployment also takes a baseline backup after DB startup and before migration.
- Readiness should check all required migration/schema availability and fail cleanly on DB outage.
- Review migration compatibility before automated image fallback; scripts currently assume additive compatibility.
- Rollback must verify health before updating release markers.
- Review preservation of previous image ID, release marker accuracy after failure, and full ops-image reproducibility.
- Configure protected ops.env, release variables, backup hook, timer failure alerting, and encrypted off-server retention before enabling schedules.
- Restore-test checks basic schema/counts but needs substantive restored-data verification.
- Privacy page needs the operator's real contact address and off-server backup retention policy before launch.
- Source pattern scanning is only one layer; browser assets, image layers, logs, and HTTP responses still need secret checks.

## Full acceptance to implement

Auth signup/returning login; wrong/expired/superseded/reused code; exactly one concurrent consume; concurrent rate limits; controlled-clock seven-day expiry; persisted independent sessions; immediate signout; safe return paths.

User-isolated history/operations; anonymous/non-owner/unapproved denial; concurrent budgets; duplicate requests; exact recovery key/URL; timeout reservations; no shared secrets/balance exposed.

Wire wallet nullability/count, PnL one request/no window query, signed cursor binding, unchanged parameters, limits and cursor expiry, partial timestamps/coverage, missing credit metadata, zero upstream requests in example mode.

Browser search/node selection/explicit expansion/connection list, one-to-three comparison, leaderboard paging, local windows, shared links without automatic paid reads, keyboard/mobile/reduced motion.

Production startup/build distinction, empty migration, non-root runtime, DB-outage readiness, isolated restore, failed-release rollback, secret scans, real email, HTTPS, encrypted off-server backup.

## Completion language

- **Written/implemented** only for code that exists, with limitations acknowledged.
- **Locally verified** only after the full automated checks pass.
- **Production verified** only after server/HTTPS/email/backups/rollback checks pass.
- Do not describe stored mode as verified until authoritative schemas and explicitly approved credentialed behavior have both been tested.

## Final checkpoint checks before commit

- Prisma CLI, client, and PostgreSQL adapter: **7.10.0 stable**. Client generation passed.
- Next.js: **16.3.4 stable**. Production build passed without .env or real runtime secrets; all public pages prerendered and protected routes built dynamically.
- TypeScript: **6.0.3**, strict typecheck passed. Version 7 was incompatible with the current typescript-eslint API.
- ESLint: **9.39.5**, lint passed with two warnings (anonymous PostCSS default export; full-document signout navigation). ESLint 10 was incompatible with the installed React lint plugin. ESLint 9 is now deprecated; revisit the supported lint toolchain before release.
- Formatting and source secret-pattern scan passed.
- Shell syntax checks passed for all four ops scripts.
- Production dependency audit: **zero reported vulnerabilities**.
- Full dependency audit: **four high advisories in development/Prisma CLI dependencies** (Prisma/config via deepmerge-ts, and mysql2). Resolve or review before running the operations image in production; do not blindly run a forced major downgrade.
- No test suites have been written or executed. No database was started or migrated. No app was launched in a browser. No Docker or paid upstream requests were run.
- The remote was empty before this checkpoint. Existing local Git author configuration was preserved; no attribution/co-author trailer was added.

The first next-session task is to implement the integration/security tests and finish the documented wire adapter, after reviewing the accounting issues above. Build success does not mean those behaviors are verified.
