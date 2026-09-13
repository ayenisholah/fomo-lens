import { it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  withAcceptance,
  validateLedger,
  exposure,
  type Entry,
} from "../scripts/acceptance-core";
import { requestSchema } from "@/lib/research-contract";
const request = (kind = "profile") =>
  requestSchema.parse({
    id: randomUUID(),
    actionId: randomUUID(),
    kind,
    subject: "alice",
    address: "123456789012",
  });
function setup(entries: unknown = []) {
  let saved: Entry[] = [];
  const ports = {
    acquire: vi.fn(async () => {}),
    release: vi.fn(async () => {}),
    read: vi.fn(async () => entries),
    persist: vi.fn(async (rows: Entry[]) => {
      saved = structuredClone(rows);
    }),
    transport: vi.fn(async () =>
      Response.json({}, { headers: { "X-Credits-Cost": "1" } }),
    ),
    decode: vi.fn(async () => ({ valid: true })),
  };
  return { ports, saved: () => saved };
}
it.each([
  null,
  {},
  [{ id: "bad", kind: "profile", maximum: 1 }],
  [{ id: randomUUID(), kind: "profile", maximum: -1 }],
  [{ id: randomUUID(), kind: "reverse", maximum: 1 }],
  [{ id: randomUUID(), kind: "profile", maximum: 1, actual: 1 }],
  [{ id: randomUUID(), kind: "profile", maximum: 1, actual: 1.5, status: 200 }],
  [
    {
      id: randomUUID(),
      kind: "profile",
      maximum: 1,
      actual: 1,
      status: 402,
      validated: true,
    },
  ],
])("rejects corrupt ledger before any dispatch (%#)", async (raw) => {
  const { ports } = setup(raw);
  await expect(
    withAcceptance(ports, (call) => call(request())),
  ).rejects.toThrow();
  expect(ports.transport).not.toHaveBeenCalled();
  expect(ports.release).not.toHaveBeenCalled();
});
it("rejects duplicate identities", () => {
  const row = { id: randomUUID(), kind: "profile", maximum: 1 };
  expect(() => validateLedger([row, row])).toThrow();
});
it.each([undefined, 1])(
  "blocks unresolved outcomes and successful requests without validation evidence (actual=%s)",
  async (actual) => {
    const { ports } = setup([
      { id: randomUUID(), kind: "profile", maximum: 1, status: 200, actual },
    ]);
    await expect(
      withAcceptance(ports, (call) => call(request())),
    ).rejects.toThrow();
    expect(ports.transport).not.toHaveBeenCalled();
  },
);
it("preserves 114 exposure and refuses a request exceeding 120", async () => {
  const rows = [
    {
      id: randomUUID(),
      kind: "wallets",
      maximum: 10,
      status: 200,
      actual: 14,
      validated: true,
    },
    { id: randomUUID(), kind: "reverse", maximum: 100, status: 402 },
  ];
  expect(exposure(validateLedger(rows))).toBe(114);
  const { ports } = setup([
    {
      id: randomUUID(),
      kind: "reverse",
      maximum: 100,
      status: 402,
      actual: 119,
    },
  ]);
  await expect(
    withAcceptance(ports, (call) => call(request("pnl"))),
  ).rejects.toThrow("ceiling");
  expect(ports.transport).not.toHaveBeenCalled();
});
it("persists reservation, billing and validation in order", async () => {
  const { ports, saved } = setup();
  ports.transport.mockImplementation(async () => {
    expect(saved()[0]).toMatchObject({ maximum: 1 });
    expect(saved()[0].status).toBeUndefined();
    return Response.json({}, { headers: { "X-Credits-Cost": "1" } });
  });
  await withAcceptance(ports, (call) => call(request()));
  expect(ports.persist.mock.calls.map(([rows]) => rows[0])).toEqual([
    expect.objectContaining({ maximum: 1 }),
    expect.objectContaining({ actual: 1, status: 200 }),
    expect.objectContaining({ validated: true }),
  ]);
  expect(ports.release).toHaveBeenCalledOnce();
});
it.each([1, 2, 3])(
  "fails closed at persistence boundary %s",
  async (boundary) => {
    const { ports } = setup();
    let writes = 0;
    ports.persist.mockImplementation(async () => {
      if (++writes === boundary) throw Error("disk unavailable");
    });
    await expect(
      withAcceptance(ports, (call) => call(request())),
    ).rejects.toThrow();
    expect(ports.transport).toHaveBeenCalledTimes(boundary === 1 ? 0 : 1);
    expect(ports.release).not.toHaveBeenCalled();
  },
);
it.each(["network", "decode", "unknown", "http"])(
  "retains lock and reservation after %s interruption",
  async (failure) => {
    const { ports, saved } = setup();
    if (failure === "network")
      ports.transport.mockRejectedValue(Error("interrupted"));
    if (failure === "decode") ports.decode.mockRejectedValue(Error("invalid"));
    if (failure === "unknown")
      ports.transport.mockResolvedValue(Response.json({}));
    if (failure === "http")
      ports.transport.mockResolvedValue(new Response(null, { status: 429 }));
    await expect(
      withAcceptance(ports, (call) => call(request())),
    ).rejects.toThrow();
    expect(saved()[0].maximum).toBe(1);
    expect(ports.release).not.toHaveBeenCalled();
  },
);
it("does not replay validated successes", async () => {
  const { ports } = setup([
    {
      id: randomUUID(),
      kind: "profile",
      maximum: 1,
      status: 200,
      actual: 1,
      validated: true,
    },
  ]);
  await expect(
    withAcceptance(ports, (call) => call(request())),
  ).resolves.toBeNull();
  expect(ports.transport).not.toHaveBeenCalled();
});
it("refuses a concurrent runner without removing its lock", async () => {
  const { ports } = setup();
  ports.acquire.mockRejectedValue(Error("locked"));
  await expect(
    withAcceptance(ports, (call) => call(request())),
  ).rejects.toThrow("locked");
  expect(ports.read).not.toHaveBeenCalled();
  expect(ports.release).not.toHaveBeenCalled();
});
it("refuses overlapping calls within one runner", async () => {
  const { ports } = setup();
  await withAcceptance(ports, async (call) => {
    const first = call(request());
    await expect(call(request("pnl"))).rejects.toThrow("busy");
    await first;
  });
  expect(ports.transport).toHaveBeenCalledOnce();
});
