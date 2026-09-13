import "./env";
import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { requestCode, verifyCode, userForToken, signout } from "@/lib/auth";
import { submit, recover, operation, reserve, allowance } from "@/lib/research";
import { verifiedContract } from "@/lib/upstream";
import { requestSchema } from "@/lib/research-contract";
const input = () =>
  requestSchema.parse({
    id: randomUUID(),
    actionId: randomUUID(),
    kind: "profile",
    subject: "example",
  });
beforeAll(() => {
  if (
    !process.env.TEST_DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.startsWith(
      "/fomo_lens_test",
    )
  )
    throw Error("Use an isolated fomo_lens_test database in TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
beforeEach(async () => {
  await db().$executeRawUnsafe(
    "TRUNCATE users, auth_challenges, rate_limit_buckets, research_operations, sessions, activity_events, budget_buckets, accounting_retention CASCADE",
  );
  process.env.FOMOLENS_MODE = "example";
});
afterAll(async () => db().$disconnect());
it("retains a killed worker's reservation and recovers with its original dispatch identity", async () => {
  const { fork } = await import("node:child_process");
  const { default: EventEmitter } = await import("node:events");
  const once = EventEmitter.once;
  const user = await db().user.create({
    data: { email: "killed-worker@example.com" },
  });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "synthetic-key";
  const request = input();
  const child = fork(
    "tests/fixtures/interrupted-worker.ts",
    [user.id, JSON.stringify(request)],
    {
      execArgv: ["--conditions=react-server", "--import", "tsx"],
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    },
  );
  try {
    const [dispatch] = await Promise.race([
      once(child, "message"),
      once(child, "exit").then(() => {
        throw Error("Worker exited before dispatch");
      }),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(Error("Worker dispatch timed out")),
          15000,
        );
        timer.unref();
      }),
    ]);
    const exited = once(child, "exit");
    child.kill("SIGKILL");
    expect((await exited)[1]).toBe("SIGKILL");
    expect(
      await db().researchOperation.findUniqueOrThrow({
        where: { id: request.id },
      }),
    ).toMatchObject({
      status: "running",
      reservedCredits: 1,
      actualCredits: null,
    });
    expect((await db().budgetBucket.findMany())[0]).toMatchObject({
      requests: 1,
      credits: 1,
    });
    await db().researchOperation.update({
      where: { id: request.id },
      data: { updatedAt: new Date(Date.now() - 91000) },
    });
    await recover(user, request.id, verifiedContract, async (url, init) => {
      expect({
        url: String(url),
        key: new Headers(init?.headers).get("Idempotency-Key"),
      }).toEqual(dispatch);
      return Response.json(
        { userHandle: "example" },
        { headers: { "X-Credits-Cost": "1" } },
      );
    });
    expect((await db().budgetBucket.findMany())[0]).toMatchObject({
      requests: 2,
      credits: 1,
    });
  } finally {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
  }
}, 25000);
it("consumes an email code exactly once and expires sessions after seven days", async () => {
  let code = "";
  const now = new Date();
  const ch = await requestCode(
    "person@example.com",
    "ip",
    async (_e, c) => {
      code = c;
    },
    now,
  );
  const results = await Promise.allSettled([
    verifyCode(ch.challengeId, code, "ip", now),
    verifyCode(ch.challengeId, code, "ip", now),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const result = results.find((r) => r.status === "fulfilled");
  if (result?.status !== "fulfilled") throw Error("No session");
  expect(
    await userForToken(
      result.value.token,
      new Date(now.getTime() + 7 * 86400000),
    ),
  ).toBeNull();
  expect(await userForToken(result.value.token, now)).not.toBeNull();
  await signout(result.value.token);
  expect(await userForToken(result.value.token, now)).toBeNull();
});
it("rejects a superseded code", async () => {
  let old = "",
    fresh = "";
  const now = new Date();
  const a = await requestCode(
    "person@example.com",
    "ip",
    async (_e, c) => {
      old = c;
    },
    new Date(now.getTime() - 61000),
  );
  const b = await requestCode(
    "person@example.com",
    "ip",
    async (_e, c) => {
      fresh = c;
    },
    now,
  );
  await expect(verifyCode(a.challengeId, old, "ip", now)).rejects.toThrow();
  await expect(
    verifyCode(b.challengeId, fresh, "ip", now),
  ).resolves.toBeDefined();
});
it("gives any verified user access, prevents duplicates and isolates operations", async () => {
  const u = await db().user.create({ data: { email: "a@example.com" } });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "test";
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    return Response.json(
      { userHandle: "example" },
      { headers: { "X-Credits-Cost": "1" } },
    );
  };
  const r = input();
  await submit(u, r, verifiedContract, transport);
  await expect(submit(u, r, verifiedContract, transport)).rejects.toThrow();
  await expect(operation(randomUUID(), r.id)).rejects.toThrow();
  expect(calls).toBe(1);
  expect((await db().budgetBucket.findMany())[0]).toMatchObject({
    requests: 1,
    credits: 1,
  });
});
it("retains uncertain reservations, exact request identity and known charges across recovery", async () => {
  const u = await db().user.create({ data: { email: "a@example.com" } });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "test";
  const r = input();
  const seen: unknown[] = [];
  const transport: typeof fetch = async (url, init) => {
    seen.push([url, init?.headers]);
    throw Error("timeout");
  };
  await expect(submit(u, r, verifiedContract, transport)).rejects.toThrow();
  expect((await db().budgetBucket.findMany())[0]).toMatchObject({
    requests: 1,
    credits: 1,
  });
  await recover(u, r.id, verifiedContract, async (url, init) => {
    seen.push([url, init?.headers]);
    return Response.json(
      { userHandle: "example" },
      { headers: { "X-Credits-Cost": "1" } },
    );
  });
  expect(seen[0]).toEqual(seen[1]);
  await expect(recover(u, r.id, verifiedContract, transport)).rejects.toThrow();
  expect(
    (await db().researchOperation.findUniqueOrThrow({ where: { id: r.id } }))
      .actualCredits,
  ).toBe(1);
  expect((await db().budgetBucket.findMany())[0]).toMatchObject({
    requests: 3,
    credits: 1,
  });
});
it("allows usage beyond both former daily limits across users and settles accurately", async () => {
  const users = await Promise.all(
    ["a", "b"].map((n) =>
      db().user.create({ data: { email: n + "@example.com" } }),
    ),
  );
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "test";
  // Stale deployment configuration cannot restore either former limit.
  process.env.SERVICE_DAILY_REQUESTS = "1";
  process.env.SERVICE_DAILY_CREDITS = "1";
  const day = new Date().toISOString().slice(0, 10);
  await db().budgetBucket.create({
    data: { key: "service:" + day, day, credits: 200, requests: 200 },
  });
  let calls = 0;
  try {
    for (const user of users) {
      await submit(user, input(), verifiedContract, async () => {
        calls++;
        return Response.json(
          { userHandle: "example" },
          { headers: { "X-Credits-Cost": "1" } },
        );
      });
    }
    expect(calls).toBe(2);
    expect(await allowance()).toEqual({
      day,
      requestsUsed: 202,
      creditsReservedOrUsed: 202,
      requestLimit: null,
      creditLimit: null,
    });
    expect(
      await db().researchOperation.count({ where: { status: "complete" } }),
    ).toBe(2);
  } finally {
    delete process.env.SERVICE_DAILY_REQUESTS;
    delete process.env.SERVICE_DAILY_CREDITS;
  }
});
it("rejects wrong, expired and undelivered codes", async () => {
  let code = "";
  const now = new Date();
  const ch = await requestCode(
    "a@example.com",
    "ip",
    async (_e, c) => {
      code = c;
    },
    now,
  );
  await expect(
    verifyCode(
      ch.challengeId,
      code === "000000" ? "111111" : "000000",
      "ip",
      now,
    ),
  ).rejects.toThrow();
  await expect(
    verifyCode(ch.challengeId, code, "ip", new Date(now.getTime() + 600001)),
  ).rejects.toThrow();
  await expect(
    requestCode(
      "b@example.com",
      "ip",
      async () => {
        throw Error("delivery");
      },
      now,
    ),
  ).rejects.toThrow();
  const failed = await db().authChallenge.findFirstOrThrow({
    where: { email: "b@example.com" },
  });
  await expect(verifyCode(failed.id, "000000", "ip", now)).rejects.toThrow();
});
it("does not revive an older delivered code after a newer code is consumed", async () => {
  const now = new Date();
  let oldCode = "",
    newCode = "";
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((r) => {
    started = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const pending = requestCode(
    "a@example.com",
    "ip",
    async (_e, c) => {
      oldCode = c;
      started();
      await gate;
    },
    new Date(now.getTime() - 61000),
  );
  await ready;
  const newer = await requestCode(
    "a@example.com",
    "ip",
    async (_e, c) => {
      newCode = c;
    },
    now,
  );
  await verifyCode(newer.challengeId, newCode, "ip", now);
  release();
  const older = await pending;
  await expect(
    verifyCode(older.challengeId, oldCode, "ip", now),
  ).rejects.toThrow();
});
it("blocks retries until Retry-After and never exposes shared accounting to ordinary users", async () => {
  const u = await db().user.create({ data: { email: "a@example.com" } });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "test";
  const r = input();
  await expect(
    submit(u, r, verifiedContract, async () =>
      Response.json(
        { error: "rate_limit" },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    ),
  ).rejects.toThrow();
  let calls = 0;
  await expect(
    recover(u, r.id, verifiedContract, async () => {
      calls++;
      return Response.json({});
    }),
  ).rejects.toThrow();
  expect(calls).toBe(0);
  const status = await operation(u.id, r.id);
  expect(status).not.toHaveProperty("actualCredits");
  expect(status).not.toHaveProperty("upstreamBalance");
  expect((await db().budgetBucket.findMany())[0].requests).toBe(1);
});
it("refuses expired recovery and releases crashed-worker concurrency without releasing credits", async () => {
  const u = await db().user.create({ data: { email: "a@example.com" } });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "test";
  const r = input();
  await expect(
    submit(u, r, verifiedContract, async () => {
      throw Error("timeout");
    }),
  ).rejects.toThrow();
  await db().researchOperation.update({
    where: { id: r.id },
    data: {
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 120000),
      status: "running",
    },
  });
  await expect(
    recover(u, r.id, verifiedContract, async () => Response.json({})),
  ).rejects.toThrow();
  await submit(u, input(), verifiedContract, async () =>
    Response.json(
      { userHandle: "example" },
      { headers: { "X-Credits-Cost": "1" } },
    ),
  );
  expect((await db().budgetBucket.findMany())[0].credits).toBe(2);
});

it("serializes account deletion with verification and signout without recreating an account", async () => {
  const { deleteAccount } = await import("@/lib/account-deletion");
  let code = "";
  const now = new Date();
  const challenge = await requestCode(
    "delete@example.com",
    "ip",
    async (_e, c) => {
      code = c;
    },
    now,
  );
  await db().user.create({ data: { email: "delete@example.com" } });
  const results = await Promise.allSettled([
    verifyCode(challenge.challengeId, code, "ip", now),
    deleteAccount(db(), "delete@example.com"),
  ]);
  expect(results[1].status).toBe("fulfilled");
  expect(
    await db().user.findUnique({ where: { email: "delete@example.com" } }),
  ).toBeNull();
  expect(await db().session.count()).toBe(0);
  await deleteAccount(db(), "delete@example.com");
  const second = await requestCode(
    "other@example.com",
    "ip",
    async (_e, c) => {
      code = c;
    },
    now,
  );
  const session = await verifyCode(second.challengeId, code, "ip", now);
  await Promise.all([
    signout(session.token),
    deleteAccount(db(), "other@example.com"),
  ]);
  expect(await userForToken(session.token)).toBeNull();
});

it("persists independent device sessions and enforces concurrent code request cooldown", async () => {
  let code = "";
  const now = new Date();
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      requestCode(
        "a@example.com",
        "ip",
        async (_e, c) => {
          code = c;
        },
        now,
      ),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const first = results.find((r) => r.status === "fulfilled");
  if (first?.status !== "fulfilled") throw Error("No challenge");
  const a = await verifyCode(first.value.challengeId, code, "ip", now);
  const later = new Date(now.getTime() + 61000);
  const second = await requestCode(
    "a@example.com",
    "ip",
    async (_e, c) => {
      code = c;
    },
    later,
  );
  const b = await verifyCode(second.challengeId, code, "ip", later);
  await signout(a.token);
  expect(await userForToken(b.token, later)).not.toBeNull();
});

it("binds pagination to original user, direction, subject and window before dispatch", async () => {
  const u = await db().user.create({ data: { email: "a@example.com" } });
  const other = await db().user.create({ data: { email: "b@example.com" } });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "test";
  const r = requestSchema.parse({ ...input(), kind: "following" });
  const result = await submit(u, r, verifiedContract, async () =>
    Response.json(
      { rows: [], hasMore: true, nextCursor: "raw+/=" },
      { headers: { "X-Credits-Cost": "1" } },
    ),
  );
  const cursor = (result.data as { nextCursor: string }).nextCursor;
  let calls = 0;
  for (const [who, overrides] of [
    [other, {}],
    [u, { kind: "followers" }],
    [u, { subject: "changed" }],
  ] as const) {
    await expect(
      submit(
        who,
        requestSchema.parse({ ...r, ...overrides, id: randomUUID(), cursor }),
        verifiedContract,
        async () => {
          calls++;
          return Response.json({});
        },
      ),
    ).rejects.toThrow();
  }
  expect(calls).toBe(0);
});

it("reports retained known billing when recovery omits cost metadata", async () => {
  const user = await db().user.create({
    data: { email: "retained@example.com" },
  });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "synthetic-key";
  const r = input();
  await submit(user, r, verifiedContract, async () =>
    Response.json(
      { userHandle: "example" },
      { headers: { "X-Credits-Cost": "1" } },
    ),
  );
  const result = await recover(user, r.id, verifiedContract, async () =>
    Response.json({ userHandle: "example" }),
  );
  expect(result.operation.status).toBe("complete");
  const saved = await db().researchOperation.findUniqueOrThrow({
    where: { id: r.id },
  });
  expect(saved.actualCredits).toBe(1);
  expect(saved.status).toBe("complete");
});

it("keeps UTC day reservations separate across midnight", async () => {
  const user = await db().user.create({ data: { email: "utc@example.com" } });
  await db().$transaction((tx) =>
    reserve(tx, user.id, 2, new Date("2026-09-12T23:59:59.999Z")),
  );
  await db().$transaction((tx) =>
    reserve(tx, user.id, 1, new Date("2026-09-13T00:00:00.000Z")),
  );
  const buckets = await db().budgetBucket.findMany({ orderBy: { day: "asc" } });
  expect(buckets.map((b) => [b.day, b.requests, b.credits])).toEqual([
    ["2026-09-12", 1, 2],
    ["2026-09-13", 1, 1],
  ]);
});

it("refuses deletion during dispatch and retains unresolved accounting after interruption", async () => {
  const { deleteAccount } = await import("@/lib/account-deletion");
  const user = await db().user.create({
    data: { email: "interrupted@example.com" },
  });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "synthetic-key";
  let dispatched!: () => void, release!: () => void;
  const ready = new Promise<void>((r) => {
    dispatched = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const r = input();
  const pending = submit(user, r, verifiedContract, async () => {
    dispatched();
    await gate;
    throw Error("worker interrupted");
  });
  const failed = expect(pending).rejects.toThrow();
  await ready;
  await expect(deleteAccount(db(), user.email)).rejects.toThrow(
    "Active requests",
  );
  release();
  await failed;
  await deleteAccount(db(), user.email);
  expect(await db().researchOperation.count()).toBe(0);
  expect(
    await db().accountingRetention.findUnique({ where: { operationId: r.id } }),
  ).toMatchObject({ reservedCredits: 1, actualCredits: null });
  expect((await db().budgetBucket.findMany())[0].credits).toBe(1);
});

it("maintenance retains unresolved accounting beyond 90 days and is repeatable", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const user = await db().user.create({
    data: { email: "retention@example.com" },
  });
  process.env.FOMOLENS_MODE = "stored";
  process.env.FOMOLENS_KEY = "synthetic-key";
  const r = input();
  await expect(
    submit(user, r, verifiedContract, async () => {
      throw Error("interrupted");
    }),
  ).rejects.toThrow();
  const old = new Date(Date.now() - 100 * 86400000);
  await db().researchOperation.update({
    where: { id: r.id },
    data: { status: "running", createdAt: old, updatedAt: old },
  });
  for (let n = 0; n < 2; n++)
    await promisify(execFile)(
      process.execPath,
      ["--import", "tsx", "scripts/maintenance.ts"],
      {
        env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
        timeout: 20000,
      },
    );
  expect(await db().researchOperation.count()).toBe(0);
  expect(await db().accountingRetention.count()).toBe(1);
  expect(
    await db().accountingRetention.findUnique({ where: { operationId: r.id } }),
  ).toMatchObject({
    reservedCredits: 1,
    actualCredits: null,
    reason: "retention_pending_reconciliation",
  });
}, 45000);
