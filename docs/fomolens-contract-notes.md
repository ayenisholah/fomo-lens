> Current checkpoint (2026-09-13): implementation complete; release verification blocked. The permitted unit suite passes 91 tests across 9 files. See [../HANDOFF.md](../HANDOFF.md) for constraints and durable evidence. Operational and other verification commands below remain future reference only.

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

The idempotency key and identical URL recover a response without another credit charge for up to 24 hours. Retries still consume upstream request allowance. Different parameters with the same key return 409. After an abandoned request is released, a new key is required. The implementation enforces a conservative recovery deadline and retry request accounting; production recovery rehearsal remains pending.

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

## Current implementation and acceptance

Rechecked official docs.md and openapi.json on September 13, 2026. `src/lib/wire.ts` implements schema validation and normalization, and `src/lib/upstream.ts` supplies the stored adapter. Internal DTOs preserve nullable identities, values and independent observation times. Recovery persists the original URL/key, reserves retry request allowance, retains uncertain credits, and rejects attempts inside the final 65 seconds of the documented 24-hour window.

Credentialed acceptance recorded successful leaderboard, profile, PnL and forward-wallet responses (14 known credits). A reverse-wallet request returned HTTP 402 without recorded billing metadata. Its conservative 100-credit reservation remains unresolved; no further paid verification is permitted until reconciled. Following, followers and successful reverse-wallet acceptance are still pending. See docs/release-verification.md. Do not infer production verification from unit fixtures.
