import { z } from "zod";
export const windows = ["24h", "7d", "30d", "all"] as const;
export const windowSchema = z.enum(windows);
export const subjectSchema = z
  .string()
  .trim()
  .regex(/^@?[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/)
  .transform((s) => s.replace(/^@/, "").toLowerCase());
const timestamp = z.string().datetime({ offset: true }).nullable();
export const profileSchema = z.object({
  subject: z.string(),
  name: z.string(),
  bio: z.string().optional(),
  imageUrl: z.string().url().optional(),
  observedAt: timestamp,
  followers: z.number().int().nonnegative().nullable(),
  trades: z.number().int().nonnegative().nullable(),
});
export const walletsSchema = z.object({
  count: z.number().int().nonnegative(),
  mappings: z.array(
    z.object({
      chain: z.string(),
      address: z.string(),
      subject: z.string().nullable(),
      observedAt: timestamp,
    }),
  ),
  observedAt: timestamp,
});
export const pnlSchema = z.object({
  subject: z.string(),
  observedAt: timestamp,
  coverage: z.string(),
  windows: z.object({
    "24h": z.number().nullable(),
    "7d": z.number().nullable(),
    "30d": z.number().nullable(),
    all: z.number().nullable(),
  }),
});
const page = z.object({
  nextCursor: z.string().nullable(),
  planLimitReached: z.boolean(),
  observedAt: timestamp,
  coverage: z.string(),
});
export const socialSchema = page.extend({
  subject: z.string(),
  direction: z.enum(["following", "followers"]),
  items: z.array(profileSchema).max(10),
});
export const leaderboardSchema = page.extend({
  window: windowSchema,
  items: z
    .array(z.object({ profile: profileSchema, pnl: z.number().nullable() }))
    .max(10),
});
export const coverageSchema = z.object({
  identities: z.number().int(),
  observedAt: timestamp,
  description: z.string(),
});
export const requestSchema = z
  .object({
    id: z.string().uuid(),
    actionId: z.string().uuid(),
    kind: z.enum([
      "profile",
      "pnl",
      "wallets",
      "reverse",
      "following",
      "followers",
      "leaderboard",
      "coverage",
    ]),
    subject: subjectSchema.optional(),
    address: z
      .string()
      .trim()
      .min(10)
      .max(128)
      .regex(/^[A-Za-z0-9:]+$/)
      .optional(),
    window: windowSchema.default("7d"),
    cursor: z.string().max(4096).optional(),
  })
  .superRefine((r, c) => {
    if (
      ["profile", "pnl", "wallets", "following", "followers"].includes(
        r.kind,
      ) &&
      !r.subject
    )
      c.addIssue({ code: "custom", message: "Subject required" });
    if (r.kind === "reverse" && !r.address)
      c.addIssue({ code: "custom", message: "Address required" });
  });
export type ResearchRequest = z.infer<typeof requestSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Pnl = z.infer<typeof pnlSchema>;
export type Wallets = z.infer<typeof walletsSchema>;
export type Social = z.infer<typeof socialSchema>;
export type Leaderboard = z.infer<typeof leaderboardSchema>;
export type Kind = ResearchRequest["kind"];
export const schemas = {
  profile: profileSchema,
  pnl: pnlSchema,
  wallets: walletsSchema,
  reverse: walletsSchema,
  following: socialSchema,
  followers: socialSchema,
  leaderboard: leaderboardSchema,
  coverage: coverageSchema,
};
// Application shapes above are NOT assertions about the unverified upstream wire format.
export const proposedCosts: Partial<Record<Kind, number>> = {
  profile: 1,
  pnl: 2,
  wallets: 10,
  reverse: 100,
  following: 1,
  followers: 1,
  leaderboard: 1,
};
