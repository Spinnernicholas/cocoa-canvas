/**
 * Shared seed utilities
 */

import { PrismaClient } from '@prisma/client';

let sharedPrismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!sharedPrismaClient) {
    sharedPrismaClient = new PrismaClient();
  }
  return sharedPrismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (sharedPrismaClient) {
    await sharedPrismaClient.$disconnect();
    sharedPrismaClient = null;
  }
}
