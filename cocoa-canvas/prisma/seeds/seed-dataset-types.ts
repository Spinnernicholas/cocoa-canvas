import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatasetTypes() {
  console.log('Seeding dataset types...');

  const datasetTypes = [
    {
      name: 'Parcel',
      description: 'Property parcel boundaries with assessment data',
      category: 'Property',
      displayOrder: 1,
    },
    {
      name: 'Precinct',
      description: 'Voting precinct boundaries',
      category: 'Political',
      displayOrder: 2,
    },
    {
      name: 'Demographic',
      description: 'Census and demographic data',
      category: 'Demographics',
      displayOrder: 3,
    },
    {
      name: 'Boundary',
      description: 'Administrative boundaries (county, city, district)',
      category: 'Political',
      displayOrder: 4,
    },
    {
      name: 'Infrastructure',
      description: 'Roads, utilities, and public infrastructure',
      category: 'Infrastructure',
      displayOrder: 5,
    },
    {
      name: 'Tabular',
      description: 'Non-spatial tabular data (lookup tables, election results)',
      category: 'Data',
      displayOrder: 6,
    },
    {
      name: 'Custom',
      description: 'Custom dataset type',
      category: 'Other',
      displayOrder: 7,
    },
  ];

  for (const datasetType of datasetTypes) {
    await prisma.datasetType.upsert({
      where: { name: datasetType.name },
      update: {},
      create: datasetType,
    });
  }

  console.log(`✓ Seeded ${datasetTypes.length} dataset types`);
}

if (require.main === module) {
  seedDatasetTypes()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
