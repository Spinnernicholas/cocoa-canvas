import { NextRequest, NextResponse } from 'next/server';
import {
  getJob,
  parseJobData,
  parseJobErrors,
  getJobProgress,
  cancelJob,
} from '@/lib/queue/runner';
import { auditLog } from '@/lib/audit/logger';
import { validateProtectedRoute } from '@/lib/middleware/auth';

/**
 * GET /api/v1/jobs/[id]
 * 
 * Get details of a specific job
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "job": {
 *     "id": "job123",
 *     "type": "import_voters",
 *     "status": "processing",
 *     "totalItems": 1000,
 *     "processedItems": 250,
 *     "progress": 25,
 *     "data": { "filePath": "uploads/voters.csv", ... },
 *     "errorLog": [],
 *     "createdAt": "2026-02-15T10:00:00Z",
 *     "startedAt": "2026-02-15T10:05:00Z",
 *     "completedAt": null,
 *     "createdBy": { "id": "user1", "email": "user@example.com", "name": "User" }
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        job: {
          ...job,
          data: job.data ? JSON.parse(job.data) : null,
          errorLog: job.errorLog ? JSON.parse(job.errorLog) : [],
          outputStats: job.outputStats ? JSON.parse(job.outputStats) : null,
          progress: getJobProgress(job),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Job Get Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/jobs/[id]
 * 
 * Cancel a pending job (only works on jobs that haven't started)
 * Requires authentication
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Job cancelled successfully"
 * }
 * 
 * Error responses:
 * - 401: Not authenticated
 * - 404: Job not found
 * - 400: Cannot cancel job with current status
 * - 500: Internal error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication
    const validation = await validateProtectedRoute(request);
    if (!validation.isValid) {
      return validation.response!;
    }

    const { id: jobId } = await params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Only allow cancelling pending jobs
    if (job.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel job with status: ${job.status}`,
        },
        { status: 400 }
      );
    }

    // Cancel the job
    const cancelled = await cancelJob(jobId);

    // Log the cancellation
    await auditLog(validation.user!.userId, 'cancel_job', request, 'job', jobId, {
      jobType: job.type,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Job cancelled successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Job Cancel Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
