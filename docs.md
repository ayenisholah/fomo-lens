> Dated upstream reference retained on 2026-09-13. API claims below are preserved as supplied, not current application or release-status claims. See [HANDOFF.md](HANDOFF.md) and [contract notes](docs/fomolens-contract-notes.md) for the implementation checkpoint.

# Unofficial fomo.family API — Developer documentation

Integrate FomoLens wallet identity lookups, stored profiles, observed social connections and sampled PnL using cURL, JavaScript or Python. Independent product. Not affiliated with fomo.family.

Public testing: trials require manual approval and signup grants no credits. Paid checkout, live API reads, customer WebSockets and scans are currently unavailable.

[Web documentation](https://fomolens.app/docs) · [OpenAPI JSON](https://fomolens.app/openapi.json) · [Authenticated playground](https://fomolens.app/dashboard)

## API quickstart: your first wallet lookup

Try [free public lookup](https://fomolens.app/lookup) by typing at least two FOMO handle characters and selecting one of up to six matching stored users, or by submitting an exact handle or Solana/EVM wallet address. Suggestions contain only a handle, display name and optional image; selecting one runs the normal wallet lookup. Exact wallet-result requests share a site-wide limit of one request every ten seconds, plus the same per-IP limit. Suggestions have separate site-wide and per-IP limits. Both return stored data without refreshing it. Accepted requests count toward the limit even when no result is found or an error occurs. Honor `Retry-After`; no automatic retries run. Free lookups do not grant credits, trial access or paid API unlocks.

Use free wallet lookup directly on the [homepage](https://fomolens.app/) or the dedicated [lookup page](https://fomolens.app/lookup). Explore the [example playground](https://fomolens.app/playground) without a key or credit charge; its responses are synthetic. The [trader leaderboard](https://fomolens.app/leaderboard) loads actual stored, sampled rankings only when you request a page with an authenticated account: up to ten rows for at most one credit, with each row’s observation time. Rows include stored profile images, follower counts, trade counts and `profileObservedAt`. These profile totals are independent of the selected PnL window. Open row details for exact amounts and observation dates; trader links prefill the free lookup without running a request. It does not automatically refresh or trigger a new source sample. Coverage may be incomplete and pages are not a consistent snapshot.

Verify your email and [request trial approval](https://fomolens.app/trial). Data requests require an active term and sufficient credits; signup alone provides neither. Create a key under Dashboard → API keys. Set `FOMOLENS_URL` (or `baseUrl` below) to `https://api.fomolens.app`. The versioned API base is `https://api.fomolens.app/api/v1`.

```bash
curl "$FOMOLENS_URL/api/v1/users/example_trader/wallets" \
  -H "Authorization: Bearer $FOMOLENS_KEY" \
  -H "Idempotency-Key: lookup-example-0001"
```

```javascript
const response = await fetch(`${baseUrl}/api/v1/users/example_trader/wallets`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Idempotency-Key": crypto.randomUUID(),
  },
});
if (!response.ok) throw new Error((await response.json()).error);
const { mappings } = await response.json();
```

```python
import os, uuid, requests
r = requests.get(
    os.environ["FOMOLENS_URL"] + "/api/v1/users/example_trader/wallets",
    headers={"Authorization": "Bearer " + os.environ["FOMOLENS_KEY"],
             "Idempotency-Key": str(uuid.uuid4())}, timeout=65)
r.raise_for_status()
print(r.json()["mappings"])
```

## Authentication

Versioned research API operations require a bearer API key or an authenticated dashboard session. The [free public lookup](https://fomolens.app/lookup) is a separate main-website exception: no account, credits or API key. Keys are secrets: use them on your server, never in public frontend code or URLs. Rotating keys does not reset your account’s credits or limits.

The API subdomain accepts customer API keys, not browser-session cookies. Login, billing and administration stay on fomolens.app. Both hosts share the same account-wide metering; using another hostname never creates a second allowance.

Send a unique `Idempotency-Key` for each intended operation. Retry the identical URL with that key to recover its response without another charge for up to 24 hours. A reused key with different parameters returns 409. After an abandoned request is released, create a new key to retry.

## Predictable credits

Handle-to-wallet matches cost 10 credits; reverse wallet-to-user matches cost 100. Lookup misses cost 1 credit. Each new request is charged, including repeat lookups; identical idempotent retries are free for 24 hours. A stored profile costs 1 credit; stored PnL costs 2. Social and leaderboard pages cost one credit per ten returned records, rounded up per page.

Live requests cost 20 credits plus applicable list-row credits. Snapshot points are included in the base cost. The service reserves a maximum before work and releases the unused amount. Technical failures cost zero credits; lookup misses can cost 1 credit, while attempt and rate limits still apply. A manually approved seven-day trial includes 100 credits and at most two live attempts.

Signup grants no free credits. [Request a trial through Telegram](https://fomolens.app/trial) using your verified account email. Once checkout opens, paid plans will be available without trial approval.

Responses include `X-Credits-Cost`, `X-Credits-Remaining`, and `X-Request-Id`. Collection budgets count distinct identities across every route, key, and browser session. Credit top-ups do not increase those budgets.

[All plans, limits, and credit packs →](https://fomolens.app/pricing)

## Wallet lookup, profiles, social connections and PnL

- GET `/users/{subject}` — Basic profile by exact handle or UUID · 1 credit
- GET `/users/{subject}/wallets` — Available Solana and EVM wallet identities · 10 credits on a match
- GET `/wallets?address={address}` — Reverse wallet-to-identity lookup · 100 credits on a match; 1 on a lookup miss
- GET `/users/{subject}/pnl` — Stored all-time, 24h, 7d, and 30d PnL · 2 credits
- GET `/users/{subject}/followers` — Locally observed followers · paginated
- GET `/users/{subject}/following` — Observed following connections · paginated
- GET `/leaderboard?window=all` — Sampled leaderboard: all, 24h, 7d, or 30d

A wallet result has `walletFamily`, `walletAddress`, `userId`, and `userHandle`. User ID and handle can be null. Responses contain `count` and `mappings`.

## Pagination and collection limits

Local lists default to 25 records. Trials allow at most 25 per page; paid accounts allow 100. Pass `nextCursor` to the same endpoint with the same parameters while `hasMore` is true. Cursors belong to your account and expire after 24 hours. `count` always means records in this response.

`planLimitReached` explicitly identifies a plan’s browsing boundary. Leaderboard depth is 100 / 1,000 / 10,000 / 100,000 for Trial / Starter / Growth / Scale. Trial social pages reach 100 edges per subject and direction. Every route contributes to shared daily, term, and cumulative identity budgets.

## Build with FomoLens

Bring FOMO data into the bots and apps you already use. These are illustrative app concepts, not existing customer integrations. All examples use stored-data endpoints and synthetic handles. Monitoring, notifications and trade execution belong to your own integrations.

Use this server-side JavaScript helper with each recipe. Set FOMOLENS_KEY privately on your server. Each call creates a new billable operation. For retry handling, create a request key outside the helper and pass it as the second argument; retain that key and identical path for the retry. Honor Retry-After and use backoff as described in [Errors & retries](https://fomolens.app/docs#errors). These snippets make no automatic retries or scheduled calls.

```javascript
const apiKey = process.env.FOMOLENS_KEY;
if (!apiKey) throw new Error("Set FOMOLENS_KEY on your server");
async function research(path, requestKey = crypto.randomUUID()) {
  const response = await fetch("https://api.fomolens.app/api/v1" + path, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": requestKey,
    },
    signal: AbortSignal.timeout(65000),
  });
  if (!response.ok)
    throw new Error(`FomoLens request failed: ${response.status}`);
  return response.json();
}
```

### FOMO social discovery

Request a small following page for a selected handle, then enrich one returned user with their stored profile and PnL. Follow signed pagination only when you need another page.

```javascript
const connections = await research("/users/example_trader/following?limit=5");
const candidate = connections.rows[0];
if (candidate?.id) {
  const profile = await research(`/users/${candidate.id}`);
  const pnl = await research(`/users/${candidate.id}/pnl`);
  console.log({ profile, pnl }); // Render your discovery card.
}
```

Up to 4 credits for this successful example: 1 for up to five connections, 1 for a profile and 2 for PnL. Enrich only the traders your user selects.

The observed graph can be incomplete. An incoming follower list has different freshness from a subject’s own following list; show the returned coverage context.

### Custom FOMO signals

Read a bounded leaderboard page, select a trader, and evaluate their stored PnL against your own rule. Your application owns scheduling, comparisons with prior observations and downstream decisions.

```javascript
const board = await research("/leaderboard?window=7d&limit=5");
const trader = board.rows[0];
if (trader?.id) {
  const sample = await research(`/users/${trader.id}/pnl`);
  const value = sample.windows?.["7d"]?.pnl;
  console.log({
    kind: "research",
    userId: trader.id,
    sampledAt: sample.fetchedAt,
    ruleMatched: typeof value === "number" && value > 100,
  }); // Input to your own workflow, not a trade instruction.
}
```

Up to 3 credits for this successful example: 1 for up to five leaderboard rows and 2 for one trader’s PnL. Every fresh scheduled request is billable.

These are stored platform samples, not instant trade alerts. Check fetchedAt and reject stale or missing samples under your strategy’s rules. Live reads and customer WebSockets are currently unavailable.

### Copy-trading watchlist

Resolve a user-selected handle to available wallets and read their sampled PnL. Present the results for review before connecting that watchlist to your separately operated trading tools.

```javascript
const subject = encodeURIComponent("example_trader");
const { mappings } = await research(`/users/${subject}/wallets`);
if (mappings.length) {
  const pnl = await research(`/users/${subject}/pnl`);
  console.log({ mappings, pnl }); // Review in your watchlist UI.
} else {
  console.log("No wallet mapping is available.");
}
```

12 credits for a successful wallet match followed by PnL: 10 + 2. A wallet lookup miss costs 1 credit; this example skips PnL when no mapping is returned.

FomoLens supplies research data, not trade execution. Wallet mappings can change or become unavailable. Your own integrations must independently monitor activity, obtain trading authorization and execute trades; the dashboard trade preview is separate from API access.

### Discord / Telegram research bot

Validate a handle from your bot command, fetch its stored profile and PnL on your server, and format a bounded research reply. Connect the reply to your own Discord or Telegram integration.

```javascript
const handle = "example_trader"; // Validate your command input.
const subject = encodeURIComponent(handle);
const profile = await research(`/users/${subject}`);
const pnl = await research(`/users/${subject}/pnl`);
const reply = {
  handle: profile.userHandle,
  name: profile.displayName,
  sampledPnl: pnl.windows,
  sampledAt: pnl.fetchedAt,
};
console.log(reply); // Format and send through your own bot integration.
```

3 credits per successful profile + PnL command. Set per-user command limits in your bot; all commands share your FomoLens account’s credits and request allowance.

Keep the API key on your server and escape user-derived text for your chat platform. Display sampling context, respect account collection limits and the terms of use; the API does not include full-dataset extraction or resale.

## Live API reads — currently unavailable

The following operations document the gated interface under `/live`; live API reads are currently unavailable. User operations take an `id` UUID; trade details take a trade ID. Snapshots require one `range=24h|7d|30d`. Token search takes `phrase`, token details take `tokenId`, and theses require `token` plus `networkId`.

- GET `/live/profile` — Current profile
- GET `/live/pnl` — Current all-time PnL
- GET `/live/snapshots` — PnL snapshots
- GET `/live/trades` — Recent closed trades
- GET `/live/trade` — Trade details
- GET `/live/swaps` — Recent swaps
- GET `/live/holdings` — Current holdings
- GET `/live/tokenSearch` — Search tokens
- GET `/live/token` — Token details
- GET `/live/trending` — Trending tokens
- GET `/live/mostHeld` — Most-held tokens
- GET `/live/graduated` — Graduated tokens
- GET `/live/theses` — Token theses

Live access depends on available capacity. A successful response identifies the operation and fetch time. Histories may be capped by the source; an empty or short result is not proof of exhaustive coverage. Wallet addresses, raw transaction identifiers, personalized account data, and unrecognized fields are excluded from live results. Live history currently returns the initial bounded page only; raw source cursors are not accepted. Signed pagination applies to stored social lists and leaderboards.

## Errors and retries

Errors use `{"error":"error_code"}`.

| Status | Meaning                                     |
| ------ | ------------------------------------------- |
| 400    | Invalid input                               |
| 401    | Missing or invalid authentication           |
| 402    | Insufficient credits for reservation        |
| 403    | Plan, account review, or collection limit   |
| 404    | Not found or not observed                   |
| 409    | Idempotency conflict or request in progress |
| 429    | Rate or concurrency limit                   |
| 503    | Service or live source unavailable          |

Respect `Retry-After` on 429 and 503. Retry with backoff and the same idempotency key when recovering a completed request. Do not rotate keys to evade limits.

## Response headers and request limits

FomoLens returns its own JSON and billing metadata, not source response headers. Research responses are private and not cacheable. Infrastructure may add transport and security headers.

Authenticated API attempts share a fixed 60-second account budget across keys, stored/live reads, scan routes and both hosts: Trial 10, Starter 60, Growth 300, Scale 600 requests. Retries still consume request allowance even when no additional credits are charged. Live operations and scan creation have additional, narrower limits.

`X-RateLimit-Limit` is the checked allowance; `X-RateLimit-Remaining` is the remaining snapshot after this attempt; `X-RateLimit-Reset` is the reset time in Unix seconds. A narrower limiting bucket may report its own values. Authentication denials and edge limits may omit account metadata. On 429 or 503, honor `Retry-After` when present and retry with backoff; rotating keys cannot bypass a limit.

## Understand what the data means

The public `/api/public/coverage` endpoint returns aggregate counts of users included in current wallet coverage. Solana and EVM counts overlap. Counts refresh every minute; snapshots older than five minutes are marked unavailable.

The dashboard Live feed includes five 60-second sessions per UTC day for approved active trials and active paid accounts, with up to 100 supported on-chain FOMO trades per session and no credit charge. Coverage includes Solana trades and selected EVM buys; unsupported trades are excluded. Collection runs only while viewers are connected and automatically goes idle when nobody is watching. It shows usernames, logos and available amounts with their currency labels, without wallet addresses or transaction references. Reloading does not reset the timer; stopping does not refund a session. When the trade value is unavailable, a known token quantity is still shown as bought or sold. “Trade value unavailable” means the cost or proceeds are missing; “Trade amount unavailable” means neither a value nor a token quantity is available. Events may be delayed or incomplete. This preview is separate from the API stream. Wallet-activity WebSockets are in testing and are not yet available to subscribe. They are not a complete trade feed. Background paid discovery is not enabled; a missing wallet mapping does not yet start or charge for a scan. The experimental `/api/v1/scans` quote and order routes require a supported matcher and explicit consent. Once available, accepted work costs 5 credits, with a further 10 forward or 100 reverse match credits plus a 25-credit discovery premium only on success. Available results found before work starts pay only the normal match fee. Orders expose status, retry timing and cancellation; unused held credits are released.

Follower lists describe the locally observed graph, which may be smaller than the platform’s displayed count. Following lists reflect completed observations. A subject’s own walk timestamp does not describe the freshness of all its incoming followers.

PnL is sampled from Fomo; it is not an independently calculated on-chain return. Leaderboards combine point samples taken at different times. Rankings can change between pages. Wallet mappings may change or become unavailable, including during an unlock period.

Data access permits bounded research and application use. It does not include full-dataset extraction or resale. See the terms for usage restrictions.

## Common questions about the unofficial Fomo API

### Is this the official fomo.family API?

No. FomoLens is an independent product and is not affiliated with, endorsed by or sponsored by fomo.family.

### How do I get API access?

Verify your account email, [request a trial](https://fomolens.app/trial), and wait for manual approval. Approved trials receive 100 credits for seven days. Signup grants no credits. Paid checkout is currently unavailable.

### What trader data can I query?

Query available wallet identities, stored profiles, observed followers and following connections, sampled PnL and leaderboards. See the [stored-data endpoints](https://fomolens.app/docs#identity) and [coverage limitations](https://fomolens.app/docs#coverage).

### What does a wallet lookup return?

Each record includes the wallet family, address, user ID and handle. Coverage is incomplete and records may change.

### Can I subscribe to a live trade API?

Customer WebSockets and live API reads are currently unavailable. The included dashboard trade preview for active accounts is separate and does not expose wallet addresses or transaction references.

## Complete API reference

FomoLens is an independent, unofficial fomo.family API for wallet identities, stored profiles, observed social connections and sampled PnL. Not affiliated with fomo.family. Versioned API testing requires manually approved trial access; signup grants no credits. Paid checkout, live API reads, customer WebSockets and scans are currently unavailable. Send Idempotency-Key to safely retry an identical request within 24 hours. Free public lookup on the main website offers separately paced, bounded stored-user suggestions and a shared ten-second wallet-result allowance. No full-dataset export is offered.

API version: 1.0.0. [OpenAPI JSON](https://fomolens.app/openapi.json).

Live reads and scans below document unavailable interfaces. Their inclusion does not enable access.

### GET /api/public/coverage

Request URL: `https://api.fomolens.app/api/public/coverage`

Current aggregate wallet coverage; no identity records

#### Request

```json
{
  "security": [],
  "servers": [
    {
      "url": "/"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "available=false when missing or older than five minutes; otherwise matchedUsers (distinct users), solanaMappings, evmMappings and observedAt. Families overlap; do not add their counts to estimate users."
}
```

### POST /api/public/lookup

Request URL: `https://fomolens.app/api/public/lookup`

Free public handle or wallet lookup · no credits

#### Request

```json
{
  "description": "Main website only. Requires Origin: https://fomolens.app. Send exactly one handle or address. Both directions share a persistent one-request-per-ten-seconds global allowance and per-IP allowance. Misses and failed admitted requests consume the interval. No automatic retries or idempotency replay. Uses current stored mappings; does not trigger upstream refresh. Profile statistics are stored totals. No account grant or API unlock is created.",
  "security": [],
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "oneOf": [
            {
              "type": "object",
              "additionalProperties": false,
              "required": ["handle"],
              "properties": {
                "handle": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 101
                }
              }
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": ["address"],
              "properties": {
                "address": {
                  "type": "string",
                  "minLength": 32,
                  "maxLength": 44
                }
              }
            }
          ]
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://fomolens.app"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Current stored result or empty mappings. Private, no-store. Zero credit cost.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/PublicLookupResult"
      }
    }
  }
}
```

Response headers: header set 1 (defined below).

Status `400`

```json
{
  "description": "Invalid handle/address, or more than one lookup input."
}
```

Status `403`

```json
{
  "description": "Invalid request origin."
}
```

Status `413`

```json
{
  "description": "Body exceeds 512 bytes."
}
```

Status `415`

```json
{
  "description": "JSON content type required."
}
```

Status `429`

```json
{
  "description": "Shared or per-IP cooldown."
}
```

Response headers: header set 2 (defined below).

Status `503`

```json
{
  "description": "Lookup unavailable or disabled. An admitted source failure does not refund its interval."
}
```

### GET /users/{subject}

Request URL: `https://api.fomolens.app/api/v1/users/{subject}`

Stored profile · 1 credit

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "subject",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string"
      },
      "description": "Exact Fomo handle or user UUID."
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/ProfileSummary"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /users/{subject}/wallets

Request URL: `https://api.fomolens.app/api/v1/users/{subject}/wallets`

Handle to wallet · 10 credits per match, 1 on a lookup miss

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "subject",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string"
      },
      "description": "Exact Fomo handle or user UUID."
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/WalletResults"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /wallets

Request URL: `https://api.fomolens.app/api/v1/wallets`

Reverse wallet identity lookup · 100 credits per match, 1 on a lookup miss

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "address",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/WalletResults"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /users/{subject}/pnl

Request URL: `https://api.fomolens.app/api/v1/users/{subject}/pnl`

Sampled PnL across four windows · 2 credits

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "subject",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string"
      },
      "description": "Exact Fomo handle or user UUID."
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Pnl"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /users/{subject}/followers

Request URL: `https://api.fomolens.app/api/v1/users/{subject}/followers`

Observed followers · 1 credit per 10 returned rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "subject",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string"
      },
      "description": "Exact Fomo handle or user UUID."
    },
    {
      "name": "limit",
      "in": "query",
      "schema": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100,
        "default": 25
      },
      "description": "Trial maximum 25."
    },
    {
      "name": "cursor",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "description": "Signed continuation token from this account."
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Page"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /users/{subject}/following

Request URL: `https://api.fomolens.app/api/v1/users/{subject}/following`

Observed following · 1 credit per 10 returned rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "subject",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string"
      },
      "description": "Exact Fomo handle or user UUID."
    },
    {
      "name": "limit",
      "in": "query",
      "schema": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100,
        "default": 25
      },
      "description": "Trial maximum 25."
    },
    {
      "name": "cursor",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "description": "Signed continuation token from this account."
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Page"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /leaderboard

Request URL: `https://api.fomolens.app/api/v1/leaderboard`

Sampled PnL rankings · 1 credit per 10 returned rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "limit",
      "in": "query",
      "schema": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100,
        "default": 25
      },
      "description": "Trial maximum 25."
    },
    {
      "name": "cursor",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "description": "Signed continuation token from this account."
    },
    {
      "name": "window",
      "in": "query",
      "schema": {
        "type": "string",
        "enum": ["all", "24h", "7d", "30d"],
        "default": "all"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/LeaderboardPage"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/profile

Request URL: `https://api.fomolens.app/api/v1/live/profile`

Current profile · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/pnl

Request URL: `https://api.fomolens.app/api/v1/live/pnl`

Current all-time PnL · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/snapshots

Request URL: `https://api.fomolens.app/api/v1/live/snapshots`

PnL snapshots · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    },
    {
      "name": "range",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string",
        "enum": ["24h", "7d", "30d"]
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/trades

Request URL: `https://api.fomolens.app/api/v1/live/trades`

Recent closed trades · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/trade

Request URL: `https://api.fomolens.app/api/v1/live/trade`

Trade details · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/swaps

Request URL: `https://api.fomolens.app/api/v1/live/swaps`

Recent swaps · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/holdings

Request URL: `https://api.fomolens.app/api/v1/live/holdings`

Current holdings · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/tokenSearch

Request URL: `https://api.fomolens.app/api/v1/live/tokenSearch`

Search tokens · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "phrase",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string",
        "maxLength": 100
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/token

Request URL: `https://api.fomolens.app/api/v1/live/token`

Token details · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "tokenId",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/trending

Request URL: `https://api.fomolens.app/api/v1/live/trending`

Trending tokens · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/mostHeld

Request URL: `https://api.fomolens.app/api/v1/live/mostHeld`

Most-held tokens · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/graduated

Request URL: `https://api.fomolens.app/api/v1/live/graduated`

Graduated tokens · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /live/theses

Request URL: `https://api.fomolens.app/api/v1/live/theses`

Token theses · 20 credits plus list rows

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "token",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    },
    {
      "name": "networkId",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### GET /scans

Request URL: `https://api.fomolens.app/api/v1/scans`

Experimental discovery quote; available=false until a validated matcher supports the target

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "direction",
      "in": "query",
      "required": true,
      "schema": {
        "enum": ["user_to_wallet", "wallet_to_user"]
      }
    },
    {
      "name": "family",
      "in": "query",
      "required": true,
      "schema": {
        "enum": ["evm", "solana"]
      }
    },
    {
      "name": "value",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### POST /scans

Request URL: `https://api.fomolens.app/api/v1/scans`

Explicitly consent to a bounded discovery order; disabled without matching support

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "Idempotency-Key",
      "in": "header",
      "required": true,
      "schema": {
        "type": "string",
        "minLength": 8,
        "maxLength": 100
      }
    }
  ],
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "required": ["target", "consent", "maxCredits"],
          "properties": {
            "target": {
              "type": "object",
              "required": ["direction", "family", "value"],
              "properties": {
                "direction": {
                  "enum": ["user_to_wallet", "wallet_to_user"]
                },
                "family": {
                  "enum": ["evm", "solana"]
                },
                "value": {
                  "type": "string"
                }
              }
            },
            "consent": {
              "const": true
            },
            "maxCredits": {
              "type": "integer",
              "minimum": 40
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `202`

```json
{
  "description": "Order accepted; Retry-After 30. Hold is not a charge. See quote for fixed startup and success fees."
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication or access required"
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Authentication or access required"
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited"
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Matching unavailable; no hold or fee"
}
```

Response headers: header set 4 (defined below).

### GET /scans/{id}

Request URL: `https://api.fomolens.app/api/v1/scans/{id}`

Discovery status; matched results recheck current identity policy

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string",
        "format": "uuid"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Successful response. Billing is reported in X-Credits-Cost and X-Credits-Remaining headers.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/DataResponse"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `400`

```json
{
  "description": "Invalid parameters",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication required",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `402`

```json
{
  "description": "Insufficient credits",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Account, plan, or collection limit",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Not found or not yet observed",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `409`

```json
{
  "description": "Idempotency conflict",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable; see Retry-After",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/Error"
      }
    }
  }
}
```

Response headers: header set 4 (defined below).

### DELETE /scans/{id}

Request URL: `https://api.fomolens.app/api/v1/scans/{id}`

Cancel discovery and release unused held credits

#### Request

```json
{
  "security": [
    {
      "BearerKey": []
    }
  ],
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string",
        "format": "uuid"
      }
    }
  ],
  "servers": [
    {
      "url": "https://api.fomolens.app/api/v1",
      "description": "Customer API"
    },
    {
      "url": "/api/v1",
      "description": "Same-origin compatibility"
    }
  ]
}
```

#### Responses

Status `200`

```json
{
  "description": "Terminal order state; accepted work fee is retained unless no work occurred"
}
```

Response headers: header set 3 (defined below).

Status `401`

```json
{
  "description": "Authentication or access required"
}
```

Response headers: header set 3 (defined below).

Status `403`

```json
{
  "description": "Authentication or access required"
}
```

Response headers: header set 3 (defined below).

Status `404`

```json
{
  "description": "Order not found for this account"
}
```

Response headers: header set 3 (defined below).

Status `429`

```json
{
  "description": "Rate limited"
}
```

Response headers: header set 4 (defined below).

Status `503`

```json
{
  "description": "Temporarily unavailable"
}
```

Response headers: header set 4 (defined below).

### Response header set 1

```json
{
  "X-Credits-Cost": {
    "schema": {
      "const": 0
    }
  },
  "X-RateLimit-Reset": {
    "description": "Next possible admission, Unix seconds; other visitors may take it first.",
    "schema": {
      "type": "integer"
    }
  }
}
```

### Response header set 2

```json
{
  "Retry-After": {
    "schema": {
      "type": "integer",
      "minimum": 1
    }
  }
}
```

### Response header set 3

```json
{
  "X-RateLimit-Limit": {
    "description": "FomoLens request budget in the current fixed window; shared across this account's keys and hosts. Present only when a corresponding application budget was checked.",
    "schema": {
      "type": "integer",
      "minimum": 0
    }
  },
  "X-RateLimit-Remaining": {
    "description": "Remaining requests after this attempt; snapshot only. Present only when a corresponding application budget was checked.",
    "schema": {
      "type": "integer",
      "minimum": 0
    }
  },
  "X-RateLimit-Reset": {
    "description": "Window reset as Unix seconds. The shared plan window is 60 seconds; a narrower limiter can report its own window. Present only when a corresponding application budget was checked.",
    "schema": {
      "type": "integer",
      "minimum": 0
    }
  }
}
```

### Response header set 4

```json
{
  "X-RateLimit-Limit": {
    "description": "FomoLens request budget in the current fixed window; shared across this account's keys and hosts. Present only when a corresponding application budget was checked.",
    "schema": {
      "type": "integer",
      "minimum": 0
    }
  },
  "X-RateLimit-Remaining": {
    "description": "Remaining requests after this attempt; snapshot only. Present only when a corresponding application budget was checked.",
    "schema": {
      "type": "integer",
      "minimum": 0
    }
  },
  "X-RateLimit-Reset": {
    "description": "Window reset as Unix seconds. The shared plan window is 60 seconds; a narrower limiter can report its own window. Present only when a corresponding application budget was checked.",
    "schema": {
      "type": "integer",
      "minimum": 0
    }
  },
  "Retry-After": {
    "description": "FomoLens retry delay in seconds when available. Honor it before retrying.",
    "schema": {
      "type": "integer",
      "minimum": 1
    }
  }
}
```

## Authentication schemes

```json
{
  "BearerKey": {
    "type": "http",
    "scheme": "bearer",
    "bearerFormat": "FomoLens API key"
  }
}
```

## Response schemas

Schema references beginning with #/components/schemas/ refer to the named definitions below.

### Error

```json
{
  "type": "object",
  "required": ["error"],
  "additionalProperties": false,
  "properties": {
    "error": {
      "type": "string"
    }
  }
}
```

### PublicLookupProfile

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "userHandle": {
      "type": ["string", "null"]
    },
    "displayName": {
      "type": ["string", "null"]
    },
    "profilePictureLink": {
      "type": ["string", "null"]
    },
    "followers": {
      "type": ["number", "null"]
    },
    "numTrades": {
      "type": ["number", "null"]
    }
  }
}
```

### PublicLookupResult

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["count", "mappings", "profile"],
  "properties": {
    "count": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2
    },
    "mappings": {
      "type": "array",
      "maxItems": 2,
      "items": {
        "$ref": "#/components/schemas/WalletMatch"
      }
    },
    "profile": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/PublicLookupProfile"
        },
        {
          "type": "null"
        }
      ]
    }
  }
}
```

### ProfileSummary

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "userHandle": {
      "type": ["string", "null"]
    },
    "displayName": {
      "type": ["string", "null"]
    },
    "description": {
      "type": ["string", "null"]
    },
    "profilePictureLink": {
      "type": ["string", "null"]
    },
    "createdAt": {
      "type": ["string", "null"]
    },
    "observedAt": {
      "type": ["string", "null"]
    },
    "followers": {
      "type": ["number", "null"]
    },
    "following": {
      "type": ["number", "null"]
    },
    "numTrades": {
      "type": ["number", "null"]
    },
    "swapCount": {
      "type": ["number", "null"]
    },
    "totalVolume": {
      "type": ["number", "null"]
    }
  }
}
```

### WalletMatch

```json
{
  "type": "object",
  "required": ["walletFamily", "walletAddress", "userId", "userHandle"],
  "additionalProperties": false,
  "properties": {
    "walletFamily": {
      "enum": ["solana", "evm"]
    },
    "walletAddress": {
      "type": "string"
    },
    "userId": {
      "type": ["string", "null"]
    },
    "userHandle": {
      "type": ["string", "null"]
    }
  }
}
```

### WalletResults

```json
{
  "type": "object",
  "required": ["count", "mappings"],
  "additionalProperties": false,
  "properties": {
    "count": {
      "type": "integer"
    },
    "mappings": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/WalletMatch"
      }
    }
  }
}
```

### Pnl

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "userId": {
      "type": "string"
    },
    "fetchedAt": {
      "type": "string",
      "format": "date-time"
    },
    "windows": {
      "type": "object",
      "properties": {
        "all": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "pnl": {
              "type": "number"
            },
            "rank": {
              "type": ["number", "null"]
            }
          }
        },
        "24h": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "pnl": {
              "type": "number"
            },
            "rank": {
              "type": ["number", "null"]
            }
          }
        },
        "7d": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "pnl": {
              "type": "number"
            },
            "rank": {
              "type": ["number", "null"]
            }
          }
        },
        "30d": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "pnl": {
              "type": "number"
            },
            "rank": {
              "type": ["number", "null"]
            }
          }
        }
      }
    }
  }
}
```

