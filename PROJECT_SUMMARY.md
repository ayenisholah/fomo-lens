> Approved free-access plan (2026-09-13): no application request/credit caps. Current-key public launch is authorized after engineering checks. Historical billing restrictions below are superseded; preserve the private ledger and acceptance ceiling, and do not run paid acceptance automatically.

# Fomo Lens status — 2026-09-13

Implementation is complete for the constrained checkpoint; release verification remains blocked. The preserved Next.js/React application includes public synthetic research, verified-user access, owner administration, graph/list exploration, wallet lookup, PnL windows, comparison, leaderboard pagination, shared selections and private history.

`src/lib/wire.ts` implements the decoder and `src/lib/upstream.ts` supplies a populated stored-dispatch adapter. Native Node/systemd/PostgreSQL/Nginx operations replace the older Docker/Caddy drafts. Credentialed acceptance is incomplete: prior successful requests account for 14 credits and an unresolved reverse-wallet request retains 100 credits of exposure, against the original 120 ceiling.

This continuation unified ordinary/recovered result handling, preserved operation identity after lost responses, isolated metadata refresh failures, hardened acceptance-ledger persistence and validation, extracted scanner helpers and corrected native interruption/failure handling. Public routes, research payloads, design, email templates, immediate verified-user access, unlimited daily access with UTC usage accounting and concurrency one remain intact. No schema changes were made.

See [HANDOFF.md](HANDOFF.md), the [capability inventory](docs/capability-inventory.md) and [release checklist](docs/release-verification.md) for test results and exact pending gates. Unit tests establish mocked behavior only. No deployment, operational rehearsal or new paid acceptance occurred.
