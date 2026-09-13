# Persistent execution constraints

The user-approved implementation plan on 2026-09-13 supersedes the earlier unit-only checkpoint restrictions. Dependency installation without range upgrades, Node 24 static/build/source checks, isolated database/browser tests, email checks, native operational rehearsals, reviewed commits/push and deployment are authorized.

- Preserve existing work, intentional Docker removals, credentials, encryption identities, deletion ledgers and unrelated services.
- Never print secrets or commit private payloads, acceptance ledgers or generated artifacts.
- Public stored-mode launch is authorized after engineering checks pass, using the current provider key. Historical billing reconciliation is not a launch gate. Preserve 14 confirmed + 100 reserved = 114 exposure under the original acceptance-runner 120-credit ceiling. Do not run additional paid acceptance, clear locks automatically or repeat successful paid requests for evidence. Production user requests may consume provider credits.
- Verified users have free access with no application daily request or credit caps. Preserve usage accounting, owner-only reporting, concurrency one and explicit recovery.
- No new schema changes, destructive production database work, dependency-range upgrades or increased spending are authorized.
- Record actual verification outcomes and failures in docs/release-verification.md; earlier checkpoint evidence is historical.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
