import { z } from "zod";
const positive = z.coerce.number().int().positive();
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().startsWith("postgres"),
  FOMOLENS_MODE: z.enum(["example", "stored"]).default("example"),
  FOMOLENS_URL: z.string().url().default("https://api.fomolens.app"),
  FOMOLENS_KEY: z.string().optional(),
  AUTH_SECRET: z.string().min(32),
  IP_HASH_SECRET: z.string().min(32),
  CURSOR_SECRET: z.string().min(32),
  ADMIN_EMAILS: z.string().default(""),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  DEV_EMAIL_SIMULATION: z.enum(["true", "false"]).default("false"),
  TEST_MAIL_DIR: z.string().optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  LOG_LEVEL: z.enum(["error", "warn", "info"]).default("error"),
  USER_DAILY_REQUESTS: positive.default(20),
  USER_DAILY_CREDITS: positive.default(20),
  SERVICE_DAILY_REQUESTS: positive.default(200),
  SERVICE_DAILY_CREDITS: positive.default(200),
  USER_CONCURRENCY: positive.default(1),
  SERVICE_CONCURRENCY: positive.default(4),
});
export function parseConfig(env: NodeJS.ProcessEnv) {
  const c = schema.parse(env);
  if (new Set([c.AUTH_SECRET, c.IP_HASH_SECRET, c.CURSOR_SECRET]).size !== 3)
    throw new Error("Use independent secrets");
  if (c.FOMOLENS_MODE === "stored" && !c.FOMOLENS_KEY)
    throw new Error("Stored mode requires FOMOLENS_KEY");
  if (c.NODE_ENV === "production") {
    if (!c.APP_URL.startsWith("https://") || c.TRUST_PROXY !== "true")
      throw new Error("Production requires HTTPS and a private trusted proxy");
    if (c.DEV_EMAIL_SIMULATION === "true" || c.TEST_MAIL_DIR)
      throw new Error("Test email capture prohibited in production");
    if (!c.RESEND_API_KEY || !c.RESEND_FROM)
      throw new Error("Production requires a verified email sender");
  }
  return c;
}
export const config = () => parseConfig(process.env);
