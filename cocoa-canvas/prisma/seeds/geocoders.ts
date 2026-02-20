/**
 * Seed Geocoder Providers
 * 
 * Sets up default geocoding providers in the database.
 * Run this script to initialize geocoder settings.
 * 
 * Usage:
 *   npx tsx prisma/seeds/geocoders.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding geocoder providers...');

  // US Census Geocoder (free, no API key required)
  const census = await prisma.geocoderProvider.upsert({
    where: { providerId: 'census' },
    update: {},
    create: {
      providerId: 'census',
      providerName: 'US Census Geocoder',
      description: 'Free geocoding service from US Census Bureau. No API key required. Limited to US addresses. Supports batch geocoding up to 10,000 addresses.',
      isEnabled: true,
      isPrimary: true,
      priority: 1,
      config: JSON.stringify({
        baseUrl: 'https://geocoding.geo.census.gov/geocoder',
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        maxBatchSize: 10000,
      }),
    },
  });
  console.log('✓ Created/updated US Census Geocoder:', census.providerId);

  // Nominatim (OpenStreetMap) - placeholder for future implementation
  const nominatim = await prisma.geocoderProvider.upsert({
    where: { providerId: 'nominatim' },
    update: {},
    create: {
      providerId: 'nominatim',
      providerName: 'Nominatim (OpenStreetMap)',
      description: 'Free geocoding service from OpenStreetMap. No API key required. Worldwide coverage. Rate limited.',
      isEnabled: false, // Disabled until implemented
      isPrimary: false,
      priority: 2,
      config: JSON.stringify({
        baseUrl: 'https://nominatim.openstreetmap.org',
        userAgent: 'CocoaCanvas/1.0',
        rateLimit: 1, // 1 request per second
      }),
    },
  });
  console.log('✓ Created/updated Nominatim:', nominatim.providerId);

  // LocationIQ - placeholder for future implementation
  const locationiq = await prisma.geocoderProvider.upsert({
    where: { providerId: 'locationiq' },
    update: {},
    create: {
      providerId: 'locationiq',
      providerName: 'LocationIQ',
      description: 'Commercial geocoding service with free tier. API key required. Worldwide coverage.',
      isEnabled: false, // Disabled until implemented and configured
      isPrimary: false,
      priority: 3,
      config: JSON.stringify({
        baseUrl: 'https://us1.locationiq.com/v1',
        apiKey: '', // User must add their API key
        rateLimit: 2, // Free tier: 2 requests per second
      }),
    },
  });
  console.log('✓ Created/updated LocationIQ:', locationiq.providerId);

  console.log('\n✅ Geocoder providers seeded successfully!');
  console.log('\nNext steps:');
  console.log('1. Visit Admin → Integrations → Geocoder Settings');
  console.log('2. Configure API keys for commercial providers (if needed)');
  console.log('3. Enable/disable providers as needed');
  console.log('4. Run geocoding jobs from Jobs → Run Job → Geocoding');
}

main()
  .catch((e) => {
    console.error('Error seeding geocoders:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
