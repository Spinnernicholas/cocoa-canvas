import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { createJob } from '@/lib/queue/runner';
import { getGeocodeQueue } from '@/lib/queue/bullmq';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface GeocodeJobRequest {
  filters?: {
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
    precinctNumber?: string;
  };
  limit?: number;
  skipGeocoded?: boolean;
  providerId?: string;
  mode?: 'dynamic' | 'static';
}

export async function POST(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  const user = authResult.user;

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: GeocodeJobRequest = await request.json();
    const limit = Math.min(body.limit || 10000, 50000);
    const mode: 'dynamic' | 'static' = body.mode === 'dynamic' ? 'dynamic' : 'static';
    const isDynamic = mode === 'dynamic';

    // Check if at least one geocoding provider is configured and enabled
    const providers = await prisma.geocoderProvider.findMany({
      where: { isEnabled: true },
    });

    if (providers.length === 0) {
      return NextResponse.json(
        { error: 'No geocoding providers configured. Please add a provider in the admin settings.' },
        { status: 400 }
      );
    }

    const where: Prisma.HouseholdWhereInput = {};
    const filters = body.filters || {};

    if (filters.city) {
      where.city = { mode: 'insensitive', contains: filters.city };
    }
    if (filters.state) {
      where.state = filters.state;
    }
    if (filters.zipCode) {
      where.zipCode = filters.zipCode;
    }
    if (body.skipGeocoded !== false) {
      where.geocoded = false;
    }

    const householdIds = isDynamic
      ? []
      : (
          await prisma.household.findMany({
            where,
            take: limit,
            orderBy: { id: 'asc' },
            select: { id: true },
          })
        ).map((row) => row.id);

    // Create job in database
    const job = await createJob('geocoding', user.userId, {
      filters,
      limit,
      skipGeocoded: body.skipGeocoded !== false, // Default to true
      providerId: body.providerId || undefined,
      householdIds,
      checkpointIndex: 0,
      failedHouseholdIds: [],
      dynamic: isDynamic,
    }, {
      isDynamic,
      totalItems: isDynamic ? 0 : householdIds.length,
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    // Queue the job with the same ID as the database job
    try {
      const queue = getGeocodeQueue();
      await queue.add('geocode', {
        filters,
        limit,
        skipGeocoded: body.skipGeocoded !== false,
        providerId: body.providerId || undefined,
        householdIds,
        checkpointIndex: 0,
        failedHouseholdIds: [],
        dynamic: isDynamic,
      }, {
        jobId: job.id,  // Use database job ID as BullMQ job ID
      });
    } catch (queueError) {
      console.error('[Geocoding API] Failed to queue job:', queueError);
      // Job is created but queuing failed - this will be picked up later
      // or user can retry
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      type: 'geocoding',
      mode,
      status: 'pending',
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error('[Geocoding API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
