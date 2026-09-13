import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const existing = await readFile(".env", "utf8").catch(() => null);
if (existing !== null) {
  console.log(".env already exists; left unchanged.");
  process.exit(0);
}
let text = await readFile(".env.example", "utf8");
for (const key of ["AUTH_SECRET", "IP_HASH_SECRET", "CURSOR_SECRET"])
  text = text.replace(key + "=", key + "=" + randomBytes(32).toString("hex"));
await writeFile(".env", text, { flag: "wx", mode: 0o600 });
console.log(
  "Created protected .env. Configure PostgreSQL and email before starting.",
);
