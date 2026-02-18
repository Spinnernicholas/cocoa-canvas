import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { createJob } from '@/lib/queue/runner';
import { getGeocodeQueue } from '@/lib/queue/bullmq';
import { prisma } from '@/lib/prisma';

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

    // Create job in database
    const job = await createJob('geocoding', user.userId, {
      filters: body.filters || {},
      limit: Math.min(body.limit || 10000, 50000), // Cap at 50k
      skipGeocoded: body.skipGeocoded !== false, // Default to true
      providerId: body.providerId || undefined,
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
        filters: body.filters || {},
        limit: Math.min(body.limit || 10000, 50000),
        skipGeocoded: body.skipGeocoded !== false,
        providerId: body.providerId || undefined,
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
