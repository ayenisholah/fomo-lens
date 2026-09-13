import "dotenv/config";
import { deleteAccount } from "../src/lib/account-deletion";
import { open } from "node:fs/promises";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const email = process.argv[2]?.trim().toLowerCase();
if (!email || process.argv[3] !== "--confirm") {
  console.error("Usage: npm run account:delete -- email@example.com --confirm");
  process.exit(1);
}
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  if (!process.env.DELETION_LEDGER)
    throw new Error(
      "DELETION_LEDGER must point to a protected persistent ledger",
    );
  const ledger = await open(process.env.DELETION_LEDGER, "a", 0o600);
  try {
    await ledger.write(
      JSON.stringify({ email, requestedAt: new Date().toISOString() }) + "\n",
    );
    await ledger.sync();
  } finally {
    await ledger.close();
  }
  await deleteAccount(db, email);
  console.log(
    "Account deleted. Record deletion securely and reapply after any backup restoration.",
  );
} finally {
  await db.$disconnect();
}
