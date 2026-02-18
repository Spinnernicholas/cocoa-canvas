/**
 * Seed script to initialize Location types and Party types
 * 
 * Run with: npx ts-node prisma/seeds/seed-locations.ts
 * Or call `seedLocations()` from the application
 */

import { seedParties } from './seed-parties.ts';
import { prisma } from '@/lib/prisma';

export const LOCATION_TYPES = {
  HOME: {
    id: 'loc_home',
    name: 'Home',
    description: 'Primary residence address and home contact information',
  },
  WORK: {
    id: 'loc_work',
    name: 'Work',
    description: 'Work or business address and contact information',
  },
  CELL: {
    id: 'loc_cell',
    name: 'Cell',
    description: 'Mobile/cellular phone number',
  },
  MAILING: {
    id: 'loc_mailing',
    name: 'Mailing',
    description: 'Mailing address (if different from residence)',
  },
  RESIDENCE: {
    id: 'loc_residence',
    name: 'Residence',
    description: 'Voter registration residence address',
  },
  UNKNOWN: {
    id: 'loc_unknown',
    name: 'Unknown',
    description: 'Location type not specified or unknown',
  },
} as const;

export async function seedLocations(verbose = true) {
  if (verbose) {
    console.log('[Seed] Initializing Location types...');
  }

  const locations = Object.values(LOCATION_TYPES);
  let createdCount = 0;
  
  for (const location of locations) {
    const result = await prisma.location.upsert({
      where: { name: location.name },
      update: {
        description: location.description,
      },
      create: {
        id: location.id,
        name: location.name,
        description: location.description,
      },
    });
    
    // Check if this was a create operation by checking if we have the exact created values
    if (verbose) {
      console.log(`[Seed] ✓ ${location.name}`);
    }
  }

  const count = await prisma.location.count();
  if (verbose) {
    console.log(`[Seed] Total location types: ${count}`);
  }
  
  // Also seed parties
  if (verbose) {
    console.log('');
  }
  await seedParties(verbose);
  
  return locations;
}

async function main() {
  try {
    await seedLocations();
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run directly if this file is the main module
if (process.argv[1]?.endsWith('seed-locations.ts')) {
  main();
}
