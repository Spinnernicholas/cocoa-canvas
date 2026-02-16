/**
 * Seed script to initialize Party types for voter registration
 * 
 * Run with: npx ts-node prisma/seeds/seed-parties.ts
 * Or call `seedParties()` from the application
 */

import { PrismaClient } from '@prisma/client';

export const PARTIES = [
  {
    abbr: 'DEM',
    name: 'Democratic',
    color: '#0015bc',
  },
  {
    abbr: 'REP',
    name: 'Republican',
    color: '#e81b23',
  },
  {
    abbr: 'AIP',
    name: 'American Independent',
    color: '#754e37',
  },
  {
    abbr: 'GRN',
    name: 'Green',
    color: '#6aa84f',
  },
  {
    abbr: 'LIB',
    name: 'Libertarian',
    color: '#ffd700',
  },
  {
    abbr: 'PFP',
    name: 'Peace and Freedom',
    color: '#ff1493',
  },
] as const;

export async function seedParties(verbose = true) {
  const prisma = new PrismaClient();
  if (verbose) {
    console.log('[Seed] Initializing Party types...');
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const party of PARTIES) {
    const result = await prisma.party.upsert({
      where: { abbr: party.abbr },
      update: {
        name: party.name,
        color: party.color,
      },
      create: {
        abbr: party.abbr,
        name: party.name,
        color: party.color,
      },
    });

    if (verbose) {
      console.log(`[Seed] ✓ ${party.abbr} - ${party.name}`);
    }
  }

  const count = await prisma.party.count();
  if (verbose) {
    console.log(`[Seed] Total parties: ${count}`);
  }

  return PARTIES;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedParties();
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run directly if this file is the main module
if (process.argv[1]?.endsWith('seed-parties.ts')) {
  main();
}
