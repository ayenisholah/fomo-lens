import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDB = globalThis as unknown as { atlasDB?: PrismaClient };
export function db() {
  return (globalDB.atlasDB ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
      statement_timeout: 15000,
    }),
  }));
}
