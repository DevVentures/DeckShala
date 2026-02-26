import { PrismaClient } from "@prisma/client";

import { env } from "@/env";
import { logger } from "@/lib/logger";

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Database health check
 * @returns true if database is healthy, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error("Database health check failed", error as Error);
    return false;
  }
}

/**
 * Graceful database shutdown
 * Call this when shutting down the application
 */
export async function closeDatabaseConnection(): Promise<void> {
  await db.$disconnect();
}
