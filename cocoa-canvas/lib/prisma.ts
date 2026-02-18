import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma Client instantiation for Prisma 7
 * Uses the PrismaPg adapter for direct PostgreSQL connections
 *
 * Uses lazy initialization to avoid creating connections during build.
 * The actual connection pool is created on first database access.
 *
 * Learn more about Prisma adapters:
 * https://pris.ly/d/adapter-pg
 */

declare global {
  var prisma: PrismaClient | undefined;
}

let client: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (global.prisma) {
    return global.prisma;
  }

  if (!client) {
    // Ensure DATABASE_URL is set
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create Prisma Client with pg adapter (Prisma 7 pattern)
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });

    if (process.env.NODE_ENV !== 'production') {
      global.prisma = client;
    }
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return (client as any)[prop];
  },
});
