# Fomolens integration resume notes

Retrieved 2026-09-10 from authoritative public endpoints:

- https://fomolens.app/docs
- https://fomolens.app/docs.md
- https://fomolens.app/openapi.json (OpenAPI 3.1.0, API version 1.0.0)

The user also pasted the complete public guide into the conversation. No authenticated research was performed.

## Confirmed protocol

Base: `https://api.fomolens.app`. Bearer API key server-side only. Stored routes use `/api/v1`.

| Kind                | GET path                                          | Maximum reservation                                        |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Profile             | /users/{subject}                                  | 1 credit                                                   |
| PnL                 | /users/{subject}/pnl                              | 2 credits                                                  |
| Forward wallets     | /users/{subject}/wallets                          | 10 credits (miss 1)                                        |
| Reverse wallets     | /wallets?address={address}                        | 100 credits (miss 1)                                       |
| Following/followers | /users/{subject}/following or /followers?limit=10 | 1 credit/page                                              |
| Leaderboard         | /leaderboard?window=all or 24h/7d/30d&limit=10    | 1 credit/page                                              |
| Aggregate coverage  | /api/public/coverage (outside /api/v1)            | Public aggregate; implement separately and verify handling |

PnL has no window query; fetch once and change the display locally. The documentation says technical failures cost zero, but missing billing metadata must remain unknown until reconciled.

Headers: `X-Credits-Cost`, `X-Credits-Remaining`, `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and sometimes `Retry-After`. Keep account balance owner-only. Never copy arbitrary upstream headers or error text.

The idempotency key and identical URL recover a response without another credit charge for up to 24 hours. Retries still consume upstream request allowance. Different parameters with the same key return 409. After an abandoned request is released, a new key is required. **Current recovery code does not enforce the 24-hour boundary, does not reserve retry request allowance, and does not yet implement all Retry-After states. Fix before enabling dispatch.**

List query parameter is **cursor**, containing the unchanged returned nextCursor. Preserve all original endpoint parameters, bound limit to ten, and stop on planLimitReached. Lists are not consistent snapshots. Upstream cursors expire after 24 hours; the application currently wraps them in a shorter signed envelope.

## Wire shapes from OpenAPI

Most profile/PnL/page fields are optional in the specification. Do not coerce absent values into zeros, invented timestamps, or falsely complete observations.

- ProfileSummary: id (UUID), nullable userHandle, displayName, description, profilePictureLink, createdAt, observedAt; nullable numeric followers, following, numTrades, swapCount, totalVolume.
- WalletResults: required count and mappings. Each mapping requires walletFamily (`solana|evm`), walletAddress, nullable userId, nullable userHandle. There is **no documented wallet observation timestamp**. Preserve these fields rather than losing the ID in normalization.
- Pnl: optional userId, fetchedAt (datetime), windows. Each supported window is an optional object with optional numeric pnl and nullable rank. Missing windows are unavailable.
- Page: count, rows, hasMore, nextCursor (nullable), planLimitReached, coverage, consistentSnapshot, subjectLastWalkAt (nullable), window.
- Following/followers Page rows are only typed as objects in OpenAPI. The guide shows row.id. Obtain representative synthetic rows or more detailed documentation before assuming a complete profile shape.
- LeaderboardRow: id, nullable userHandle/displayName/pnl/rank, position, nullable fetchedAt/profilePictureLink/followers/numTrades/profileObservedAt. Show independent PnL and profile timestamps per row.
- Public coverage prose: available=false for missing/stale snapshots; otherwise matchedUsers, solanaMappings, evmMappings, observedAt. Family counts overlap.

Errors are `{"error":"error_code"}`: 400 validation, 401 auth, 402 credit reservation, 403 plan/review/collection, 404 unobserved, 409 idempotency/in-progress, 429 rate/concurrency, 503 unavailable. Determine actual error codes for cursor expiry and abandoned/replayed operations using documentation/fixtures.

## Current code boundary

`src/lib/research-contract.ts` describes **internal synthetic application DTOs**, not these wire responses. `src/lib/upstream.ts` deliberately exports `verifiedContract = null`. Do not merely replace null with guessed paths: implement Zod wire schemas, explicit normalization that preserves metadata and nullable identities, error/replay semantics, tests, and the documented limits first.

Existing proposed costs align with the supplied guide, but the wallet maximum wording should be checked against representative multiple-mapping results. Do not send paid verification requests until credentials and explicit request approval are supplied.

No live reads, public-lookup proxy, scans, WebSockets, background collection, or automatic retry.
