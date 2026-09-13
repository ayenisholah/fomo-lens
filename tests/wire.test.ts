import "./env";
import { describe, it, expect } from "vitest";
import { decode, requestUrl } from "@/lib/wire";
import { upstream, verifiedContract } from "@/lib/upstream";
import { requestSchema, schemas } from "@/lib/research-contract";
import { signCursor, readCursor } from "@/lib/cursors";
import { randomUUID } from "node:crypto";
const request = (kind: string) =>
  requestSchema.parse({
    id: randomUUID(),
    actionId: randomUUID(),
    kind,
    subject: "Example",
    address: "123456789012",
  });
describe("official wire adapter", () => {
  it("keeps PnL windows local and cursor parameters exact", () => {
    expect(requestUrl(request("pnl"))).toBe(
      "https://api.fomolens.app/api/v1/users/example/pnl",
    );
    const url = new URL(requestUrl(request("following"), "a+/= b"));
    expect(url.searchParams.get("cursor")).toBe("a+/= b");
    expect(url.searchParams.get("limit")).toBe("10");
  });
  it("retains nullable wallet identities without inventing time", () => {
    const d = schemas.wallets.parse(
      decode("wallets", {
        count: 1,
        mappings: [
          {
            walletFamily: "evm",
            walletAddress: "0x123",
            userId: null,
            userHandle: null,
          },
        ],
      }),
    );
    expect(d.mappings[0]).toMatchObject({
      userId: null,
      subject: null,
      observedAt: null,
    });
  });
  it("keeps missing PnL unavailable, with independent samples", () => {
    const d = schemas.pnl.parse(
      decode(
        "pnl",
        { windows: { "7d": { pnl: 0 } } },
        requestUrl(request("pnl")),
      ),
    );
    expect(d.windows).toEqual({ "24h": null, "7d": 0, "30d": null, all: null });
    expect(d.observedAt).toBeNull();
  });
  it("preserves unknown identity and independent leaderboard dates", () => {
    const d = schemas.leaderboard.parse(
      decode("leaderboard", {
        rows: [
          {
            id: randomUUID(),
            userHandle: null,
            fetchedAt: "2026-09-10T00:00:00Z",
            profileObservedAt: "2026-09-09T00:00:00Z",
          },
        ],
        hasMore: false,
        consistentSnapshot: false,
      }),
    );
    expect(d.items[0].profile.handle).toBeNull();
    expect(d.items[0].fetchedAt).not.toBe(d.items[0].profile.observedAt);
    expect(d.nextCursor).toBeNull();
  });
  it("returns unavailable aggregate coverage", () =>
    expect(
      schemas.coverage.parse(decode("coverage", { available: false }))
        .identities,
    ).toBeNull());
  it("retains billing when JSON is malformed", async () => {
    const result = await upstream(
      requestUrl(request("profile")),
      randomUUID(),
      "profile",
      "test",
      verifiedContract,
      async () => new Response("bad", { headers: { "X-Credits-Cost": "1" } }),
    );
    expect(result.ok).toBe(false);
    expect(result.metadata.credits).toBe(1);
  });
  it("keeps absent billing unknown and honors retry timing", async () => {
    const result = await upstream(
      requestUrl(request("profile")),
      randomUUID(),
      "profile",
      "test",
      verifiedContract,
      async () =>
        Response.json(
          { error: "rate_limit" },
          { status: 429, headers: { "Retry-After": "60" } },
        ),
    );
    expect(result.metadata.credits).toBeNull();
    expect(result.metadata.retryAfter).toBe(60);
  });
  it("binds signed cursors to owner and query", () => {
    const cursor = signCursor("opaque", "user-a:following");
    expect(readCursor(cursor, "user-a:following")).toBe("opaque");
    expect(() => readCursor(cursor, "user-b:following")).toThrow();
    expect(() => readCursor(cursor + "x", "user-a:following")).toThrow();
  });
});

it.each(["-1", "1.5", "9007199254740992", "garbage"])(
  "retains reservation for invalid cost metadata %s",
  async (cost) => {
    const result = await upstream(
      "https://api.fomolens.app/api/v1/users/alice",
      "original-id",
      "profile",
      "synthetic-key",
      verifiedContract,
      async () =>
        Response.json(
          {},
          {
            status: 402,
            headers: {
              "X-Credits-Cost": cost,
              "X-Credits-Remaining": cost,
              "X-Request-Id": "unsafe request id",
            },
          },
        ),
    );
    expect(result.metadata.credits).toBeNull();
    expect(result.metadata.balance).toBeNull();
    expect(result.metadata.requestId).toBeNull();
  },
);
it("dispatches an exact saved URL and original idempotency identity", async () => {
  const url =
    "https://api.fomolens.app/api/v1/users/alice/following?cursor=a%2B%2F%3D&limit=10";
  await upstream(
    url,
    "original-id",
    "following",
    "synthetic-key",
    verifiedContract,
    async (actualUrl, init) => {
      expect(actualUrl).toBe(url);
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
        "original-id",
      );
      return Response.json({}, { status: 402 });
    },
  );
});
