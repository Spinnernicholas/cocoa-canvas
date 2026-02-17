/**
 * Master seed script for the application
 * 
 * This runs all seed functions needed for a fresh database setup.
 * Configured in package.json as: "prisma": { "seed": "ts-node prisma/seeds/seed.ts" }
 * 
 * Run with: npx prisma db seed
 */

import { seedLocations } from './seed-locations.ts';

async function main() {
  console.log('[Seed] Starting database initialization...');
  console.log('');

  try {
    // Seed location types (which also seeds party types)
    console.log('[Seed] Step 1: Location Types & Party Types');
    console.log('─'.repeat(40));
    await seedLocations(true);
    console.log('');

    console.log('[Seed] ✅ Database initialization complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Import voter files using the import API');
    console.log('  2. Run: npm run dev');
    console.log('  3. Visit: http://localhost:3000');
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
}

main();
