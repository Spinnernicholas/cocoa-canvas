import { NextRequest, NextResponse } from 'next/server';
import { getJob, getJobProgress } from '@/lib/queue/runner';

/**
 * GET /api/v1/jobs/[id]/progress
 * 
 * Get only the progress information for a job
 * Lightweight endpoint for real-time progress updates in the UI
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "progress": {
 *     "status": "processing",
 *     "percentage": 25,
 *     "processedItems": 250,
 *     "totalItems": 1000,
 *     "startedAt": "2026-02-15T10:05:00Z",
 *     "completedAt": null,
 *     "errors": []
 *   }
 * }
 * 
 * For failed jobs:
 * {
 *   "success": true,
 *   "progress": {
 *     "status": "failed",
 *     "percentage": 100,
 *     "processedItems": 250,
 *     "totalItems": 1000,
 *     "completedAt": "2026-02-15T10:30:00Z",
 *     "errors": [
 *       {
 *         "timestamp": "2026-02-15T10:25:00Z",
 *         "message": "Invalid voter record at row 251",
 *         "code": "VALIDATION_ERROR"
 *       }
 *     ]
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

    // Parse error log
    let errors = [];
    if (job.errorLog) {
      try {
        errors = JSON.parse(job.errorLog);
      } catch {
        console.warn('[Parse Errors] Failed to parse error log for job:', jobId);
      }
    }

    return NextResponse.json(
      {
        success: true,
        progress: {
          status: job.status,
          percentage: getJobProgress(job),
          processedItems: job.processedItems,
          totalItems: job.totalItems,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          errors,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Job Progress Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job progress' },
      { status: 500 }
    );
  }
}
