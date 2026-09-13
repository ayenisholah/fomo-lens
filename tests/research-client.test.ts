import { it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyResearchResult,
  refreshResearchMetadata,
} from "@/lib/research-client";
import { exampleData } from "@/lib/examples";
import { requestSchema, type Kind, schemas } from "@/lib/research-contract";
const request = (kind: Kind) =>
  requestSchema.parse({
    id: randomUUID(),
    actionId: randomUUID(),
    kind,
    subject: "alice",
    address: "123456789012",
  });
const handlers = () => ({
  profile: vi.fn(),
  pnl: vi.fn(),
  wallets: vi.fn(),
  social: vi.fn(),
  leaderboard: vi.fn(),
  coverage: vi.fn(),
});
it.each<Kind>([
  "profile",
  "pnl",
  "wallets",
  "reverse",
  "following",
  "followers",
  "leaderboard",
  "coverage",
])("applies %s results through the shared ordinary/recovery path", (kind) => {
  const r = request(kind),
    h = handlers(),
    data = exampleData(r);
  applyResearchResult(r, data, h);
  const key =
    kind === "reverse"
      ? "wallets"
      : kind === "following" || kind === "followers"
        ? "social"
        : kind;
  expect(h[key]).toHaveBeenCalledWith(data);
  expect(Object.values(h).filter((fn) => fn.mock.calls.length)).toHaveLength(1);
});
it.each<Kind>(["pnl", "following", "followers", "leaderboard"])(
  "rejects mismatched %s results without applying",
  (kind) => {
    const r = request(kind),
      h = handlers();
    const data = {
      ...schemas[r.kind].parse(exampleData(r)),
      subject: "other",
      window: "30d",
      direction: "wrong",
    };
    expect(() => applyResearchResult(r, data, h)).toThrow();
    for (const fn of Object.values(h)) expect(fn).not.toHaveBeenCalled();
  },
);
it("uses the returned canonical profile selection", () => {
  const r = request("profile"),
    h = handlers();
  const data = {
    ...schemas[r.kind].parse(exampleData(r)),
    subject: "canonical",
  };
  applyResearchResult(r, data, h);
  expect(h.profile).toHaveBeenCalledWith(
    expect.objectContaining({ subject: "canonical" }),
  );
});
it.each(["network", "http", "decode"])(
  "secondary %s failure is nonfatal and does not suppress the other refresh",
  async (failure) => {
    const history = vi.fn(),
      allowance = vi.fn();
    const transport = vi.fn(async (url: string | URL | Request) => {
      if (url === "/api/session")
        return Response.json({
          ok: true,
          data: { allowance: { requestsUsed: 1 } },
        });
      if (failure === "network") throw Error("offline");
      if (failure === "http")
        return Response.json({ ok: false }, { status: 503 });
      return new Response("invalid");
    });
    await expect(
      refreshResearchMetadata({
        isCurrent: () => true,
        history,
        allowance,
        transport,
      }),
    ).resolves.toBe(false);
    expect(allowance).toHaveBeenCalledWith({ requestsUsed: 1 });
    expect(history).not.toHaveBeenCalled();
  },
);
it("suppresses stale metadata after response decoding", async () => {
  const history = vi.fn(),
    allowance = vi.fn();
  await refreshResearchMetadata({
    isCurrent: () => false,
    history,
    allowance,
    transport: async () => Response.json({ ok: true, data: {} }),
  });
  expect(history).not.toHaveBeenCalled();
  expect(allowance).not.toHaveBeenCalled();
});
