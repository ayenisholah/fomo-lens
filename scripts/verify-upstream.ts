import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile, open, rename, mkdir, rmdir } from "node:fs/promises";
import { dirname } from "node:path";
import { requestUrl, decode } from "../src/lib/wire";
import {
  requestSchema,
  schemas,
  type Kind,
} from "../src/lib/research-contract";
import { withAcceptance, exposure, type Entry } from "./acceptance-core";
const ledger = process.env.VERIFICATION_LEDGER ?? "";
if (!ledger || !process.env.FOMOLENS_KEY)
  throw Error("Set VERIFICATION_LEDGER and FOMOLENS_KEY");
async function persist(entries: Entry[]) {
  const temp = ledger + ".next";
  const file = await open(temp, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(entries));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temp, ledger);
  const directory = await open(dirname(ledger), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}
await withAcceptance(
  {
    acquire: () => mkdir(ledger + ".lock", { mode: 0o700 }),
    release: () => rmdir(ledger + ".lock"),
    read: async () => JSON.parse(await readFile(ledger, "utf8")),
    persist,
    transport: (input) =>
      fetch(requestUrl(input), {
        headers: {
          Authorization: `Bearer ${process.env.FOMOLENS_KEY}`,
          "Idempotency-Key": input.id,
        },
        redirect: "error",
        signal: AbortSignal.timeout(65000),
      }),
    decode: async (input, response) =>
      schemas[input.kind].parse(
        decode(input.kind, await response.json(), requestUrl(input)),
      ),
  },
  async (call) => {
    const run = (kind: Kind, extra: Record<string, string> = {}) =>
      call(
        requestSchema.parse({
          id: randomUUID(),
          actionId: randomUUID(),
          kind,
          ...extra,
        }),
      );
    const board = await run("leaderboard");
    const subject =
      process.env.VERIFICATION_SUBJECT ||
      (board
        ? schemas.leaderboard.parse(board).items.find((i) => i.profile.handle)
            ?.profile.handle
        : undefined);
    if (!subject)
      throw Error(
        "Supply previously observed VERIFICATION_SUBJECT; no extra paid discovery calls",
      );
    await run("profile", { subject });
    await run("pnl", { subject });
    const wallets = await run("wallets", { subject });
    const address =
      process.env.VERIFICATION_ADDRESS ||
      (wallets
        ? schemas.wallets.parse(wallets).mappings[0]?.address
        : undefined);
    if (!address)
      throw Error("Supply previously observed VERIFICATION_ADDRESS to resume");
    await run("reverse", { address });
    await run("following", { subject });
    await run("followers", { subject });
    await run("coverage");
    console.log(
      JSON.stringify({
        committedExposure: exposure(JSON.parse(await readFile(ledger, "utf8"))),
      }),
    );
  },
).catch(() => {
  // Schema and transport errors may include private payloads; keep diagnostics generic.
  console.error(
    "Acceptance stopped. Review the private ledger and retained lock before any further calls.",
  );
  process.exitCode = 1;
});
