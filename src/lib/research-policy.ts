import type { ResearchRequest } from "./research-contract";
export function parseRetryAfter(
  raw: string | null,
  now = Date.now(),
): number | undefined {
  if (!raw) return undefined;
  const seconds = /^\d+$/.test(raw)
    ? Number(raw)
    : Math.ceil((Date.parse(raw) - now) / 1000);
  // Bound to the latest representable Date without shortening valid cooldowns.
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.min(Math.ceil(seconds), Math.floor((8.64e15 - now) / 1000));
}
export function operationSummary(
  id: string,
  actualCredits: number | null,
  requestId: string | null,
  owner: boolean,
) {
  return {
    id,
    status: actualCredits === null ? "uncertain" : "complete",
    ...(owner ? { actualCredits, requestId } : {}),
  };
}
export const recoveryDeadline = (createdAt: Date) =>
  new Date(createdAt.getTime() + 24 * 3600000 - 65000);
export function canonical(r: ResearchRequest) {
  return {
    kind: r.kind,
    ...(r.subject ? { subject: r.subject } : {}),
    ...(r.address ? { address: r.address } : {}),
    ...(r.kind === "leaderboard" ? { window: r.window } : {}),
    limit: 10,
  };
}
export function cursorBinding(
  userId: string,
  r: ResearchRequest,
  mode: string,
) {
  return JSON.stringify({ userId, mode, ...canonical(r) });
}

export function retainedActual(
  previous: number | null,
  observed: number | null,
) {
  return previous === null
    ? observed
    : observed === null
      ? previous
      : Math.max(previous, observed);
}
