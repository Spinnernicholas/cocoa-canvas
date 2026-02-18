import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma Client instantiation for Prisma 7
 * Uses the PrismaPg adapter for direct PostgreSQL connections
 *
 * Uses lazy initialization with PoolConfig to avoid creating connections during build.
 * The actual pool is created on first database access.
 *
 * Learn more about Prisma adapters:
 * https://pris.ly/d/client-constructor
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
    // Use PoolConfig instead of Pool to defer connection creation
    client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL || '',
      } as any), // Cast to any since PoolConfig should also be accepted
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
