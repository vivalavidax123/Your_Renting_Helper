import { PrismaClient } from "@prisma/client";

// Reuse the Prisma client across Next.js development reloads to avoid opening
// a new PostgreSQL connection pool for every module refresh.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
