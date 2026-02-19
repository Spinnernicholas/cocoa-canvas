import { prisma } from '@/lib/prisma';
import { OutputStats } from './types';

/**
 * Job Queue Runner
 * 
 * Handles async job processing with status tracking, progress monitoring,
 * and comprehensive error handling.
 * 
 * Job statuses:
 * - pending: Job created, waiting to be processed
 * - processing: Job currently running
 * - completed: Job finished successfully
 * - failed: Job finished with errors
 */

export interface JobError {
  timestamp: string;
  message: string;
  code?: string;
  details?: string;
}

export interface JobData {
  [key: string]: string | number | boolean | object | null | undefined;
}

/**
 * Get a job by ID (doesn't start processing)
 */
export async function getJob(jobId: string) {
  try {
    return await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[Get Job Error]', error);
    return null;
  }
}

/**
 * Get all jobs with optional filtering
 */
export async function getJobs(
  filters?: {
    type?: string;
    status?: string;
    createdById?: string;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.createdById) where.createdById = filters.createdById;

    return await prisma.job.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  } catch (error) {
    console.error('[Get Jobs Error]', error);
    return [];
  }
}

/**
 * Create a new job (doesn't start processing)
 * 
 * @param type - Job type (e.g., "import_voters", "geocode", "export")
 * @param createdById - User ID creating the job
 * @param data - Job-specific data (stored as JSON)
 * 
 * @example
 * const job = await createJob('import_voters', userId, {
 *   filePath: 'uploads/voters.csv',
 *   importType: 'contra_costa',
 *   action: 'merge'
 * });
 */
export async function createJob(
  type: string,
  createdById: string,
  data?: JobData
) {
  try {
    return await prisma.job.create({
      data: {
        type,
        createdById,
        status: 'pending',
        totalItems: 0,
        processedItems: 0,
        data: data ? JSON.stringify(data) : null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[Create Job Error]', error);
    return null;
  }
}

/**
 * Start processing a job
 * 
 * This marks the job as processing and records the start time.
 * Call this before starting your async work.
 */
export async function startJob(jobId: string) {
  try {
    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Start Job Error]', error);
    return null;
  }
}

/**
 * Update job progress
 * 
 * Call this during processing to track how many items have been processed.
 * Optionally pass output stats to track job-specific metrics.
 */
export async function updateJobProgress(
  jobId: string,
  processedItems: number,
  totalItems?: number,
  outputStats?: Partial<OutputStats>
) {
  try {
    const updateData: any = { processedItems };
    if (totalItems !== undefined && totalItems > 0) {
      updateData.totalItems = totalItems;
    }
    
    // Merge output stats with existing ones if provided
    if (outputStats) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });
      
      if (job && job.outputStats) {
        const existing = JSON.parse(job.outputStats);
        const merged = { ...existing, ...outputStats };
        updateData.outputStats = JSON.stringify(merged);
      } else {
        updateData.outputStats = JSON.stringify(outputStats);
      }
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    });
  } catch (error) {
    console.error('[Update Job Progress Error]', error);
    return null;
  }
}

/**
 * Update output statistics for a job
 * 
 * Stores job-specific metrics like bytes processed, records created, etc.
 * Useful for tracking progress with file-based metrics.
 */
export async function updateJobOutputStats(
  jobId: string,
  stats: Partial<OutputStats>
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      console.warn('[Update Output Stats] Job not found:', jobId);
      return null;
    }

    let merged = { ...stats };
    if (job.outputStats) {
      const existing = JSON.parse(job.outputStats);
      merged = { ...existing, ...stats };
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        outputStats: JSON.stringify(merged),
      },
    });
  } catch (error) {
    console.error('[Update Output Stats Error]', error);
    return null;
  }
}

/**
 * Add an error to the job's error log
 * 
 * Errors are stored as a JSON array of error objects.
 * Multiple errors can be logged for a single job.
 */
export async function addJobError(
  jobId: string,
  error: JobError | string
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      console.warn('[Add Job Error] Job not found:', jobId);
      return null;
    }

    // Parse existing errors
    let errors: JobError[] = [];
    if (job.errorLog) {
      try {
        errors = JSON.parse(job.errorLog);
      } catch {
        console.warn('[Parse Error Log] Failed to parse error log for job:', jobId);
      }
    }

    // Add new error
    const errorEntry: JobError =
      typeof error === 'string'
        ? {
            timestamp: new Date().toISOString(),
            message: error,
          }
        : error;

    errors.push(errorEntry);

    // Limit to last 100 errors to prevent bloat
    if (errors.length > 100) {
      errors = errors.slice(-100);
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        errorLog: JSON.stringify(errors),
      },
    });
  } catch (error) {
    console.error('[Add Job Error] Failed to log error:', error);
    return null;
  }
}

/**
 * Complete a job successfully
 * 
 * @param jobId - The job ID
 * @param finalData - Optional final data to store (merged with existing data)
 */
