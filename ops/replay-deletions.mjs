import { readFileSync } from "node:fs";
// Emit SQL only for validated deletion intents. The caller pipes it to an isolated restore.
const emails = new Set();
for (const file of process.argv.slice(2)) {
  for (const line of readFileSync(file, "utf8").split("\n").filter(Boolean)) {
    const entry = JSON.parse(line);
    if (
      typeof entry.email !== "string" ||
      !entry.email.includes("@") ||
      entry.email.includes("\0")
    )
      throw new Error("Invalid deletion ledger");
    emails.add(entry.email.trim().toLowerCase());
  }
}
console.log("BEGIN; SET standard_conforming_strings = on;");
for (const email of emails) {
  const literal = "'" + email.replaceAll("'", "''") + "'";
  console.log(`DELETE FROM auth_challenges WHERE email = ${literal};`);
  console.log(
    `INSERT INTO accounting_retention(operation_id,reserved_credits,actual_credits,created_at,reason) SELECT o.id,o.reserved_credits,o.actual_credits,o.created_at,'restored_account_deleted' FROM research_operations o JOIN users u ON u.id=o.user_id WHERE u.email=${literal} AND o.status IN ('running','uncertain') ON CONFLICT(operation_id) DO NOTHING;`,
  );
  console.log(`DELETE FROM users WHERE email = ${literal};`);
}
console.log("COMMIT;");
