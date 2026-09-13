import "server-only";
import { parseRetryAfter } from "./research-policy";
import { requestUrl, decode } from "./wire";
import { type Kind, type ResearchRequest } from "./research-contract";
import { AppError } from "./errors";
export interface VerifiedContract {
  // Supply only after reviewing authoritative documentation and fixtures.
  url(request: ResearchRequest, rawCursor?: string): string;
  maximumCost(kind: Kind): number;
  decode(kind: Kind, body: unknown, url?: string): unknown;
  headers: {
    credits: string;
    requestId: string;
    balance?: string;
    replay?: string;
  };
  authorization(key: string): Record<string, string>;
}
export const verifiedContract: VerifiedContract = {
  url: requestUrl,
  decode,
  maximumCost: (kind) =>
    ({
      profile: 1,
      pnl: 2,
      wallets: 10,
      reverse: 100,
      following: 1,
      followers: 1,
      leaderboard: 1,
      coverage: 0,
    })[kind],
  headers: {
    credits: "X-Credits-Cost",
    requestId: "X-Request-Id",
    balance: "X-Credits-Remaining",
  },
  authorization: (key) => ({ Authorization: "Bearer " + key }),
};
export async function upstream(
  url: string,
  id: string,
  kind: Kind,
  key: string,
  contract: VerifiedContract,
  transport: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await transport(url, {
      method: "GET",
      headers: { ...contract.authorization(key), "Idempotency-Key": id },
      signal: AbortSignal.timeout(65000),
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    throw new AppError(
      "accounting_uncertain",
      "The request outcome is uncertain. Its reservation is retained; use explicit recovery.",
      504,
    );
  }
  const creditsHeader = response.headers.get(contract.headers.credits);
  const credits =
    creditsHeader !== null &&
    /^\d+$/.test(creditsHeader) &&
    Number.isSafeInteger(Number(creditsHeader))
      ? Number(creditsHeader)
      : null;
  const safe = (s: string | null) =>
    s && /^[A-Za-z0-9._:-]{1,128}$/.test(s) ? s : null;
  const requestId = safe(response.headers.get(contract.headers.requestId));
  const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
  const rawBalance = contract.headers.balance
    ? response.headers.get(contract.headers.balance)
    : null;
  const balance =
    rawBalance &&
    /^\d+$/.test(rawBalance) &&
    Number.isSafeInteger(Number(rawBalance))
      ? Number(rawBalance)
      : null;
  const metadata = {
    balance,
    credits: kind === "coverage" ? 0 : credits,
    requestId,
    retryAfter,
    status: response.status,
  };
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code =
      body &&
      typeof body.error === "string" &&
      [
        "cursor_expired",
        "idempotency_abandoned",
        "idempotency_in_progress",
        "idempotency_conflict",
      ].includes(body.error)
        ? body.error
        : null;
    return {
      ok: false as const,
      metadata,
      error:
        code ??
        (response.status === 429
          ? "rate_limit"
          : response.status === 402
            ? "credits"
            : response.status === 404
              ? "missing_data"
              : response.status === 409
                ? "conflict"
                : response.status === 410
                  ? "cursor_expired"
                  : "upstream_unavailable"),
    };
  }
  try {
    return {
      ok: true as const,
      metadata,
      data: contract.decode(kind, await response.json(), url),
    };
  } catch {
    return { ok: false as const, metadata, error: "upstream_schema" };
  }
}
