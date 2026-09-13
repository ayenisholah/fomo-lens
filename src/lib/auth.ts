import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { db } from "@/db";
import { config } from "./config";
import { digest, equal, keyed, normalizeEmail, token } from "./crypto";
import { AppError } from "./errors";
import type { Prisma } from "@/generated/prisma/client";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const COOKIE = "atlas_session";
export const isOwner = (email: string) =>
  config().ADMIN_EMAILS.split(",").map(normalizeEmail).includes(email);
type Tx = Prisma.TransactionClient;
export async function lock(tx: Tx, key: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`;
}
export async function limit(
  key: string,
  max: number,
  seconds: number,
  now = new Date(),
) {
  const slot = Math.floor(now.getTime() / 1000 / seconds);
  const result = await db().$queryRaw<
    { count: number }[]
  >`INSERT INTO rate_limit_buckets(key,count,expires_at) VALUES(${key + ":" + slot},1,${new Date((slot + 1) * seconds * 1000)}) ON CONFLICT(key) DO UPDATE SET count=rate_limit_buckets.count+1 RETURNING count`;
  if (result[0].count > max)
    throw new AppError(
      "rate_limit",
      "Too many attempts. Try again later.",
      429,
      Math.ceil(((slot + 1) * seconds * 1000 - now.getTime()) / 1000),
    );
}
export function clientIP(req: Request) {
  const c = config();
  const ip =
    c.TRUST_PROXY === "true" ? req.headers.get("x-atlas-client-ip") : "local";
  if (!ip || ip.length > 128)
    throw new AppError("proxy", "Client identity unavailable.", 503);
  return keyed(c.IP_HASH_SECRET, ip);
}
type Delivery = (
  email: string,
  code: string,
  challenge: string,
) => Promise<void>;
export const deliver: Delivery = async (email, code, challenge) => {
  const c = config();
  if (c.DEV_EMAIL_SIMULATION === "true") {
    if (c.NODE_ENV === "production" || !c.TEST_MAIL_DIR)
      throw new AppError(
        "delivery_unavailable",
        "Email delivery is unavailable.",
        503,
      );
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    await mkdir(c.TEST_MAIL_DIR, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(c.TEST_MAIL_DIR, challenge + ".json"),
      JSON.stringify({ email, code }),
      { mode: 0o600 },
    );
    return;
  }
  if (!c.RESEND_API_KEY || !c.RESEND_FROM)
    throw new AppError(
      "delivery_unavailable",
      "Email delivery is unavailable.",
      503,
    );
  const result = await new Resend(c.RESEND_API_KEY).emails.send(
    {
      from: c.RESEND_FROM,
      to: email,
      subject: "Your Lens Atlas verification code",
      text:
        "Your Lens Atlas code is " +
        code +
        ". It expires in ten minutes. Signing in creates a seven-day session. If you did not request this, ignore this email.",
    },
    { idempotencyKey: challenge },
  );
  if (result.error)
    throw new AppError(
      "delivery_unavailable",
      "Email delivery is unavailable. Try again later.",
      503,
    );
};
export async function requestCode(
  rawEmail: string,
  ip: string,
  send: Delivery = deliver,
  now = new Date(),
) {
  const email = normalizeEmail(rawEmail),
    c = config();
  await limit("request-ip:" + ip, 20, 3600, now);
  await limit(
    "request-email-hour:" + keyed(c.AUTH_SECRET, email),
    5,
    3600,
    now,
  );
  // A rolling cooldown, unlike a fixed minute bucket, prevents boundary bursts.
  const id = randomUUID(),
    code = randomInt(0, 1000000).toString().padStart(6, "0");
  await db().$transaction(async (tx) => {
    await lock(tx, "email:" + email);
    const recent = await tx.authChallenge.findFirst({
      where: { email, createdAt: { gt: new Date(now.getTime() - 60000) } },
    });
    if (recent)
      throw new AppError(
        "rate_limit",
        "Wait 60 seconds before requesting another code.",
        429,
        60,
      );
    await tx.authChallenge.create({
      data: {
        id,
        email,
        codeHash: keyed(c.AUTH_SECRET, id + ":" + email + ":" + code),
        createdAt: now,
        expiresAt: new Date(now.getTime() + 600000),
      },
    });
  });
  try {
    await send(email, code, id);
  } catch {
    throw new AppError(
      "delivery_unavailable",
      "Email delivery is unavailable. Try again later.",
      503,
    );
  }
  await db().$transaction(async (tx) => {
    await lock(tx, "email:" + email);
    // Delivery completion may arrive out of order.
    const newer = await tx.authChallenge.findFirst({
      where: {
        email,
        createdAt: { gt: now },
        deliveredAt: { not: null },
        supersededAt: null,
      },
    });
    await tx.authChallenge.update({
      where: { id },
      data: {
        deliveredAt: new Date(),
        ...(newer ? { supersededAt: new Date() } : {}),
      },
    });
    if (!newer)
      await tx.authChallenge.updateMany({
        where: {
          email,
          id: { not: id },
          createdAt: { lte: now },
          consumedAt: null,
          supersededAt: null,
        },
        data: { supersededAt: new Date() },
      });
  });
  return {
    challengeId: id,
    message: "If delivery is available, a code has been sent.",
    resendAfter: 60,
  };
}
export async function verifyCode(
  id: string,
  code: string,
  ip: string,
  now = new Date(),
) {
  await limit("verify-ip:" + ip, 30, 3600, now);
  const sessionToken = token();
  const result = await db().$transaction(async (tx) => {
    await lock(tx, "challenge:" + id);
    const ch = await tx.authChallenge.findUnique({ where: { id } });
    if (
      !ch ||
      !ch.deliveredAt ||
      ch.consumedAt ||
      ch.supersededAt ||
      ch.attempts >= 5
    )
      return { error: "invalid_code" as const };
    if (ch.expiresAt <= now) return { error: "expired_code" as const };
    if (
      !equal(
        ch.codeHash,
        keyed(config().AUTH_SECRET, id + ":" + ch.email + ":" + code),
      )
    ) {
      await tx.authChallenge.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      });
      return { error: "invalid_code" as const };
    }
    await lock(tx, "email:" + ch.email);
    const existing = await tx.user.findUnique({ where: { email: ch.email } });
    const user = await tx.user.upsert({
      where: { email: ch.email },
      create: { email: ch.email, createdAt: now, lastLoginAt: now },
      update: { lastLoginAt: now },
    });
    await tx.authChallenge.update({ where: { id }, data: { consumedAt: now } });
    const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000);
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: digest(sessionToken),
        createdAt: now,
        expiresAt,
      },
    });
    await tx.activityEvent.create({
      data: {
        userId: user.id,
        type: existing ? "signin" : "signup",
        createdAt: now,
      },
    });
    return { user, expiresAt };
  });
  if ("error" in result)
    throw new AppError(
      result.error!,
      result.error === "expired_code"
        ? "This code expired. Request a new code."
        : "Invalid or already used code.",
      400,
    );
  return { ...result, token: sessionToken };
}
export async function userForToken(raw: string | undefined, now = new Date()) {
  if (!raw) return null;
  const s = await db().session.findUnique({
    where: { tokenHash: digest(raw) },
    include: { user: true },
  });
  return s && s.expiresAt > now ? s.user : null;
}
export async function currentUser() {
  return userForToken((await cookies()).get(COOKIE)?.value);
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("unauthenticated", "Sign in to continue.", 401);
  return user;
}
export async function requireOwner() {
  const user = await requireUser();
  if (!isOwner(user.email))
    throw new AppError("forbidden", "Owner access required.", 403);
  return user;
}
export async function signout(raw: string | undefined) {
  if (!raw) return;
  await db().$transaction(async (tx) => {
    const s = await tx.session.findUnique({
      where: { tokenHash: digest(raw) },
    });
    if (s) {
      await tx.session.deleteMany({ where: { id: s.id } });
      await tx.activityEvent.create({
        data: { userId: s.userId, type: "signout" },
      });
    }
  });
}
