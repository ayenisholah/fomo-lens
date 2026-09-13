# Lens Atlas

A multi-user research application for exploring trader identities, observed connections, wallet mappings, and sampled PnL.

**Development checkpoint, not a release.** The UI and server foundations compile and build; authentication, accounting, browser flows, and deployment still need verification. Start with [HANDOFF.md](HANDOFF.md) for the exact resume point.

## Stack

Next.js 16.3.4 App Router, strict TypeScript, React, Tailwind CSS, Prisma, PostgreSQL, Zod, Resend, and React Flow. Dependencies are installed from the committed lockfile. The original prototype is archived in `prototype/` and is not served by the application.

## Local setup

Use Node.js 22.12+ (Node 24 LTS recommended) and an existing PostgreSQL server.

```sh
npm ci
npm run setup
# Edit the protected, ignored .env: database, email delivery, owners.
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Public synthetic workspace: http://localhost:3000/example. Do not install Docker locally for this project; Docker verification will take place on the user's server.

`npm run setup` creates independent random secrets without replacing an existing `.env`. Development email capture requires both `DEV_EMAIL_SIMULATION=true` and an absolute private `TEST_MAIL_DIR`. Read its challenge JSON files locally; they are never exposed through an HTTP endpoint. This mode is prohibited in production.

## Data modes

- `example` (default): deterministic synthetic data; no upstream research calls.
- `stored`: requires an API key and explicit per-user approval. **Dispatch is currently disabled** because the documented wire adapter is not implemented. The authoritative docs and schemas have now been located; see [contract notes](docs/fomolens-contract-notes.md).

Signing up to Lens Atlas creates no Fomolens account or allowance. No wallet connection, trade execution, scanning, polling, or background enrichment is included.

## Commands

`npm run lint`, `npm run typecheck`, `npm run build`, `npm run scan:secrets`.

`npm run release:check` defines the intended full gate, including unit, PostgreSQL integration, and browser tests. **The test suites are not yet implemented; the release gate is not expected to pass at this checkpoint.**

Maintenance: `npm run maintenance`. Delete an account: `npm run account:delete -- email@example.com --confirm`. Review both scripts before production use.

## Deployment

Docker Compose/Caddy drafts are provided in `compose.yml`, `Dockerfile`, and `ops/`. They have not been run. The production handoff requires server access, domain/DNS, a verified Resend sender, runtime secrets, and encrypted off-server backups. See [operations notes](docs/operations.md).

No GitHub Actions, registry, or GitHub deployment secrets are required.
