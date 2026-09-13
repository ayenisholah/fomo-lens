import {
  schemas,
  type ResearchRequest,
  type Profile,
  type Pnl,
  type Wallets,
  type Social,
  type Leaderboard,
} from "./research-contract";
export type ClientOperation = {
  id: string;
  status: string;
  actualCredits?: number | null;
  requestId?: string | null;
};
export type ResultHandlers = {
  profile: (data: Profile) => void;
  pnl: (data: Pnl) => void;
  wallets: (data: Wallets) => void;
  social: (data: Social) => void;
  leaderboard: (data: Leaderboard) => void;
  coverage: (data: ReturnType<typeof schemas.coverage.parse>) => void;
};
// Both response paths validate before changing any displayed result.
export function applyResearchResult(
  request: ResearchRequest,
  raw: unknown,
  handlers: ResultHandlers,
) {
  switch (request.kind) {
    case "profile":
      return handlers.profile(schemas.profile.parse(raw));
    case "pnl": {
      const data = schemas.pnl.parse(raw);
      if (data.subject !== request.subject)
        throw Error("Result subject does not match request.");
      return handlers.pnl(data);
    }
    case "wallets":
    case "reverse":
      return handlers.wallets(schemas.wallets.parse(raw));
    case "following":
    case "followers": {
      const data = schemas.following.parse(raw);
      if (data.subject !== request.subject || data.direction !== request.kind)
        throw Error("Connection page does not match request.");
      return handlers.social(data);
    }
    case "leaderboard": {
      const data = schemas.leaderboard.parse(raw);
      if (data.window !== request.window)
        throw Error("Leaderboard page does not match request.");
      return handlers.leaderboard(data);
    }
    case "coverage":
      return handlers.coverage(schemas.coverage.parse(raw));
  }
}
export async function refreshResearchMetadata<H, A>(options: {
  isCurrent: () => boolean;
  history: (data: H) => void;
  allowance: (data: A | null) => void;
  transport?: typeof fetch;
}) {
  const transport = options.transport ?? fetch;
  const results = await Promise.allSettled([
    (async () => {
      const response = await transport("/api/history", {
        signal: AbortSignal.timeout(10000),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw Error("History unavailable");
      if (options.isCurrent()) options.history(json.data);
    })(),
    (async () => {
      const response = await transport("/api/session", {
        signal: AbortSignal.timeout(10000),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw Error("Session unavailable");
      if (options.isCurrent()) options.allowance(json.data.allowance ?? null);
    })(),
  ]);
  return results.every((result) => result.status === "fulfilled");
}
