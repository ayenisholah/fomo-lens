# Fomo Lens

A multi-user research application for exploring trader identities, observed connections, wallet mappings, and sampled PnL.

**Development checkpoint, not a verified release.** Implementation is complete for this constrained checkpoint; `npm install` completed successfully and `npm run test` passed 91 tests across 9 files. Browser, integration, build and production checks remain unverified. See [HANDOFF.md](HANDOFF.md) for current status and interruption recovery, and [release verification](docs/release-verification.md) for actual outcomes.

## Stack

Next.js 16.3.4 App Router, strict TypeScript, React, Tailwind CSS, Prisma, PostgreSQL, Zod, Resend, and React Flow. Dependencies are installed from the committed lockfile. The original prototype is archived in `prototype/` and is not served by the application.

## Local setup

Use Node.js 22.12+ (Node 24 LTS recommended) and an existing PostgreSQL server.

Dependencies and Prisma generation are complete. The only authorized verification command is:

```sh
npm run test
```

Existing `.env` values must be preserved. Other setup, migration, dev/start, build and release commands documented below are reference material, not instructions to execute in this session.

Open http://localhost:3000. Public synthetic workspace: http://localhost:3000/example. Production uses native systemd and Nginx; Docker is not required.

`npm run setup` creates independent random secrets without replacing an existing `.env`. Development email capture requires both `DEV_EMAIL_SIMULATION=true` and an absolute private `TEST_MAIL_DIR`. Read its challenge JSON files locally; they are never exposed through an HTTP endpoint. This mode is prohibited in production.

## Data modes

- `example` (default): deterministic synthetic data; no upstream research calls.
- `stored`: requires an API key and email verification. The official wire adapter is implemented; production acceptance is pending. The authoritative docs and schemas have now been located; see [contract notes](docs/fomolens-contract-notes.md).

Signing up to Fomo Lens creates no Fomolens account or allowance. No wallet connection, trade execution, scanning, polling, or background enrichment is included.

## Commands

`npm run lint`, `npm run typecheck`, `npm run build`, `npm run scan:secrets`.

`npm run release:check` defines the intended full gate, including unit, PostgreSQL integration, and browser tests. Unit, isolated PostgreSQL integration and browser acceptance suites are included. Set TEST_DATABASE_URL to a dedicated fomo_lens_test database.

Maintenance: `npm run maintenance`. Delete an account: `npm run account:delete -- email@example.com --confirm`. Review both scripts before production use.

## Deployment

Native systemd/Nginx scripts are provided in `ops/`. They have not been production rehearsed. The production handoff requires server access, domain/DNS, a verified Resend sender, runtime secrets, and encrypted local backups. See [operations notes](docs/operations.md).

Runtime credentials belong in protected environment files, separately from release directories. No credential or deployment state was reverified in this continuation.
