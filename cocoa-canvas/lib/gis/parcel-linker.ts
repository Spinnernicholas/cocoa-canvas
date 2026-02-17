/**
 * Service to link imported parcels to existing households
 */
import { PrismaClient } from '@prisma/client';

interface LinkResult {
  linked: number;
  notFound: number;
  errors: Array<{ parcelId: string; error: string }>;
}

/**
 * Normalize address string for matching
 * Removes extra whitespace, converts to lowercase, removes punctuation
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Link imported parcels to households
 * Matches parcels to households by address
 */
export async function linkParcelsToHouseholds(
  prisma: PrismaClient,
  createdParcelIds: string[]
): Promise<LinkResult> {
  const result: LinkResult = {
    linked: 0,
    notFound: 0,
    errors: [],
  };

  // Fetch newly created parcels
  const parcels = await prisma.parcel.findMany({
    where: {
      id: {
        in: createdParcelIds,
      },
    },
  });

  // For each parcel, try to find matching households
  for (const parcel of parcels) {
    try {
      if (!parcel.fullAddress) {
        result.notFound++;
        continue;
      }

      const normalizedAddress = normalizeAddress(parcel.fullAddress);

      // Find households with similar addresses
      const households = await prisma.household.findMany({
        where: {
          fullAddress: {
            not: undefined,
          },
        },
      });

      // Find best match
      let bestMatch = null;
      let bestScore = 0;

      for (const household of households) {
        if (!household.fullAddress) continue;

        const normalizedHouseholdAddr = normalizeAddress(household.fullAddress);

        // Simple similarity score: check if addresses contain each other's key parts
        const parcelParts = normalizedAddress.split(' ');
        const householdParts = normalizedHouseholdAddr.split(' ');

        let matchingParts = 0;
        for (const part of parcelParts) {
          if (householdParts.some((hp) => hp.includes(part) || part.includes(hp))) {
            matchingParts++;
          }
        }

        const score = matchingParts / Math.max(parcelParts.length, householdParts.length);

        // Require at least 50% match
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = household;
        }
      }

      if (bestMatch) {
        // Update household with parcelId
        await prisma.household.update({
          where: { id: bestMatch.id },
          data: { parcelId: parcel.id },
        });
        result.linked++;
      } else {
        result.notFound++;
      }
    } catch (err) {
      result.errors.push({
        parcelId: parcel.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return result;
}
