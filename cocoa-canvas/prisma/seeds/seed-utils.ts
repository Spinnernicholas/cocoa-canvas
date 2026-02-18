/**
 * Shared seed utilities
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function getPrismaClient(): PrismaClient {
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
