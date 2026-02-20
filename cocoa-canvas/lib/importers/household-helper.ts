/**
 * Household Helper - Utility for managing household creation and linking during imports
 * 
 * This ensures that when people are imported with address information,
 * they are grouped into households based on their residence address.
 */

import { prisma } from '@/lib/prisma';

export interface HouseholdAddressData {
  houseNumber?: string;
  preDirection?: string;
  streetName: string;
  streetSuffix?: string;
  postDirection?: string;
  unitAbbr?: string;
  unitNumber?: string;
  city: string;
  state?: string;
  zipCode: string;
}

/**
 * Get or create a household for an address
 * 
 * Groups people by their residence address into household records.
 * Uses a unique constraint on (houseNumber, streetName, zipCode) to identify households.
 * 
 * @param addressData - The address components to group by
 * @returns The household record
 */
export async function getOrCreateHousehold(
  addressData: HouseholdAddressData
): Promise<{ id: string }> {
  const {
    houseNumber,
    preDirection,
    streetName,
    streetSuffix,
    postDirection,
    unitAbbr,
    unitNumber,
    city,
    state = 'CA',
    zipCode,
  } = addressData;

  // Build full address string for display
  const fullAddress = [
    houseNumber || '',
    preDirection || '',
    streetName,
    streetSuffix || '',
    postDirection || '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to find existing household
  const existing = await prisma.household.findUnique({
    where: {
      houseNumber_streetName_zipCode: {
        houseNumber: houseNumber || '',
        streetName,
        zipCode,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  // Create new household
  const household = await prisma.household.create({
    data: {
      houseNumber: houseNumber || undefined,
      preDirection: preDirection || undefined,
      streetName,
      streetSuffix: streetSuffix || undefined,
      postDirection: postDirection || undefined,
      unitAbbr: unitAbbr || undefined,
      unitNumber: unitNumber || undefined,
      city,
      state,
      zipCode,
      fullAddress,
      personCount: 0, // Will be updated when people are added
    },
    select: { id: true },
  });

  return household;
}

/**
 * Link a person to a household and update person count
 * 
 * @param personId - The person to link
 * @param householdId - The household to link to
 */
export async function linkPersonToHousehold(
  personId: string,
  householdId: string
): Promise<void> {
  // Update person to link to household
  await prisma.person.update({
    where: { id: personId },
    data: { householdId },
  });

  // Update household person count
  const personCount = await prisma.person.count({
    where: { householdId },
  });

  await prisma.household.update({
    where: { id: householdId },
    data: { personCount },
  });
}

/**
 * Get or create household and link person in one operation
 * 
 * Convenience function that combines household creation/retrieval with person linking.
 * 
 * @param personId - The person to link
 * @param addressData - The address to group by
 */
export async function ensureHouseholdForPerson(
  personId: string,
  addressData: HouseholdAddressData
): Promise<string> {
  const household = await getOrCreateHousehold(addressData);
  await linkPersonToHousehold(personId, household.id);
  return household.id;
}
