# Fomo Lens

A multi-user research application for exploring trader identities, observed connections, wallet mappings, and sampled PnL.

Free access for every verified user, with no application daily request or credit caps. One stored research request can run at a time; provider availability restrictions still apply. See [release verification](docs/release-verification.md) for CI, deployment and retained acceptance limitations.

## Stack

Next.js 16.3.4 App Router, strict TypeScript, React, Tailwind CSS, Prisma, PostgreSQL, Zod, Resend, and React Flow. Dependencies are installed from the committed lockfile. The original prototype is archived in `prototype/` and is not served by the application.

## Local setup

Use Node 24 and a dedicated PostgreSQL database. Preserve existing `.env` values.

```sh
npm ci
npm run setup
# Configure the dedicated database and email settings in .env.
npm run db:migrate
npm run dev
```

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

GitHub CI checks pull requests and main on hosted Node 24 runners. Successful main checks automatically deploy their tested artifact through a dedicated restricted SSH account. Manual deployment accepts a successful main CI run ID. Native systemd/Nginx, encrypted backup restoration and code rollback have been rehearsed. See [operations notes](docs/operations.md).

Runtime credentials belong in protected environment files, separately from release directories. Provider keys can be rotated without rebuilding.
