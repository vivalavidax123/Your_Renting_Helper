import { PrismaClient } from "@prisma/client";

// Next.js reloads server modules on every code change in dev. Without this
// global guard each reload would open a new database connection until SQLite
// runs out. In production the module is loaded once, so the guard is a no-op.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
