import "server-only";
import { type Kind, type ResearchRequest } from "./research-contract";
import { AppError } from "./errors";
export interface VerifiedContract {
  // Supply only after reviewing authoritative documentation and fixtures.
  url(request: ResearchRequest, rawCursor?: string): string;
  maximumCost(kind: Kind): number;
  decode(kind: Kind, body: unknown): unknown;
  headers: {
    credits: string;
    requestId: string;
    balance?: string;
    replay?: string;
  };
  authorization(key: string): Record<string, string>;
}
// Deliberately closed: neither endpoint paths, billing headers, nor replay semantics are guessed.
export const verifiedContract: VerifiedContract | null = null;
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
    creditsHeader !== null && /^\d+$/.test(creditsHeader)
      ? Number(creditsHeader)
      : null;
  const safe = (s: string | null) =>
    s && /^[A-Za-z0-9._:-]{1,128}$/.test(s) ? s : null;
  const requestId = safe(response.headers.get(contract.headers.requestId));
  const retry = response.headers.get("retry-after");
  const retryAfter = retry && /^\d+$/.test(retry) ? Number(retry) : undefined;
  const metadata = { credits, requestId, retryAfter, status: response.status };
  if (!response.ok)
    return {
      ok: false as const,
      metadata,
      error:
        response.status === 429
          ? "rate_limit"
          : response.status === 402
            ? "credits"
            : response.status === 404
              ? "missing_data"
              : response.status === 409
                ? "conflict"
                : response.status === 410
                  ? "cursor_expired"
                  : "upstream_unavailable",
    };
  try {
    return {
      ok: true as const,
      metadata,
      data: contract.decode(kind, await response.json()),
    };
  } catch {
    return { ok: false as const, metadata, error: "upstream_schema" };
  }
}
