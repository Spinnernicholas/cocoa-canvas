/**
 * Household Geocoding Job Processor
 *
 * Processes background jobs for geocoding households using the geocoding service.
 * Supports filtering by city, state, zipCode, and other geographic criteria.
 * Updates households with latitude/longitude on successful geocoding.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { startJob, updateJobProgress, updateJobOutputStats, completeJob, failJob, addJobError } from '@/lib/queue/runner';
import { OutputStats } from '@/lib/queue/types';
import { geocodingService } from '../geocoding';
import { geocoderRegistry } from '../geocoding/registry';
import { createCatalogGeocoder } from '../geocoding/providers/catalog';

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

    const enabledProviders = await prisma.geocoderProvider.findMany({
      where: { isEnabled: true },
      orderBy: [{ isPrimary: 'desc' }, { priority: 'asc' }],
    });

    if (enabledProviders.length === 0) {
      await failJob(jobId, 'No enabled geocoding providers found');
      return;
    }

    const selectedProvider = data.providerId
      ? enabledProviders.find(
          (provider) =>
            provider.id === data.providerId || provider.providerId === data.providerId
        )
      : enabledProviders.find((provider) => provider.isPrimary) || enabledProviders[0];

    if (!selectedProvider) {
      await failJob(
        jobId,
        `Selected geocoding provider not found or disabled: ${data.providerId}`
      );
      return;
    }

    const selectedProviderKey = selectedProvider.providerId;
    const providerDisplayName = selectedProvider.providerName;

    let catalogProvider: ReturnType<typeof createCatalogGeocoder> | null = null;
    if (selectedProviderKey === 'catalog') {
      if (!selectedProvider.config) {
        await failJob(
          jobId,
          `Catalog provider "${providerDisplayName}" is missing required configuration`
        );
        return;
      }

      try {
        catalogProvider = createCatalogGeocoder(selectedProvider.config);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await failJob(jobId, `Catalog provider config is invalid: ${message}`);
        return;
      }

      const isAvailable = await catalogProvider.isAvailable();
      if (!isAvailable) {
        await failJob(
          jobId,
          `Catalog provider "${providerDisplayName}" is unavailable. Verify dataset, dataset type, and field configuration.`
        );
        return;
      }
    } else {
      const runtimeProvider = geocoderRegistry.getProvider(selectedProviderKey);
      if (!runtimeProvider) {
        await failJob(
          jobId,
          `Provider "${selectedProviderKey}" is not registered in geocoding runtime`
        );
        return;
      }
    }

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

    // Update job with total items and initial stats
    await updateJobProgress(jobId, 0, householdCount, {
      type: 'geocode',
      householdsProcessed: 0,
      householdsGeocoded: 0,
      householdsFailed: 0,
      householdsSkipped: 0,
      percentComplete: 0,
      geocodingProvider: providerDisplayName,
    });

    // Geocoding service is already loaded at top level
    // Process each household in the batch
    const batchSize = 100;
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;
    let alreadyGeocodedCount = 0;
    const errorLogs: GeocodeErrorLog[] = [];
    const providersUsed = new Set<string>();

    const getControlStatus = async () => {
      const current = await prisma.job.findUnique({
        where: { id: jobId },
        select: { status: true },
      });

      if (!current) return 'cancelled';
      return current.status;
    };

    for (let offset = 0; offset < householdCount; offset += batchSize) {
      const controlStatus = await getControlStatus();
      if (controlStatus === 'paused') {
        await addJobError(jobId, 'Job paused by user during processing');
        return;
      }
      if (controlStatus === 'cancelled') {
        await addJobError(jobId, 'Job cancelled by user during processing');
        return;
      }

      const remaining = householdCount - offset;
      const takeCount = Math.min(batchSize, remaining);

      const batch = await prisma.household.findMany({
        where,
        take: takeCount,
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
            skipCount++;
            continue;
          }

          // Geocode the address
          const request = {
            address: addressString,
            city: household.city,
            state: household.state,
            zipCode: household.zipCode,
          };

          const result = catalogProvider
            ? await catalogProvider.geocode(request)
            : await geocodingService.geocode(request, {
                providerId: selectedProviderKey,
                useFallback: true,
                timeout: 5000,
              });

          if (result) {
            // Update household with coordinates and provider info
            const providerName = providerDisplayName || selectedProviderKey || 'unknown';
            providersUsed.add(providerName);
            
            await prisma.household.update({
              where: { id: household.id },
              data: {
                latitude: result.latitude,
                longitude: result.longitude,
                geocoded: true,
                geocodedAt: new Date(),
                geocodingProvider: providerName,
              },
            });
            successCount++;
          } else {
            failureCount++;
            errorLogs.push({
              householdId: household.id,
              address: addressString,
              error: `No results from geocoding service (${providerDisplayName})`,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(
            `[Geocode Job] Error geocoding household ${household.id}: ${errorMessage}`
          );
          failureCount++;
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
          const percentComplete = Math.min(
            Math.round((processedCount / householdCount) * 100),
            99
          );
          
          await updateJobProgress(jobId, processedCount, householdCount, {
            type: 'geocode',
            householdsProcessed: processedCount,
            householdsGeocoded: successCount,
            householdsFailed: failureCount,
            householdsSkipped: skipCount,
            percentComplete,
            geocodingProvider: providersUsed.size > 0 ? Array.from(providersUsed).join(', ') : providerDisplayName,
            geocodingErrors: errorLogs.length,
          });
          // Log errors separately
          if (errorLogs.length > 0) {
            const recentErrors = errorLogs.slice(-10);
            for (const errorEntry of recentErrors) {
              await addJobError(jobId, {
                timestamp: errorEntry.timestamp,
                message: `${errorEntry.address}: ${errorEntry.error}`,
              });
            }
          }
        }
      }

      // Rate limiting between batches (if needed)
      if (offset + batchSize < householdCount) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
      }
    }

    const finalControlStatus = await getControlStatus();
    if (finalControlStatus === 'paused' || finalControlStatus === 'cancelled') {
      return;
    }

    // Calculate final statistics
    const finalOutputStats: Partial<OutputStats> = {
      type: 'geocode',
      householdsProcessed: processedCount,
      householdsGeocoded: successCount,
      householdsFailed: failureCount,
      householdsSkipped: skipCount,
      geocodingErrors: errorLogs.length,
      percentComplete: 100,
      geocodingProvider: providersUsed.size > 0 ? Array.from(providersUsed).join(', ') : providerDisplayName,
    };
    
    // Update final output stats
    await updateJobOutputStats(jobId, finalOutputStats);
    
    // Complete the job with final stats in data field
    await completeJob(jobId, {
      processedCount,
      successCount,
      failureCount,
      skipCount,
      providersUsed: Array.from(providersUsed),
    });

    console.log(
      `[Geocode Job] Completed job ${jobId}: ${successCount} geocoded, ${failureCount} failed, ${skipCount} skipped`
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
