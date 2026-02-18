/**
 * POST /api/v1/gis/households/geocode
 *
 * Create a household geocoding job with optional filters.
 *
 * Query Parameters:
 *   - city: Filter by city name
 *   - state: Filter by state (e.g., "CA")
 *   - zipCode: Filter by ZIP code
 *   - county: Filter by county name
 *   - precinctNumber: Filter by precinct number
 *   - limit: Maximum households to geocode (default: 10000, max: 100000)
 *   - providerId: Specific geocoding provider to use (optional)
 *   - skipGeocoded: Skip households already geocoded (default: true)
 *
 * Example:
 *   POST /api/v1/gis/households/geocode?city=Concord&state=CA&limit=10000
 *
 * Response:
 *   {
 *     "success": true,
 *     "jobId": "njd7h34d",
 *     "message": "Geocoding job created...",
 *     "filters": { "city": "Concord", "state": "CA" },
 *     "estimatedHouseholds": 8492
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { createJob } from '@/lib/queue/runner';
import { processGeocodeJob, GeocodeJobData } from '@/lib/gis/geocode-job-processor';
import { auditLog } from '@/lib/audit/logger';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for filters
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const zipCode = searchParams.get('zipCode') || undefined;
    const county = searchParams.get('county') || undefined;
    const precinctNumber = searchParams.get('precinctNumber') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10000'), 100000);
    const providerId = searchParams.get('providerId') || undefined;
    const skipGeocoded = searchParams.get('skipGeocoded') !== 'false'; // Default true

    // Validate at least one filter is provided
    if (!city && !state && !zipCode && !county && !precinctNumber) {
      return NextResponse.json(
        {
          error: 'At least one filter must be provided (city, state, zipCode, county, or precinctNumber)',
          supportedFilters: ['city', 'state', 'zipCode', 'county', 'precinctNumber'],
        },
        { status: 400 }
      );
    }

    // Build where clause for counting households
    const where: Prisma.HouseholdWhereInput = {};

    if (city) {
      where.city = { mode: 'insensitive', contains: city };
    }
    if (state) {
      where.state = state;
    }
    if (zipCode) {
      where.zipCode = zipCode;
    }
    // County filtering would need schema changes
    // if (county) { where.county = county; }
    // Precinct filtering requires a join through Person -> Voter
    // Currently not supported - would need schema changes
    // if (precinctNumber) { where.people = { some: { voter: { precinctNumber } } } }

    if (skipGeocoded) {
      where.geocoded = false;
    }

    // Count how many households would be geocoded
    const matchingCount = await prisma.household.count({ where });

    if (matchingCount === 0) {
      return NextResponse.json(
        {
          error: 'No households found matching the specified filters',
          filters: { city, state, zipCode, county, precinctNumber },
        },
        { status: 404 }
      );
    }

    // Create the job record
    const jobData: GeocodeJobData = {
      filters: {
        city,
        state,
        zipCode,
        county,
        precinctNumber,
      },
      limit,
      providerId,
      skipGeocoded,
    };

    const job = await createJob(
      'geocode_households',
      authResult.user?.userId || '',
      jobData as any // Type assertion needed due to generic JobData union
    );

    if (!job) {
      return NextResponse.json(
        { error: 'Failed to create geocoding job' },
        { status: 500 }
      );
    }

    // Audit log
    await auditLog(
      authResult.user?.userId || '',
      'HOUSEHOLDS_GEOCODE_QUEUED',
      request,
      'household',
      job.id,
      {
        city,
        state,
        zipCode,
        county,
        precinctNumber,
        limit: String(limit),
        estimatedHouseholds: String(matchingCount),
        providerId: providerId || 'default',
        skipGeocoded: String(skipGeocoded),
      }
    );

    // Start processing the job in the background
    processGeocodeJob(job.id, jobData, authResult.user?.userId || '').catch((error) => {
      console.error(`[Geocode Job Error] Failed to process job ${job.id}:`, error);
    });

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        message: `Geocoding job created for ${matchingCount} households`,
        estimatedHouseholds: matchingCount,
        limit,
        processingStarted: true,
      },
      { status: 202 } // 202 Accepted - processing in background
    );
  } catch (error) {
    console.error('[Geocode API] Error:', error);
    return NextResponse.json(
      {
        error: 'Geocoding job creation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
