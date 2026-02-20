import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import {
  getGeocodeQueue,
  getScheduledJobsQueue,
  getVoterImportQueue,
  redis,
} from '@/lib/queue/bullmq';
import { getWorkerStatus } from '@/lib/queue/worker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    let pingOk = false;
    let pingResponse: string | null = null;

    try {
      pingResponse = await redis.ping();
      pingOk = pingResponse === 'PONG';
    } catch {
      pingOk = false;
    }

    const [importCounts, geocodeCounts, scheduledCounts, workerStatus] = await Promise.all([
      getVoterImportQueue().getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
      getGeocodeQueue().getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
      getScheduledJobsQueue().getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
      getWorkerStatus(),
    ]);

    const bullmqHealthy = pingOk && workerStatus.activeWorkers > 0;

    return NextResponse.json({
      success: true,
      redis: {
        connected: pingOk,
        pingResponse,
        clientStatus: redis.status,
      },
      bullmq: {
        healthy: bullmqHealthy,
        activeWorkers: workerStatus.activeWorkers,
      },
      workers: workerStatus,
      queues: {
        voterImport: importCounts,
        geocode: geocodeCounts,
        scheduled: scheduledCounts,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Redis Status API Error][GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch Redis status' },
      { status: 500 }
    );
  }
}
