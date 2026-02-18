/**
 * Household Geocoding Job Processor
 *
 * Processes background jobs for geocoding households using the geocoding service.
 * Supports filtering by city, state, zipCode, and other geographic criteria.
 * Updates households with latitude/longitude on successful geocoding.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { startJob, updateJobProgress, completeJob, failJob, addJobError } from '@/lib/queue/runner';
import { geocodingService } from '../geocoding';

/**
 * Geocoding job data structure
 */
export interface GeocodeJobData {
  filters: {
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
    precinctNumber?: string;
  };
  limit?: number;
  providerId?: string; // Specific provider to use, optional
  skipGeocoded?: boolean; // Skip households already geocoded
}

/**
 * Geocoding error log entry
 */
interface GeocodeErrorLog {
  householdId: string;
  address: string;
  error: string;
  timestamp: string;
}

/**
 * Process a household geocoding job
 *
 * @param jobId - ID of the Job record in database
 * @param data - Job data with filters and options
 * @param userId - User ID who created the job (for audit logs)
 *
 * @example
 * await processGeocodeJob(jobId, {
 *   filters: { city: 'Concord', state: 'CA' },
 *   limit: 10000,
 *   skipGeocoded: true,
 * }, userId);
 */
export async function processGeocodeJob(
  jobId: string,
  data: GeocodeJobData,
  userId: string
): Promise<void> {
  try {
    // Start the job
    await startJob(jobId);
    console.log(`[Geocode Job] Started processing job ${jobId}`);

    // Build query filters
    const where: Prisma.HouseholdWhereInput = {};

    if (data.filters.city) {
      where.city = { mode: 'insensitive', contains: data.filters.city };
    }
    if (data.filters.state) {
      where.state = data.filters.state;
    }
    if (data.filters.zipCode) {
      where.zipCode = data.filters.zipCode;
    }
    if (data.filters.county) {
      // Note: county field may not exist in Household model
      // This is a filter that might need to be added to the schema
    }

    // Precinct filtering requires a join through Person -> Voter
    // Currently not supported in Household-level queries
    // if (data.filters.precinctNumber) { ... }

    // Skip already geocoded households if requested
    if (data.skipGeocoded) {
      where.geocoded = false;
    }

    // Count total households to geocode
    const totalHouseholds = await prisma.household.count({ where });
    const limit = data.limit || 10000;
    const householdCount = Math.min(totalHouseholds, limit);

    console.log(
      `[Geocode Job] Found ${totalHouseholds} households, processing ${householdCount}`
    );

    // Update job with total items
    await updateJobProgress(jobId, 0, householdCount);

    // Geocoding service is already loaded at top level
    // Process each household in the batch
    const batchSize = 100;
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    const errorLogs: GeocodeErrorLog[] = [];

    for (let offset = 0; offset < householdCount; offset += batchSize) {
      const batch = await prisma.household.findMany({
        where,
        take: batchSize,
        skip: offset,
        select: {
          id: true,
          fullAddress: true,
          houseNumber: true,
          streetName: true,
          streetSuffix: true,
          city: true,
          state: true,
          zipCode: true,
        },
      });

      // Process each household in the batch
      for (const household of batch) {
        try {
          // Build complete address string
          const addressParts = [
            household.houseNumber,
            household.streetName,
            household.streetSuffix,
          ].filter(Boolean);

          const addressString = addressParts.join(' ') || household.fullAddress || '';

          if (!addressString.trim()) {
            throw new Error('No address available to geocode');
          }

          // Geocode the address
          const result = await geocodingService.geocode(
            {
              address: addressString,
              city: household.city,
              state: household.state,
              zipCode: household.zipCode,
            },
            {
              providerId: data.providerId,
              useFallback: true,
              timeout: 5000,
            }
          );

          if (result) {
            // Update household with coordinates and provider info
            await prisma.household.update({
              where: { id: household.id },
              data: {
                latitude: result.latitude,
                longitude: result.longitude,
                geocoded: true,
                geocodedAt: new Date(),
                geocodingProvider: result.source || data.providerId || 'unknown',
              },
            });
            successCount++;
          } else {
            failureCount++;
            errorLogs.push({
              householdId: household.id,
              address: addressString,
              error: 'No results from geocoding service',
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          failureCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(
            `[Geocode Job] Error geocoding household ${household.id}: ${errorMessage}`
          );
          errorLogs.push({
            householdId: household.id,
            address: household.fullAddress || 'Unknown',
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });
        }

        processedCount++;

        // Update progress every 50 households
        if (processedCount % 50 === 0) {
          await updateJobProgress(jobId, processedCount);
          // Log errors separately
          if (errorLogs.length > 0) {
            const recentErrors = errorLogs.slice(-10);
            for (const errorEntry of recentErrors) {
              await import('@/lib/queue/runner').then(m => 
                m.addJobError(jobId, {
                  timestamp: errorEntry.timestamp,
                  message: `${errorEntry.address}: ${errorEntry.error}`,
                })
              );
            }
          }
        }
      }

      // Rate limiting between batches (if needed)
      if (offset + batchSize < householdCount) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
      }
    }

    // Complete the job with final stats
    await completeJob(jobId, {
      processedCount,
      successCount,
      failureCount,
    });

    console.log(
      `[Geocode Job] Completed job ${jobId}: ${successCount} success, ${failureCount} failed`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Geocode Job] Fatal error in job ${jobId}: ${errorMessage}`);

    await failJob(jobId, `Unexpected error during geocoding: ${errorMessage}`);
  }
}

/**
 * Get geocoding job filters from query parameters
 * Useful for API endpoints
 */
export function extractGeocodeFilters(searchParams: URLSearchParams) {
  return {
    filters: {
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      zipCode: searchParams.get('zipCode') || undefined,
      county: searchParams.get('county') || undefined,
      precinctNumber: searchParams.get('precinctNumber') || undefined,
    },
    limit: parseInt(searchParams.get('limit') || '10000'),
    providerId: searchParams.get('providerId') || undefined,
    skipGeocoded: searchParams.get('skipGeocoded') === 'true',
  };
}