export async function completeJob(jobId: string, finalData?: JobData) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      console.warn('[Complete Job] Job not found:', jobId);
      return null;
    }

    // Merge final data with existing data if provided
    let mergedData = job.data;
    if (finalData) {
      const existing = job.data ? JSON.parse(job.data) : {};
      mergedData = JSON.stringify({ ...existing, ...finalData });
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        data: mergedData,
      },
    });
  } catch (error) {
    console.error('[Complete Job Error]', error);
    return null;
  }
}

/**
 * Fail a job with error details
 * 
 * @param jobId - The job ID
 * @param errorMessage - Description of what failed
 */
export async function failJob(jobId: string, errorMessage: string) {
  try {
    // First add the error to the log
    await addJobError(jobId, {
      timestamp: new Date().toISOString(),
      message: 'Job failed: ' + errorMessage,
      code: 'JOB_FAILED',
    });

    // Then mark as failed
    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Fail Job Error]', error);
    return null;
  }
}

/**
 * Mark a job as paused
 */
export async function pauseJob(jobId: string, reason?: string) {
  try {
    if (reason) {
      await addJobError(jobId, {
        timestamp: new Date().toISOString(),
        message: reason,
        code: 'JOB_PAUSED',
      });
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'paused',
      },
    });
  } catch (error) {
    console.error('[Pause Job Error]', error);
    return null;
  }
}

/**
 * Mark a job as cancelled
 */
export async function markJobCancelled(jobId: string, reason?: string) {
  try {
    if (reason) {
      await addJobError(jobId, {
        timestamp: new Date().toISOString(),
        message: reason,
        code: 'JOB_CANCELLED',
      });
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Cancel Job Error]', error);
    return null;
  }
}

/**
 * Parse job data from stored JSON string
 * 
 * Safely parses JSON with fallback to empty object
 */
export function parseJobData(dataJson: string | null): JobData {
  if (!dataJson) return {};
  try {
    return JSON.parse(dataJson);
  } catch (error) {
    console.error('[Parse Job Data Error]', error);
    return {};
  }
}

/**
 * Parse job error log from stored JSON string
 * 
 * Returns array of errors or empty array if parsing fails
 */
export function parseJobErrors(errorLogJson: string | null): JobError[] {
  if (!errorLogJson) return [];
  try {
    return JSON.parse(errorLogJson);
  } catch (error) {
    console.error('[Parse Job Errors Error]', error);
    return [];
  }
}

/**
 * Get progress percentage for a job
 * 
 * Prioritizes file-based progress from outputStats if available,
 * falls back to record-based progress.
 * Returns 0 if no items processed yet, 100 if completed/failed
 */
export function getJobProgress(job: {
  status: string;
  totalItems: number;
  processedItems: number;
  outputStats?: string | null;
}): number {
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return 100;
  }
  
  // Try to get progress from outputStats (file-based)
  if (job.outputStats) {
    try {
      const stats = JSON.parse(job.outputStats);
      
      // File-based progress (for imports)
      if (stats.bytesProcessed !== undefined && stats.fileSize !== undefined && stats.fileSize > 0) {
        const progress = Math.round((stats.bytesProcessed / stats.fileSize) * 100);
        return Math.min(progress, 99);
      }
      
      // Or use explicit percentComplete if set
      if (stats.percentComplete !== undefined) {
        return Math.min(stats.percentComplete, 99);
      }
    } catch (error) {
      console.warn('[getJobProgress] Failed to parse outputStats:', error);
      // Fall through to record-based progress
    }
  }
  
  // Fall back to record-based progress
  if (job.totalItems === 0) {
    return 0;
  }
  const progress = Math.round((job.processedItems / job.totalItems) * 100);
  return Math.min(progress, 99); // Cap at 99% until truly completed
}

/**
 * Cancel a pending job
 * 
 * Only works on jobs that haven't started processing yet
 */
export async function cancelJob(jobId: string) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    // Only cancel if still pending
    if (job.status !== 'pending') {
      console.warn('[Cancel Job] Cannot cancel job with status:', job.status);
      return job;
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorLog: JSON.stringify([
          {
            timestamp: new Date().toISOString(),
            message: 'Job cancelled by user',
            code: 'JOB_CANCELLED',
          },
        ]),
      },
    });
  } catch (error) {
    console.error('[Cancel Job Error]', error);
    return null;
  }
}

/**
 * Cleanup old completed jobs (archival/retention)
 * 
 * Useful for housekeeping, called periodically
 * 
 * @param olderThanDays - Delete jobs completed more than N days ago
 * @param keepLastN - Always keep at least this many recent jobs
 */
export async function cleanupOldJobs(
  olderThanDays: number = 30,
  keepLastN: number = 100
) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Find how many completed jobs we have
    const totalCompleted = await prisma.job.count({
      where: { status: 'completed' },
    });

    if (totalCompleted <= keepLastN) {
      console.log('[Cleanup Jobs] Not enough old jobs to delete');
      return { deleted: 0 };
    }

    // Delete old completed jobs
    const result = await prisma.job.deleteMany({
      where: {
        status: 'completed',
        completedAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log('[Cleanup Jobs] Deleted', result.count, 'old completed jobs');
    return { deleted: result.count };
  } catch (error) {
    console.error('[Cleanup Jobs Error]', error);
    return { deleted: 0, error };
  }
}
