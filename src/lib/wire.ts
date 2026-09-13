import { z } from "zod";
import { config } from "./config";
import { windows, type Kind, type ResearchRequest } from "./research-contract";
const text = z.string().nullish();
const num = z.number().finite().nullish();
const date = z.string().datetime({ offset: true }).nullish();
const profile = z.object({
  id: text,
  userHandle: text,
  displayName: text,
  description: text,
  profilePictureLink: text,
  observedAt: date,
  followers: num,
  numTrades: num,
});
const row = profile.extend({
  pnl: num,
  rank: num,
  position: z.number().int().optional(),
  fetchedAt: date,
  profileObservedAt: date,
});
const page = z.object({
  rows: z.array(row).max(10),
  count: z.number().int().optional(),
  hasMore: z.boolean().optional(),
  nextCursor: text,
  planLimitReached: z.boolean().optional(),
  coverage: text,
  consistentSnapshot: z.boolean().optional(),
  subjectLastWalkAt: date,
  window: z.enum(windows).optional(),
});
function normalized(p: z.infer<typeof profile>, fallback = "") {
  return {
    subject: p.userHandle ?? p.id ?? fallback,
    id: p.id ?? null,
    handle: p.userHandle ?? null,
    name: p.displayName ?? "Identity unavailable",
    bio: p.description ?? undefined,
    observedAt: p.observedAt ?? null,
    followers: p.followers ?? null,
    trades: p.numTrades ?? null,
  };
}
export function requestUrl(r: ResearchRequest, cursor?: string) {
  const path =
    r.kind === "coverage"
      ? "/api/public/coverage"
      : r.kind === "reverse"
        ? "/api/v1/wallets"
        : r.kind === "leaderboard"
          ? "/api/v1/leaderboard"
          : `/api/v1/users/${encodeURIComponent(r.subject!)}` +
            (r.kind === "profile" ? "" : `/${r.kind}`);
  const url = new URL(path, config().FOMOLENS_URL);
  if (r.kind === "reverse") url.searchParams.set("address", r.address!);
  if (["following", "followers", "leaderboard"].includes(r.kind)) {
    url.searchParams.set("limit", "10");
    if (cursor) url.searchParams.set("cursor", cursor);
  }
  if (r.kind === "leaderboard") url.searchParams.set("window", r.window);
  return url.toString();
}
export function decode(kind: Kind, body: unknown, url?: string) {
  const path = url ? new URL(url) : null;
  const subject = path
    ? decodeURIComponent(path.pathname.split("/")[4] ?? "")
    : "";
  if (kind === "profile") return normalized(profile.parse(body), subject);
  if (kind === "wallets" || kind === "reverse") {
    const w = z
      .object({
        count: z.number().int().nonnegative(),
        mappings: z.array(
          z.object({
            walletFamily: z.enum(["solana", "evm"]),
            walletAddress: z.string(),
            userId: z.string().nullable(),
            userHandle: z.string().nullable(),
          }),
        ),
      })
      .parse(body);
    return {
      count: w.count,
      observedAt: null,
      mappings: w.mappings.map((m) => ({
        chain: m.walletFamily,
        address: m.walletAddress,
        userId: m.userId,
        subject: m.userHandle,
        observedAt: null,
      })),
    };
  }
  if (kind === "pnl") {
    const value = z.object({ pnl: num, rank: num });
    const p = z
      .object({
        userId: text,
        fetchedAt: date,
        windows: z
          .object({
            "24h": value.optional(),
            "7d": value.optional(),
            "30d": value.optional(),
            all: value.optional(),
          })
          .optional(),
      })
      .parse(body);
    return {
      subject,
      userId: p.userId ?? null,
      observedAt: p.fetchedAt ?? null,
      coverage: "Sampled PnL; missing windows are unavailable.",
      windows: Object.fromEntries(
        windows.map((w) => [w, p.windows?.[w]?.pnl ?? null]),
      ),
      ranks: Object.fromEntries(
        windows.map((w) => [w, p.windows?.[w]?.rank ?? null]),
      ),
    };
  }
  if (kind === "coverage") {
    const c = z
      .object({
        available: z.boolean(),
        matchedUsers: z.number().int().nonnegative().optional(),
        solanaMappings: z.number().int().nonnegative().optional(),
        evmMappings: z.number().int().nonnegative().optional(),
        observedAt: date,
      })
      .parse(body);
    return {
      available: c.available,
      identities: c.available ? (c.matchedUsers ?? null) : null,
      solanaMappings: c.available ? (c.solanaMappings ?? null) : null,
      evmMappings: c.available ? (c.evmMappings ?? null) : null,
      observedAt: c.available ? (c.observedAt ?? null) : null,
      description: c.available
        ? "Wallet families overlap; counts are not additive."
        : "Coverage snapshot unavailable.",
    };
  }
  const p = page.parse(body);
  const common = {
    count: p.count ?? null,
    hasMore: p.hasMore ?? null,
    nextCursor:
      p.hasMore === false || p.planLimitReached ? null : (p.nextCursor ?? null),
    planLimitReached: p.planLimitReached ?? false,
    consistentSnapshot: p.consistentSnapshot ?? null,
    observedAt: p.subjectLastWalkAt ?? null,
    coverage: p.coverage ?? "Coverage unavailable; pages may be incomplete.",
  };
  if (kind === "leaderboard")
    return {
      ...common,
      window: p.window ?? path?.searchParams.get("window") ?? "7d",
      items: p.rows.map((r, i) => ({
        profile: normalized(
          { ...r, observedAt: r.profileObservedAt },
          `unavailable-${i}`,
        ),
        pnl: r.pnl ?? null,
        rank: r.rank ?? null,
        position: r.position ?? null,
        fetchedAt: r.fetchedAt ?? null,
      })),
    };
  return {
    ...common,
    subject,
    direction: kind,
    items: p.rows.map((r, i) => normalized(r, `unavailable-${i}`)),
  };
}
