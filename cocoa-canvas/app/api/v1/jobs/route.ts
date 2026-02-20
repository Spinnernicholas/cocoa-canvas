import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import {
  getJobs,
  getJob,
  parseJobData,
  parseJobErrors,
  getJobProgress,
  createJob,
} from '@/lib/queue/runner';
import { auditLog } from '@/lib/audit/logger';

/**
 * GET /api/v1/jobs
 * 
 * List all jobs with optional filtering
 * 
 * Query parameters:
 * - type: Filter by job type (e.g., "import_voters")
 * - status: Filter by status (pending, processing, completed, failed)
 * - createdById: Filter by user who created the job
 * - limit: Number of jobs to return (default 50, max 200)
 * - offset: Pagination offset (default 0)
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "jobs": [
 *     {
 *       "id": "job123",
 *       "type": "import_voters",
 *       "status": "processing",
 *       "totalItems": 1000,
 *       "processedItems": 250,
 *       "progress": 25,
 *       "createdAt": "2026-02-15T10:00:00Z",
 *       "startedAt": "2026-02-15T10:05:00Z",
 *       "completedAt": null,
 *       "createdBy": { "id": "user1", "email": "user@example.com", "name": "User" }
 *     }
 *   ],
 *   "total": 15
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optionally validate authentication if needed for filtering by user
    // const validation = await validateProtectedRoute(request);
    // if (!validation.isValid) {
    //   return validation.response!;
    // }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const createdById = searchParams.get('createdById') || undefined;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      200
    );
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch jobs
    const jobs = await getJobs({
      type,
      status,
      createdById,
      limit,
      offset,
    });

    // Format response with progress percentage
    const formattedJobs = jobs.map((job) => ({
      ...job,
      data: job.data ? JSON.parse(job.data) : null,
      errorLog: job.errorLog ? JSON.parse(job.errorLog) : [],
      outputStats: job.outputStats ? JSON.parse(job.outputStats) : null,
      progress: getJobProgress(job),
    }));

    return NextResponse.json(
      {
        success: true,
        jobs: formattedJobs,
        total: jobs.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Jobs List Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/jobs
 * 
 * Create a new job
 * Requires authentication
 * 
 * Request body:
 * {
 *   "type": "import_voters",
 *   "data": {
 *     "filePath": "uploads/voters.csv",
 *     "importType": "contra_costa",
 *     "action": "merge"
 *   }
 * }
 * 
 * Success response (201):
 * {
 *   "success": true,
 *   "job": {
 *     "id": "job123",
 *     "type": "import_voters",
 *     "status": "pending",
 *     "totalItems": 0,
 *     "processedItems": 0,
 *     "progress": 0,
 *     "data": { "filePath": "uploads/voters.csv", ... },
 *     "errorLog": [],
 *     "createdAt": "2026-02-15T10:00:00Z",
 *     "createdBy": { "id": "user1", "email": "user@example.com", "name": "User" }
 *   }
 * }
 * 
 * Error responses:
 * - 400: Missing required fields
 * - 401: Not authenticated
 * - 500: Internal error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const validation = await validateProtectedRoute(request);
    if (!validation.isValid) {
      return validation.response!;
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { type, data, isDynamic } = body;
    if (!type || !type.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job type is required',
        },
        { status: 400 }
      );
    }

    // Create the job
    const job = await createJob(type.trim(), validation.user!.userId, data, {
      isDynamic: Boolean(isDynamic),
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create job',
        },
        { status: 500 }
      );
    }

    // Log job creation
    await auditLog(validation.user!.userId, 'create_job', request, 'job', job.id, {
      jobType: job.type,
      status: job.status,
    });

    return NextResponse.json(
      {
        success: true,
        job: {
          ...job,
          data: job.data ? JSON.parse(job.data) : null,
          errorLog: job.errorLog ? JSON.parse(job.errorLog) : [],
          progress: getJobProgress(job),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Create Job Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
