# Lens Atlas status

Updated 2026-09-10.

Lens Atlas is an independent research application. This repository is an implementation checkpoint, not a completed or deployed release.

## Written

- Next.js App Router application with strict TypeScript, React, Tailwind, locally hosted Manrope, and the requested dark palette.
- Landing, methodology, privacy, email verification, synthetic workspace, and owner screens.
- React Flow graph, accessible connection list, explicit research controls, wallet lookup controls, four sampled PnL windows, comparison, and history UI.
- Prisma/PostgreSQL schema and initial SQL migration.
- Verification-code delivery, keyed hashes, atomic challenges, fixed seven-day sessions, request limits, session ownership, and owner checks.
- Durable research operation and budget code, signed cursors, and injectable transport boundary.
- Docker/Caddy, maintenance, backup, isolated restore, deployment, and rollback drafts.

Written code is not equivalent to verified behavior. See [HANDOFF.md](HANDOFF.md).

## Synthetic examples

Example identities and values are generated deterministically. No real trader results, fabricated time series, investment scores, or freshness claims are provided. Public shared examples are labeled synthetic.

## Upstream capabilities

The user supplied Fomolens documentation. Public documentation and OpenAPI were retrieved successfully. Stored routes, costs, billing headers, pagination parameters, and the replay duration are now documented in [contract notes](docs/fomolens-contract-notes.md).

The actual wire-to-application decoder remains unwritten. `verifiedContract` is intentionally `null`. No API key was received and no credentialed request was made. Stored mode is not verified.

## Verification and deployment

See the current checkpoint results in [HANDOFF.md](HANDOFF.md). Prisma generation, strict typechecking, lint (two warnings), a production build without secrets, source pattern scanning, and shell syntax checks passed. Full unit/integration/browser suites and release verification remain outstanding.

Docker is not installed locally and must not be installed locally at the user's request. An existing PostgreSQL 14.8 installation was detected but not started. A VPS will be supplied later. No production deployment, HTTPS, real email, off-server backup, or rollback rehearsal has occurred.

## Next

Complete adapter and security/accounting review, implement acceptance tests, finish local verification, then deploy and rehearse Docker operations on the provided server. No scope expansion is needed.
