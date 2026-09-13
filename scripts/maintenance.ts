import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  await db.$transaction(async (tx) => {
    const now = new Date(),
      cutoff = new Date(Date.now() - 90 * 86400000);
    // A crashed worker may have dispatched upstream: preserve all its reservations.
    await tx.researchOperation.updateMany({
      where: {
        status: "running",
        updatedAt: { lt: new Date(Date.now() - 5 * 60000) },
      },
      data: { status: "uncertain", errorCode: "worker_interrupted" },
    });
    const unresolved = await tx.researchOperation.findMany({
      where: { status: "uncertain", createdAt: { lt: cutoff } },
    });
    for (const op of unresolved)
      await tx.accountingRetention.upsert({
        where: { operationId: op.id },
        create: {
          operationId: op.id,
          reservedCredits: op.reservedCredits,
          actualCredits: op.actualCredits,
          createdAt: op.createdAt,
          reason: "retention_pending_reconciliation",
        },
        update: {},
      });
    await tx.researchOperation.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    await tx.activityEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
    await tx.authChallenge.deleteMany({ where: { expiresAt: { lt: now } } });
    await tx.session.deleteMany({ where: { expiresAt: { lt: now } } });
    await tx.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } });
    await tx.budgetBucket.deleteMany({
      where: { day: { lt: cutoff.toISOString().slice(0, 10) } },
    });
  });
  console.log("Maintenance completed.");
} finally {
  await db.$disconnect();
}
