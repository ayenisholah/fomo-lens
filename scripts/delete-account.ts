import "dotenv/config";
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
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { email } });
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"approval:" + user.id},0))`;
    const operations = await tx.researchOperation.findMany({
      where: { userId: user.id, status: { in: ["uncertain", "running"] } },
    });
    if (operations.some((o) => o.status === "running"))
      throw new Error(
        "Active requests exist. Revoke access, wait for requests, then retry.",
      );
    for (const op of operations)
      await tx.accountingRetention.create({
        data: {
          operationId: op.id,
          reservedCredits: op.reservedCredits,
          actualCredits: op.actualCredits,
          createdAt: op.createdAt,
          reason: "account_deleted_pending_reconciliation",
        },
      });
    await tx.authChallenge.deleteMany({ where: { email } });
    await tx.budgetBucket.deleteMany({
      where: { key: { startsWith: "user:" + user.id + ":" } },
    });
    await tx.user.delete({ where: { id: user.id } });
  });
  console.log(
    "Account deleted. Record deletion securely and reapply after any backup restoration.",
  );
} finally {
  await db.$disconnect();
}
