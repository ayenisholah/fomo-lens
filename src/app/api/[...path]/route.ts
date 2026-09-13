import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  COOKIE,
  SESSION_SECONDS,
  clientIP,
  isOwner,
  lock,
  requestCode,
  requireOwner,
  requireUser,
  signout,
  verifyCode,
} from "@/lib/auth";
import { config } from "@/lib/config";
import { safeReturn } from "@/lib/crypto";
import { body, origin, route, success } from "@/lib/http";
import { AppError } from "@/lib/errors";
import {
  allowance,
  effectiveMode,
  operation,
  recover,
  submit,
} from "@/lib/research";
import { requestSchema } from "@/lib/research-contract";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, ctx: Context) {
  return route(async () => {
    const path = (await ctx.params).path.join("/");
    if (path === "health/live") return success({ status: "alive" });
    if (path === "health/ready") {
      await db().$queryRaw`SELECT 1 FROM users LIMIT 1`;
      const migrations = await db().$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM _prisma_migrations WHERE migration_name='202609100001_initial' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      if (Number(migrations[0].count) !== 1)
        throw new AppError("schema", "Required schema is unavailable.", 503);
      return success({ status: "ready" });
    }
    const user = await requireUser();
    if (path === "session")
      return success(
        {
          email: user.email,
          owner: isOwner(user.email),
          storedApproved: user.storedApproved,
          allowance: await allowance(user.id),
        },
        effectiveMode(user),
      );
    if (path === "history")
      return success(
        await db().researchOperation.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: new Date(Date.now() - 90 * 86400000) },
          },
          select: {
            id: true,
            kind: true,
            params: true,
            mode: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      );
    if (path.startsWith("research/") && path.split("/").length === 2)
      return success(
        await operation(user.id, z.string().uuid().parse(path.split("/")[1])),
      );
    if (path === "admin") {
      await requireOwner();
      await db().activityEvent.create({
        data: { userId: user.id, type: "admin_access" },
      });
      const [users, counts, active7, active30, budgets, lastActivity] =
        await Promise.all([
          db().user.findMany({
            select: {
              id: true,
              email: true,
              createdAt: true,
              lastLoginAt: true,
              storedApproved: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
          db().researchOperation.groupBy({
            by: ["mode", "status"],
            _count: true,
          }),
          db().activityEvent.findMany({
            where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
            distinct: ["userId"],
            select: { userId: true },
          }),
          db().activityEvent.findMany({
            where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
            distinct: ["userId"],
            select: { userId: true },
          }),
          db().budgetBucket.findMany({
            where: { key: { startsWith: "service:" } },
            orderBy: { day: "desc" },
            take: 7,
          }),
          db().activityEvent.groupBy({
            by: ["userId"],
            _max: { createdAt: true },
          }),
        ]);
      return success({
        users: users.map((u) => ({
          ...u,
          lastActivity:
            lastActivity.find((a) => a.userId === u.id)?._max.createdAt ?? null,
        })),
        counts,
        active7: active7.length,
        active30: active30.length,
        budgets,
        upstreamBalance: null,
        userLimit: 200,
      });
    }
    throw new AppError("not_found", "Route not found.", 404);
  });
}
export async function POST(req: Request, ctx: Context) {
  return route(async () => {
    origin(req);
    const path = (await ctx.params).path.join("/");
    if (path === "auth/request") {
      const input = z
        .object({ email: z.string().trim().toLowerCase().email().max(254) })
        .parse(await body(req));
      return success(await requestCode(input.email, clientIP(req)));
    }
    if (path === "auth/verify") {
      const input = z
        .object({
          challengeId: z.string().uuid(),
          code: z.string().regex(/^\d{6}$/),
          returnTo: z.string().optional(),
        })
        .parse(await body(req));
      const result = await verifyCode(
        input.challengeId,
        input.code,
        clientIP(req),
      );
      (await cookies()).set(COOKIE, result.token, {
        httpOnly: true,
        secure: config().NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_SECONDS,
        expires: result.expiresAt,
      });
      return success({ returnTo: safeReturn(input.returnTo) });
    }
    if (path === "auth/signout") {
      const jar = await cookies();
      await signout(jar.get(COOKIE)?.value);
      jar.delete(COOKIE);
      return success({ signedOut: true });
    }
    const user = await requireUser();
    if (path === "research") {
      const result = await submit(user, requestSchema.parse(await body(req)));
      return success(result, result.mode);
    }
    if (/^research\/[^/]+\/recover$/.test(path)) {
      const result = await recover(
        user,
        z.string().uuid().parse(path.split("/")[1]),
      );
      return success(result, result.mode);
    }
    if (path === "events") {
      const input = z
        .object({ type: z.enum(["comparison", "sharing"]) })
        .parse(await body(req));
      await db().activityEvent.create({
        data: { userId: user.id, type: input.type, mode: effectiveMode(user) },
      });
      return success({ recorded: true });
    }
    if (path === "admin/access") {
      await requireOwner();
      const input = z
        .object({ userId: z.string().uuid(), approved: z.boolean() })
        .parse(await body(req));
      await db().$transaction(async (tx) => {
        await lock(tx, "approval:" + input.userId);
        await tx.user.update({
          where: { id: input.userId },
          data: { storedApproved: input.approved },
        });
        await tx.activityEvent.create({
          data: {
            userId: user.id,
            type: input.approved ? "access_approved" : "access_revoked",
          },
        });
      });
      return success({ updated: true });
    }
    throw new AppError("not_found", "Route not found.", 404);
  });
}
