# Changelog

## 2026-09-13 — Completed constrained implementation checkpoint

- Unified ordinary/recovered research application, page binding, stale-response suppression, lost-response identity retention and nonfatal metadata refresh.
- Added injected acceptance orchestration with ledger validation, conservative ceiling enforcement and failure-retained locks; extracted synthetic-testable secret scanner helpers and archive enumeration.
- Corrected Retry-After handling, retained-charge response status, signout error behavior and native switch interruption/restore reporting.
- Expanded mocked unit coverage; see current [release verification](docs/release-verification.md). Browser/integration definitions remain unexecuted.
- Wire decoder and stored adapter exist; native systemd/Nginx operations supersede Docker drafts. Release and authoritative billing gates remain blocked.

## 2026-09-10 — Historical initial implementation checkpoint

The following records the September 10 state only. Its pending decoder/Docker work and verification claims are superseded by the September 13 checkpoint above.

### Added

- Next.js 16.3.4 App Router foundation and strict TypeScript.
- React/Tailwind visual system, locally hosted Manrope, public landing and evidence/privacy pages.
- Email-code screens and server authentication/session foundations.
- Prisma schema and initial PostgreSQL migration for users, challenges, sessions, rate limits, operations, budgets, activity, and minimal retained accounting.
- Synthetic research workspace, React Flow graph, wallet controls, PnL tables, leaderboard pagination controls, comparison, and private history.
- Owner screen and access-management endpoint.
- Operation, cursor, budget, and injectable upstream transport foundations.
- Docker Compose/Caddy and maintenance/deployment/backup/restore/rollback drafts.
- Environment template, non-overwriting setup script, secret-pattern scanner, and handoff documentation.

### Changed

- Replaced the production prototype entry point; original files are archived under `prototype/`.
- Switched the planned Drizzle ORM to Prisma at the user's request.
- Deferred Docker installation and rehearsal to the future VPS at the user's request.
- Located authoritative Fomolens docs and OpenAPI after the user supplied documentation.

### Not yet complete

- Fomolens wire decoder and credentialed stored-mode verification; dispatch remains disabled.
- Automated acceptance suites, full security/accounting review, and deployment rehearsal.
- Production runtime configuration, verified email, domain/HTTPS, and off-server backup destination.

This is a resumable development checkpoint, not a production release.

### Checkpoint verification

Prisma generation, strict TypeScript, lint (two warnings), production build without runtime secrets, source secret-pattern scan, and ops shell syntax passed. Production dependencies have zero reported audit advisories; four high development/Prisma CLI advisories remain for review. Test suites and database/browser/container verification remain outstanding.