### LeaderboardRow

```json
{
  "type": "object",
  "additionalProperties": false,
  "description": "PnL is a per-user point sample for the requested window. Followers and numTrades are independently observed profile totals, not window-specific metrics. Profile images may be unavailable.",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "userHandle": {
      "type": ["string", "null"]
    },
    "displayName": {
      "type": ["string", "null"]
    },
    "pnl": {
      "type": ["number", "null"]
    },
    "rank": {
      "type": ["number", "null"]
    },
    "position": {
      "type": "integer"
    },
    "fetchedAt": {
      "type": ["string", "null"]
    },
    "profilePictureLink": {
      "type": ["string", "null"]
    },
    "followers": {
      "type": ["number", "null"]
    },
    "numTrades": {
      "type": ["number", "null"]
    },
    "profileObservedAt": {
      "type": ["string", "null"]
    }
  }
}
```

### LeaderboardPage

```json
{
  "allOf": [
    {
      "$ref": "#/components/schemas/Page"
    },
    {
      "type": "object",
      "properties": {
        "rows": {
          "type": "array",
          "items": {
            "$ref": "#/components/schemas/LeaderboardRow"
          }
        }
      }
    }
  ]
}
```

### Page

```json
{
  "type": "object",
  "properties": {
    "count": {
      "type": "integer"
    },
    "rows": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "hasMore": {
      "type": "boolean"
    },
    "nextCursor": {
      "type": ["string", "null"]
    },
    "planLimitReached": {
      "type": "boolean"
    },
    "coverage": {
      "type": "string"
    },
    "consistentSnapshot": {
      "type": "boolean"
    },
    "subjectLastWalkAt": {
      "type": ["string", "null"]
    },
    "window": {
      "enum": ["all", "24h", "7d", "30d"]
    }
  }
}
```

### DataResponse

```json
{
  "type": "object",
  "description": "Projected operation-specific research data; no raw account or wallet payloads.",
  "properties": {
    "operation": {
      "type": "string"
    },
    "fetchedAt": {
      "type": "string",
      "format": "date-time"
    },
    "coverage": {
      "const": "upstream_bounded"
    },
    "data": {
      "oneOf": [
        {
          "type": "object"
        },
        {
          "type": "array",
          "items": {
            "type": "object"
          }
        }
      ]
    }
  }
}
```
