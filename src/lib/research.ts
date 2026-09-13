import "server-only";
import { db } from "@/db";
import type { User, Prisma } from "@/generated/prisma/client";
import { config } from "./config";
import { lock } from "./auth";
import { AppError } from "./errors";
import { type ResearchRequest, schemas } from "./research-contract";
import { exampleData } from "./examples";
import { readCursor, signCursor } from "./cursors";
import { verifiedContract, upstream, type VerifiedContract } from "./upstream";
export const effectiveMode = (user: Pick<User, "storedApproved">) =>
  config().FOMOLENS_MODE === "stored" && user.storedApproved
    ? "stored"
    : "example";
export function canonical(r: ResearchRequest) {
  return {
    kind: r.kind,
    ...(r.subject ? { subject: r.subject } : {}),
    ...(r.address ? { address: r.address } : {}),
    ...(r.kind === "leaderboard" ? { window: r.window } : {}),
    limit: 10,
  };
}
function cursorBinding(userId: string, r: ResearchRequest, mode: string) {
  return JSON.stringify({ userId, mode, ...canonical(r) });
}
export async function allowance(userId: string) {
  const day = new Date().toISOString().slice(0, 10),
    c = config();
  const b = await db().budgetBucket.findUnique({
    where: { key: "user:" + userId + ":" + day },
  });
  return {
    requestsUsed: b?.requests ?? 0,
    creditsReservedOrUsed: b?.credits ?? 0,
    requestLimit: c.USER_DAILY_REQUESTS,
    creditLimit: c.USER_DAILY_CREDITS,
    day,
  };
}
export async function reserve(
  tx: Prisma.TransactionClient,
  userId: string,
  max: number,
  now = new Date(),
) {
  const c = config(),
    day = now.toISOString().slice(0, 10);
  await lock(tx, "service-budget");
  const active = await tx.researchOperation.count({
    where: { mode: "stored", status: "running" },
  });
  const own = await tx.researchOperation.count({
    where: { userId, mode: "stored", status: "running" },
  });
  if (active >= c.SERVICE_CONCURRENCY || own >= c.USER_CONCURRENCY)
    throw new AppError(
      "in_progress",
      "A stored request is already in progress. Wait for it to finish.",
      409,
    );
  for (const [scope, requests, credits] of [
    ["service", c.SERVICE_DAILY_REQUESTS, c.SERVICE_DAILY_CREDITS],
    ["user:" + userId, c.USER_DAILY_REQUESTS, c.USER_DAILY_CREDITS],
  ] as const) {
    const key = scope + ":" + day;
    const b = await tx.budgetBucket.upsert({
      where: { key },
      create: { key, day },
      update: {},
    });
    if (b.requests + 1 > requests || b.credits + max > credits)
      throw new AppError(
        "budget",
        "This action exceeds the remaining daily application allowance.",
        429,
      );
    await tx.budgetBucket.update({
      where: { key },
      data: { requests: { increment: 1 }, credits: { increment: max } },
    });
  }
}
export async function submit(
  user: User,
  r: ResearchRequest,
  contract: VerifiedContract | null = verifiedContract,
  transport: typeof fetch = fetch,
) {
  const mode = effectiveMode(user),
    binding = cursorBinding(user.id, r, mode);
  const rawCursor = r.cursor ? readCursor(r.cursor, binding) : undefined;
  if (mode === "stored" && !contract)
    throw new AppError(
      "contract_unverified",
      "Stored research is not enabled: the authoritative API contract has not been verified.",
      503,
    );
  const url = mode === "stored" ? contract!.url(r, rawCursor) : null;
  if (url) {
    const parsed = new URL(url),
      base = new URL(config().FOMOLENS_URL);
    if (
      parsed.origin !== base.origin ||
      !(
        parsed.pathname.startsWith("/api/v1/") ||
        parsed.pathname === "/api/public/coverage"
      )
    )
      throw new AppError("contract", "Invalid stored endpoint.", 503);
  }
  const maximum = mode === "stored" ? contract!.maximumCost(r.kind) : 0;
  if (!Number.isSafeInteger(maximum) || maximum < 0)
    throw new AppError("contract", "Maximum cost is unknown.", 503);
  await db().$transaction(async (tx) => {
    await lock(tx, "operation:" + r.id);
    const existing = await tx.researchOperation.findUnique({
      where: { id: r.id },
    });
    if (existing)
      throw new AppError(
        "conflict",
        existing.userId === user.id && existing.status === "running"
          ? "Operation in progress."
          : "Operation already exists. Use its status and explicit recovery.",
        409,
      );
    if (mode === "stored") {
      // Recheck approval while serializing with owner approval/revocation.
      await lock(tx, "approval:" + user.id);
      if (
        !(await tx.user.findUnique({ where: { id: user.id } }))?.storedApproved
      )
        throw new AppError("approval", "Stored access has been revoked.", 403);
      await reserve(tx, user.id, maximum);
    }
    await tx.researchOperation.create({
      data: {
        id: r.id,
        userId: user.id,
        actionId: r.actionId,
        kind: r.kind,
        params: JSON.parse(JSON.stringify(r)),
        mode,
        upstreamUrl: url,
        status: "running",
        reservedCredits: maximum,
      },
    });
  });
  return execute(user.id, r, mode, url, rawCursor, contract, transport);
}
async function execute(
  userId: string,
  r: ResearchRequest,
  mode: string,
  url: string | null,
  rawCursor: string | undefined,
  contract: VerifiedContract | null,
  transport: typeof fetch,
) {
  let data: unknown,
    actual: number | null = mode === "example" ? 0 : null,
    requestId: string | null = null,
    error: string | undefined;
  try {
    if (mode === "example")
      data = exampleData(r, rawCursor ? Number(rawCursor) : 0);
    else {
      const result = await upstream(
        url!,
        r.id,
        r.kind,
        config().FOMOLENS_KEY!,
        contract!,
        transport,
      );
      actual = result.metadata.credits;
      requestId = result.metadata.requestId;
      if (!result.ok) {
        error = result.error;
        throw new AppError(
          result.error,
          result.error === "cursor_expired"
            ? "The cursor expired. Start a new search explicitly."
            : "Stored research could not be completed.",
          result.metadata.status >= 400 ? result.metadata.status : 502,
          result.metadata.retryAfter,
        );
      }
      data = schemas[r.kind].parse(result.data);
    }
    if (data && typeof data === "object" && "nextCursor" in data) {
      const page = data as {
        nextCursor: string | null;
        planLimitReached: boolean;
      };
      page.nextCursor = page.planLimitReached
        ? null
        : page.nextCursor
          ? signCursor(page.nextCursor, cursorBinding(userId, r, mode))
          : null;
    }
    await finish(userId, r.id, actual, requestId, undefined, mode);
    return {
      mode,
      data,
      operation: {
        id: r.id,
        status: actual === null ? "uncertain" : "complete",
        actualCredits: actual,
        requestId,
      },
    };
  } catch (e) {
    await finish(
      userId,
      r.id,
      actual,
      requestId,
      error ?? (e instanceof AppError ? e.code : "upstream_schema"),
      mode,
    );
    throw e;
  }
}
async function finish(
  userId: string,
  id: string,
  actual: number | null,
  requestId: string | null,
  error: string | undefined,
  mode: string,
) {
  await db().$transaction(async (tx) => {
    await lock(tx, "service-budget");
    const op = await tx.researchOperation.findFirstOrThrow({
      where: { id, userId },
    });
    if (actual !== null && mode === "stored") {
      const day = op.createdAt.toISOString().slice(0, 10);
      // Release a known unused reservation; unknown costs retain the maximum.
      const delta = actual - (op.actualCredits ?? op.reservedCredits);
      for (const scope of ["service", "user:" + userId])
        await tx.budgetBucket.update({
          where: { key: scope + ":" + day },
          data: { credits: { increment: delta } },
        });
    }
    await tx.researchOperation.update({
      where: { id },
      data: {
        status: actual === null ? "uncertain" : error ? "failed" : "complete",
        actualCredits: actual,
        requestId,
        errorCode: error ?? null,
        updatedAt: new Date(),
      },
    });
    await tx.activityEvent.create({
      data: {
        userId,
        type: error ? "research_failure" : "research_success",
        mode,
      },
    });
  });
}
export async function operation(userId: string, id: string) {
  const op = await db().researchOperation.findFirst({ where: { id, userId } });
  if (!op) throw new AppError("not_found", "Operation not found.", 404);
  return {
    id: op.id,
    mode: op.mode,
    kind: op.kind,
    params: op.params,
    status: op.status,
    actualCredits: op.actualCredits,
    reservedCredits: op.reservedCredits,
    errorCode: op.errorCode,
    createdAt: op.createdAt,
  };
}
export async function recover(
  user: User,
  id: string,
  contract: VerifiedContract | null = verifiedContract,
  transport: typeof fetch = fetch,
) {
  if (!contract)
    throw new AppError(
      "contract_unverified",
      "Recovery requires verified upstream idempotency semantics.",
      503,
    );
  const op = await db().$transaction(async (tx) => {
    await lock(tx, "operation:" + id);
    await lock(tx, "approval:" + user.id);
    await lock(tx, "service-budget");
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current?.storedApproved || config().FOMOLENS_MODE !== "stored")
      throw new AppError(
        "approval",
        "Approved stored access is required.",
        403,
      );
    const op = await tx.researchOperation.findFirst({
      where: { id, userId: user.id, mode: "stored" },
    });
    if (!op) throw new AppError("not_found", "Operation not found.", 404);
    if (op.status === "running")
      throw new AppError("in_progress", "Operation is still in progress.", 409);
    const c = config();
    if (
      (await tx.researchOperation.count({
        where: { mode: "stored", status: "running" },
      })) >= c.SERVICE_CONCURRENCY ||
      (await tx.researchOperation.count({
        where: { userId: user.id, mode: "stored", status: "running" },
      })) >= c.USER_CONCURRENCY
    )
      throw new AppError(
        "in_progress",
        "Wait for active requests to finish.",
        409,
      );
    await tx.researchOperation.update({
      where: { id },
      data: { status: "running", updatedAt: new Date() },
    });
    return op;
  });
  // Exact persisted URL and original idempotency key; no fresh cursor or parameter rebuilding.
  return execute(
    user.id,
    op.params as ResearchRequest,
    "stored",
    op.upstreamUrl,
    undefined,
    contract,
    transport,
  );
}
