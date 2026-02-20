/**
 * Voter Import Job Processor
 * 
 * Handles async processing of voter file imports through the job queue system.
 * This allows large imports to run in the background without blocking the API.
 */

import { importerRegistry } from '@/lib/importers';
import { unlink } from 'fs/promises';
import {
  getJob,
  parseJobData,
  startJob,
  updateJobProgress,
  updateJobOutputStats,
  mergeJobData,
  completeJob,
  failJob,
  addJobError,
} from '@/lib/queue/runner';
import { OutputStats } from '@/lib/queue/types';
import { prisma } from '@/lib/prisma';

export interface ImportJobData {
  filePath: string;
  format: string;
  importType: 'full' | 'incremental';
  fileName: string;
  fileSize: number;
  userId?: string;
  [key: string]: string | number | boolean | object | null | undefined;
}

/**
 * Process a voter import job
 * 
 * Call this to execute an import job that was created with type 'voter_import'.
 * 
 * @param jobId - The job ID to process
 * @param jobData - The import job data (filePath, format, importType, etc.)
 */
export async function processImportJob(
  jobId: string,
  jobData: ImportJobData
): Promise<void> {
  try {
    const { filePath, format, importType, fileName, fileSize, userId } = jobData;

    console.log(`[Import Job] Starting: ${jobId} - ${fileName} (${format})`);

    // Get the importer for this format
    const importer = importerRegistry.get(format);
    if (!importer) {
      await failJob(jobId, `Unsupported format: ${format}`);
      return;
    }

    const existingJob = await getJob(jobId);
    if (!existingJob) {
      return;
    }

    if (existingJob.status === 'paused' || existingJob.status === 'cancelled' || existingJob.status === 'completed') {
      return;
    }

    const startResult = await startJob(jobId);
    if (!startResult) {
      return;
    }

    const parsedData = parseJobData(existingJob.data);
    const resumeFromProcessed = Math.max(
      0,
      Number(parsedData.resumeFromProcessed ?? existingJob.processedItems ?? 0)
    );

    // Execute the import with progress tracking
    const result = await importer.importFile({
      filePath,
      importType,
      format,
      fileSize,
      userId,
      resumeFromProcessed,
      onProgress: async (processed, total, errors, bytesProcessed) => {
        const currentJob = await prisma.job.findUnique({
          where: { id: jobId },
          select: { status: true },
        });

        if (currentJob?.status === 'paused') {
          await mergeJobData(jobId, {
            resumeFromProcessed: processed,
            resumedAt: new Date().toISOString(),
          });
          throw new Error('__JOB_PAUSED__');
        }

        if (currentJob?.status === 'cancelled') {
          await mergeJobData(jobId, {
            resumeFromProcessed: processed,
            resumedAt: new Date().toISOString(),
          });
          throw new Error('__JOB_CANCELLED__');
        }

        // Build output stats for voter import
        const outputStats: Partial<OutputStats> = {
          type: 'voter_import',
          recordsProcessed: processed,
          totalErrors: errors,
        };
        
        // Add file-based progress tracking if available
        if (fileSize && bytesProcessed !== undefined) {
          outputStats.bytesProcessed = bytesProcessed;
          outputStats.fileSize = fileSize;
          outputStats.percentComplete = Math.min(
            Math.round((bytesProcessed / fileSize) * 100),
            99
          );
        }
        
        // Update job progress with output stats
        await updateJobProgress(jobId, processed, total || undefined, outputStats);
        await mergeJobData(jobId, {
          resumeFromProcessed: processed,
        });
        
        if (errors > 0) {
          console.log(`[Import Job] ${jobId} - Processed: ${processed}, Bytes: ${bytesProcessed}, Errors: ${errors}`);
        }
      },
    });

    const existingStats = existingJob.outputStats ? JSON.parse(existingJob.outputStats) : {};
    const totalCreated = (existingStats.recordsCreated || 0) + result.created;
    const totalUpdated = (existingStats.recordsUpdated || 0) + result.updated;
    const totalSkipped = (existingStats.recordsSkipped || 0) + result.skipped;
    const totalErrors = (existingStats.totalErrors || 0) + result.errors;

    // Log any import errors
    if (result.errorDetails && result.errorDetails.length > 0) {
      for (const error of result.errorDetails.slice(0, 10)) {
        await addJobError(jobId, {
          timestamp: new Date().toISOString(),
          message: error.message,
          details: error.field ? `Field: ${error.field}` : undefined,
        });
      }
    }

    // Complete the job with final output stats
    const finalOutputStats: Partial<OutputStats> = {
      type: 'voter_import',
      recordsProcessed: result.processed,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      recordsSkipped: totalSkipped,
      totalErrors,
      percentComplete: 100,
    };
    
    if (fileSize) {
      finalOutputStats.fileSize = fileSize;
      finalOutputStats.bytesProcessed = fileSize; // Mark as fully processed
    }
    
    // Add line and header info if available
    if (result.linesProcessed !== undefined) {
      finalOutputStats.linesProcessed = result.linesProcessed;
    }
    if (result.headerDetected !== undefined) {
      finalOutputStats.headerDetected = result.headerDetected;
    }
    
    await updateJobOutputStats(jobId, finalOutputStats);
    
    await completeJob(jobId, {
      processed: result.processed,
      created: totalCreated,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: totalErrors,
      success: result.success,
      resumeFromProcessed: result.processed,
    });

    await cleanupImportFile(filePath);

    console.log(`[Import Job] Completed: ${jobId} - ${result.processed} processed, ${result.errors} errors`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage === '__JOB_PAUSED__' || errorMessage === '__JOB_CANCELLED__') {
      console.log(`[Import Job] Interrupted: ${jobId} - ${errorMessage}`);

      if (errorMessage === '__JOB_CANCELLED__') {
        await cleanupImportFile(jobData.filePath);
      }

      return;
    }

    console.error(`[Import Job Error] ${jobId}:`, error);
    await failJob(
      jobId,
      error instanceof Error ? error.message : 'Unknown error during import'
    );
    await cleanupImportFile(jobData.filePath);
  }
}

async function cleanupImportFile(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    // Ignore cleanup failures
  }
}

/**
 * Schedule an import job (for future background processing)
 * Creates the job but doesn't process it - expects an external worker to pick it up
 */
export async function scheduleImportJob(
  format: string,
  importType: 'full' | 'incremental',
  filePath: string,
  fileName: string,
  fileSize: number,
  createdById: string
) {
  const { createJob } = await import('@/lib/queue/runner');
  
  return await createJob(
    'voter_import',
    createdById,
    {
      format,
      importType,
      filePath,
      fileName,
      fileSize,
    }
  );
}
