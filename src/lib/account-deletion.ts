import type { PrismaClient } from "../generated/prisma/client";
// The caller must durably record a deletion intent before invoking this transaction.
export async function deleteAccount(db: PrismaClient, email: string) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"email:" + email},0))::text`;
    const user = await tx.user.findUnique({ where: { email } });
    if (user) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"approval:" + user.id},0))::text`;
      const operations = await tx.researchOperation.findMany({
        where: { userId: user.id, status: { in: ["uncertain", "running"] } },
      });
      if (operations.some((o) => o.status === "running"))
        throw new Error(
          "Active requests exist. Wait for requests to finish, then retry deletion.",
        );
      for (const op of operations)
        await tx.accountingRetention.upsert({
          where: { operationId: op.id },
          create: {
            operationId: op.id,
            reservedCredits: op.reservedCredits,
            actualCredits: op.actualCredits,
            createdAt: op.createdAt,
            reason: "account_deleted_pending_reconciliation",
          },
          update: {},
        });
      await tx.user.delete({ where: { id: user.id } });
    }
    await tx.authChallenge.deleteMany({ where: { email } });
  });
}
