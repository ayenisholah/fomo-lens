import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export const token = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const keyed = (secret: string, value: string) =>
  createHmac("sha256", secret).update(value).digest("hex");
export const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function safeReturn(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return "/app";
  try {
    const u = new URL(value, "https://atlas.invalid");
    return u.origin === "https://atlas.invalid" &&
      !u.pathname.startsWith("/api") &&
      !u.pathname.startsWith("/signin")
      ? u.pathname + u.search
      : "/app";
  } catch {
    return "/app";
  }
}
