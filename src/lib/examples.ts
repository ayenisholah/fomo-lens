import {
  type ResearchRequest,
  type Profile,
  type Pnl,
  schemas,
} from "./research-contract";
export const exampleSubjects = [
  "example_trader",
  "solstice",
  "mint_condition",
  "quiet_current",
  "block_garden",
  "lunar_notes",
  "river_delta",
  "amber_signal",
  "north_star",
  "paper_orbit",
  "slow_wave",
  "silver_leaf",
];
const observedAt = "2026-08-20T12:00:00.000Z";
export function exampleProfile(subject: string): Profile {
  const name = subject
    .split("_")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(" ");
  return {
    subject,
    name,
    bio: "Synthetic identity for exploring observed trading evidence.",
    observedAt,
    followers: 120 + subject.length * 17,
    trades: subject.length * 23,
  };
}
export function examplePnl(subject: string): Pnl {
  const n = Array.from(subject).reduce((a, b) => a + b.charCodeAt(0), 0);
  return {
    subject,
    observedAt: "2026-08-19T18:30:00.000Z",
    coverage: "Synthetic samples; not a complete trading history.",
    windows: {
      "24h": n % 3 === 0 ? null : (n % 400) - 150,
      "7d": (n % 1300) - 300,
      "30d": n * 2,
      all: n % 2 === 0 ? null : n * 5,
    },
  };
}
export function exampleData(r: ResearchRequest, offset = 0): unknown {
  const subject = r.subject ?? "example_trader";
  const meta = {
    observedAt: "2026-08-18T09:15:00.000Z",
    coverage: "One synthetic observation; up to ten records per page.",
    planLimitReached: false,
  };
  let data: unknown;
  switch (r.kind) {
    case "profile":
      data = exampleProfile(subject);
      break;
    case "pnl":
      data = examplePnl(subject);
      break;
    case "wallets":
    case "reverse":
      data = {
        count: 2,
        observedAt,
        mappings: [
          {
            chain: "solana",
            address: "ExampleSolanaAddress1111111111111111111111111",
            subject: r.kind === "reverse" ? null : subject,
            observedAt,
          },
          {
            chain: "evm",
            address: "0x0000000000000000000000000000000000000001",
            subject,
            observedAt,
          },
        ],
      };
      break;
    case "following":
    case "followers": {
      const others = exampleSubjects.filter((s) => s !== subject);
      data = {
        ...meta,
        subject,
        direction: r.kind,
        items: others.slice(offset, offset + 10).map(exampleProfile),
        nextCursor: offset + 10 < others.length ? String(offset + 10) : null,
      };
      break;
    }
    case "leaderboard": {
      const sorted = exampleSubjects
        .map((subject) => ({
          profile: exampleProfile(subject),
          pnl: examplePnl(subject).windows[r.window],
        }))
        .sort((a, b) => (b.pnl ?? -Infinity) - (a.pnl ?? -Infinity));
      data = {
        ...meta,
        window: r.window,
        items: sorted.slice(offset, offset + 10),
        nextCursor: offset + 10 < sorted.length ? String(offset + 10) : null,
      };
      break;
    }
    case "coverage":
      data = {
        identities: exampleSubjects.length,
        observedAt,
        description: "Twelve synthetic identities. No upstream requests.",
      };
      break;
  }
  return schemas[r.kind].parse(data);
}
