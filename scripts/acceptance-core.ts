import { z } from "zod";
import {
  requestSchema,
  type Kind,
  type ResearchRequest,
} from "../src/lib/research-contract";
export const costs: Record<Kind, number> = {
  profile: 1,
  pnl: 2,
  wallets: 10,
  reverse: 100,
  following: 1,
  followers: 1,
  leaderboard: 1,
  coverage: 0,
};
const entrySchema = z
  .object({
    id: z.string().uuid(),
    kind: requestSchema.shape.kind,
    maximum: z.number().int().nonnegative().safe(),
    actual: z.number().int().nonnegative().safe().optional(),
    status: z.number().int().min(200).max(599).optional(),
    validated: z.boolean().optional(),
  })
  .strict();
export type Entry = z.infer<typeof entrySchema>;
export function validateLedger(raw: unknown): Entry[] {
  const entries = z.array(entrySchema).parse(raw);
  const identities = new Set<string>();
  for (const entry of entries) {
    if (
      identities.has(entry.id) ||
      entry.maximum !== costs[entry.kind] ||
      (entry.actual !== undefined && entry.status === undefined) ||
      (entry.validated && (entry.status === undefined || entry.status >= 300))
    )
      throw Error("Invalid verification ledger state");
    identities.add(entry.id);
  }
  return entries;
}
export const exposure = (entries: Entry[]) =>
  entries.reduce((sum, e) => sum + (e.actual ?? e.maximum), 0);
export function assertReconciled(entries: Entry[]) {
  if (entries.some((e) => e.status === undefined || e.actual === undefined))
    throw Error(
      "Prior verification outcome is ambiguous; reconcile before further calls",
    );
  if (entries.some((e) => e.status! < 300 && !e.validated))
    throw Error(
      "Prior success requires saved validation evidence; do not repeat paid calls",
    );
  if (exposure(entries) > 120)
    throw Error("120-credit verification ceiling exceeded");
}
// No default transport or storage: importing this module can never dispatch a request.
export async function withAcceptance<T>(
  ports: {
    acquire: () => Promise<void>;
    release: () => Promise<void>;
    read: () => Promise<unknown>;
    persist: (entries: Entry[]) => Promise<void>;
    transport: (request: ResearchRequest) => Promise<Response>;
    decode: (request: ResearchRequest, response: Response) => Promise<unknown>;
  },
  task: (
    call: (request: ResearchRequest) => Promise<unknown | null>,
  ) => Promise<T>,
) {
  await ports.acquire(); // Failed acquisition must never remove another runner's lock.
  let clean = false;
  try {
    let entries = validateLedger(await ports.read());
    assertReconciled(entries);
    let active = false,
      poisoned = false;
    const call = async (raw: ResearchRequest) => {
      if (active || poisoned)
        throw Error("Acceptance run is busy or requires review");
      active = true;
      try {
        const request = requestSchema.parse(raw);
        assertReconciled(entries);
        if (entries.some((e) => e.id === request.id))
          throw Error("Duplicate verification identity");
        if (
          entries.some(
            (e) => e.kind === request.kind && e.validated && e.status! < 300,
          )
        )
          return null;
        const maximum = costs[request.kind];
        if (exposure(entries) + maximum > 120)
          throw Error("120-credit verification ceiling reached");
        const entry: Entry = { id: request.id, kind: request.kind, maximum };
        entries = [...entries, entry];
        await ports.persist(structuredClone(entries));
        const response = await ports.transport(request);
        entry.status = response.status;
        const cost = response.headers.get("X-Credits-Cost");
        if (request.kind === "coverage") entry.actual = 0;
        if (
          cost !== null &&
          /^\d+$/.test(cost) &&
          Number.isSafeInteger(Number(cost))
        )
          entry.actual = Number(cost);
        await ports.persist(structuredClone(entries));
        if (!response.ok)
          throw Error(
            `Verification HTTP ${response.status}; review Retry-After before resuming`,
          );
        const data = await ports.decode(request, response);
        entry.validated = true;
        await ports.persist(structuredClone(entries));
        assertReconciled(entries);
        return data;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally {
        active = false;
      }
    };
    const result = await task(call);
    if (active || poisoned) throw Error("Acceptance run requires review");
    clean = true;
    return result;
  } finally {
    // Any failed/interrupted run keeps the lock for explicit operator review.
    if (clean) await ports.release();
  }
}
