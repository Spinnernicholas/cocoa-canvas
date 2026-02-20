import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { getJob, parseJobData, pauseJob, markJobCancelled } from '@/lib/queue/runner';
import { auditLog } from '@/lib/audit/logger';
import { getGeocodeQueue, getVoterImportQueue } from '@/lib/queue/bullmq';
import { prisma } from '@/lib/prisma';
import { enqueueJobFromDb } from '@/lib/queue/recovery';

export const dynamic = 'force-dynamic';

type JobControlAction = 'pause' | 'resume' | 'cancel';

function isGeocodingType(type: string) {
  return type === 'geocoding' || type === 'geocode_households';
}

function isImportType(type: string) {
  return type === 'voter_import' || type === 'import_voters';
}

async function removeGeocodeQueueJob(jobId: string) {
  const queue = getGeocodeQueue();
  const queuedJob = await queue.getJob(jobId);
  if (queuedJob) {
    await queuedJob.remove();
  }
}

async function removeImportQueueJob(jobId: string) {
  const queue = getVoterImportQueue();
  const queuedJob = await queue.getJob(jobId);
  if (queuedJob) {
    await queuedJob.remove();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateProtectedRoute(request);
  if (!validation.isValid) {
    return validation.response!;
  }

  const { id: jobId } = await params;

  try {
    const body = await request.json();
    const action = body?.action as JobControlAction;

    if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Expected pause, resume, or cancel.' },
        { status: 400 }
      );
    }

    const job = await getJob(jobId);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    if (action === 'pause') {
      if (job.status === 'pending') {
        if (isGeocodingType(job.type)) {
          await removeGeocodeQueueJob(jobId);
        } else if (isImportType(job.type)) {
          await removeImportQueueJob(jobId);
        }
        await pauseJob(jobId, 'Job paused by user');
      } else if (job.status === 'processing') {
        await pauseJob(jobId, 'Pause requested by user');
      } else {
        return NextResponse.json(
          { success: false, error: `Cannot pause job with status: ${job.status}` },
          { status: 400 }
        );
      }

      await auditLog(validation.user!.userId, 'pause_job', request, 'job', jobId, {
        type: job.type,
        previousStatus: job.status,
      });

      return NextResponse.json({ success: true, message: 'Job paused' });
    }

    if (action === 'cancel') {
      if (job.status === 'pending' || job.status === 'paused') {
        if (isGeocodingType(job.type)) {
          await removeGeocodeQueueJob(jobId);
        } else if (isImportType(job.type)) {
          await removeImportQueueJob(jobId);
        }
        await markJobCancelled(jobId, 'Job cancelled by user');
      } else if (job.status === 'processing') {
        await markJobCancelled(jobId, 'Cancel requested by user while processing');
      } else {
        return NextResponse.json(
          { success: false, error: `Cannot cancel job with status: ${job.status}` },
          { status: 400 }
        );
      }

      await auditLog(validation.user!.userId, 'cancel_job', request, 'job', jobId, {
        type: job.type,
        previousStatus: job.status,
      });

      return NextResponse.json({ success: true, message: 'Job cancelled' });
    }

    if (action === 'resume') {
      if (job.status !== 'paused') {
        return NextResponse.json(
          { success: false, error: `Cannot resume job with status: ${job.status}` },
          { status: 400 }
        );
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'pending',
          completedAt: null,
        },
      });

      if (!isGeocodingType(job.type) && !isImportType(job.type)) {
        return NextResponse.json(
          { success: false, error: `Resume not supported for job type: ${job.type}` },
          { status: 400 }
        );
      }

      const refreshedJob = await getJob(jobId);
      if (!refreshedJob) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }

      const enqueueResult = await enqueueJobFromDb(refreshedJob as any);
      if (enqueueResult === 'failed') {
        return NextResponse.json(
          { success: false, error: 'Job data is incomplete and cannot be resumed' },
          { status: 400 }
        );
      }

      await auditLog(validation.user!.userId, 'resume_job', request, 'job', jobId, {
        type: job.type,
      });

      return NextResponse.json({ success: true, message: 'Job resumed' });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[Job Control Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to control job' },
      { status: 500 }
    );
  }
}
