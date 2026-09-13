import "server-only";
import {
  operationSummary,
  recoveryDeadline,
  cursorBinding,
  retainedActual,
} from "./research-policy";
export { canonical } from "./research-policy";
import { db } from "@/db";
import type { User, Prisma } from "@/generated/prisma/client";
import { config } from "./config";
import { lock, isOwner } from "./auth";
import { AppError } from "./errors";
import { type ResearchRequest, schemas } from "./research-contract";
import { exampleData } from "./examples";
import { readCursor, signCursor } from "./cursors";
import { verifiedContract, upstream, type VerifiedContract } from "./upstream";
export const effectiveMode = () =>
  config().FOMOLENS_MODE === "stored" ? "stored" : "example";
export async function allowance() {
  const day = new Date().toISOString().slice(0, 10);
  const b = await db().budgetBucket.findUnique({
    where: { key: "service:" + day },
  });
  return {
    requestsUsed: b?.requests ?? 0,
    creditsReservedOrUsed: b?.credits ?? 0,
    requestLimit: null,
    creditLimit: null,
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
  const blocked = await tx.researchOperation.findFirst({
    where: { mode: "stored", retryAt: { gt: now } },
    orderBy: { retryAt: "desc" },
  });
  if (blocked?.retryAt)
    throw new AppError(
      "rate_limit",
      "Research is temporarily busy. Try again later.",
      429,
      Math.ceil((blocked.retryAt.getTime() - now.getTime()) / 1000),
    );
  await tx.researchOperation.updateMany({
    where: {
      mode: "stored",
      status: "running",
      updatedAt: { lt: new Date(now.getTime() - 90000) },
    },
    data: { status: "uncertain", errorCode: "worker_interrupted" },
  });
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
  const key = "service:" + day;
  await tx.budgetBucket.upsert({
    where: { key },
    create: { key, day, requests: 1, credits: max },
    update: { requests: { increment: 1 }, credits: { increment: max } },
  });
}
export async function submit(
  user: User,
  r: ResearchRequest,
  contract: VerifiedContract | null = verifiedContract,
  transport: typeof fetch = fetch,
) {
  const mode = effectiveMode(),
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
      // Serialize account deletion with new research.
      await lock(tx, "approval:" + user.id);
      if (!(await tx.user.findUnique({ where: { id: user.id } })))
        throw new AppError("unauthenticated", "Sign in to continue.", 401);
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
    error: string | undefined,
    retryAfter: number | undefined,
    balance: number | null = null;
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
      retryAfter = result.metadata.retryAfter;
      balance = result.metadata.balance;
      if (!result.ok) {
        error = result.error;
        throw new AppError(
          result.error,
          result.error === "cursor_expired"
            ? "The cursor expired. Start a new search explicitly."
            : result.error === "credits" || result.error === "rate_limit"
              ? "Research is temporarily unavailable due to provider limits. Try again later."
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
    const settled = await finish(
      userId,
      r.id,
      actual,
      requestId,
      undefined,
      mode,
      retryAfter,
      balance,
    );
    return {
      mode,
      data,
      operation: operationSummary(
        r.id,
        settled.actualCredits,
        settled.requestId,
        isOwner(
          (await db().user.findUniqueOrThrow({ where: { id: userId } })).email,
        ),
      ),
    };
  } catch (e) {
    await finish(
      userId,
      r.id,
      actual,
      requestId,
      error ?? (e instanceof AppError ? e.code : "upstream_schema"),
      mode,
      retryAfter,
      balance,
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
  retryAfter?: number,
  balance: number | null = null,
) {
  return db().$transaction(async (tx) => {
    await lock(tx, "service-budget");
    const op = await tx.researchOperation.findFirstOrThrow({
      where: { id, userId },
    });
    actual = retainedActual(op.actualCredits, actual);
    requestId = requestId ?? op.requestId;
    if (actual !== null && mode === "stored") {
      const day = op.createdAt.toISOString().slice(0, 10);
      // Release a known unused reservation; unknown costs retain the maximum.
      const delta = actual - (op.actualCredits ?? op.reservedCredits);
      for (const scope of ["service"])
        await tx.budgetBucket.update({
          where: { key: scope + ":" + day },
          data: { credits: { increment: delta } },
        });
    }
    const settled = await tx.researchOperation.update({
      where: { id },
      data: {
        status: actual === null ? "uncertain" : error ? "failed" : "complete",
        actualCredits: actual,
        requestId,
        errorCode: error ?? null,
        retryAt:
          retryAfter && Number.isFinite(retryAfter)
            ? new Date(Date.now() + retryAfter * 1000)
            : null,
        ...(balance !== null ? { upstreamBalance: balance } : {}),
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
    return settled;
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

    errorCode: op.errorCode,
    createdAt: op.createdAt,
    retryAt: op.retryAt,
    recoveryExpiresAt: recoveryDeadline(op.createdAt),
    recoveryState:
      Date.now() >= recoveryDeadline(op.createdAt).getTime()
        ? "expired"
        : op.errorCode === "idempotency_abandoned" ||
            (op.status === "failed" && op.actualCredits === 0)
          ? "new_request"
          : op.retryAt && op.retryAt > new Date()
            ? "wait"
            : "recover",
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
    if (!current || config().FOMOLENS_MODE !== "stored")
      throw new AppError("approval", "Sign in to use research.", 403);
    const op = await tx.researchOperation.findFirst({
      where: { id, userId: user.id, mode: "stored" },
    });
    if (!op) throw new AppError("not_found", "Operation not found.", 404);
    if (Date.now() >= recoveryDeadline(op.createdAt).getTime())
      throw new AppError(
        "recovery_expired",
        "Recovery has expired. Start a new request explicitly.",
        409,
      );
    if (op.status === "failed" && op.actualCredits === 0)
      throw new AppError(
        "new_request",
        "The request was not charged. Start a new request explicitly.",
        409,
      );
    if (op.errorCode === "idempotency_abandoned")
      throw new AppError("abandoned", "Start a new request explicitly.", 409);
    if (op.status === "running" && Date.now() - op.updatedAt.getTime() < 90000)
      throw new AppError("in_progress", "Operation is still in progress.", 409);
    await tx.researchOperation.update({
      where: { id },
      data: { status: "uncertain" },
    });
    await reserve(tx, user.id, 0);
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
      data: {
        status: "running",
        updatedAt: new Date(),
        attempts: { increment: 1 },
      },
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
