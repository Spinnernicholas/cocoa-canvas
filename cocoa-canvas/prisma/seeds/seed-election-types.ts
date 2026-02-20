import { prisma } from '@/lib/prisma';

export async function seedElectionTypes(verbose = true) {
  if (verbose) {
    console.log('Seeding election types...');
  }

  const electionTypes = [
    {
      name: 'Primary',
      description: 'Primary election to select party nominees',
      displayOrder: 1,
    },
    {
      name: 'General',
      description: 'General election for final candidate selection',
      displayOrder: 2,
    },
    {
      name: 'Special',
      description: 'Special election called for specific purpose',
      displayOrder: 3,
    },
    {
      name: 'Runoff',
      description: 'Runoff election when no candidate reaches threshold',
      displayOrder: 4,
    },
    {
      name: 'Recall',
      description: 'Recall election to remove elected official',
      displayOrder: 5,
    },
    {
      name: 'Local',
      description: 'Local municipal or district election',
      displayOrder: 6,
    },
  ];

  for (const electionType of electionTypes) {
    await prisma.electionType.upsert({
      where: { name: electionType.name },
      update: {},
      create: electionType,
    });
  }

  if (verbose) {
    console.log(`✓ Seeded ${electionTypes.length} election types`);
  }
}

async function main() {
  try {
    await seedElectionTypes();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
