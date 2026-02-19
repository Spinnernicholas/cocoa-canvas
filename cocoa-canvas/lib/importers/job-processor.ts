/**
 * Voter Import Job Processor
 * 
 * Handles async processing of voter file imports through the job queue system.
 * This allows large imports to run in the background without blocking the API.
 */

import { importerRegistry } from '@/lib/importers';
import {
  startJob,
  updateJobProgress,
  updateJobOutputStats,
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

    // Mark job as processing
    await startJob(jobId);

    // Execute the import with progress tracking
    const result = await importer.importFile({
      filePath,
      importType,
      format,
      fileSize,
      userId,
      onProgress: async (processed, total, errors, bytesProcessed) => {
        const currentJob = await prisma.job.findUnique({
          where: { id: jobId },
          select: { status: true },
        });

        if (currentJob?.status === 'paused') {
          throw new Error('__JOB_PAUSED__');
        }

        if (currentJob?.status === 'cancelled') {
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
        
        if (errors > 0) {
          console.log(`[Import Job] ${jobId} - Processed: ${processed}, Bytes: ${bytesProcessed}, Errors: ${errors}`);
        }
      },
    });

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
      recordsCreated: result.created,
      recordsUpdated: result.updated,
      recordsSkipped: result.skipped,
      totalErrors: result.errors,
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
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      success: result.success,
    });

    console.log(`[Import Job] Completed: ${jobId} - ${result.processed} processed, ${result.errors} errors`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage === '__JOB_PAUSED__' || errorMessage === '__JOB_CANCELLED__') {
      console.log(`[Import Job] Interrupted: ${jobId} - ${errorMessage}`);
      return;
    }

    console.error(`[Import Job Error] ${jobId}:`, error);
    await failJob(
      jobId,
      error instanceof Error ? error.message : 'Unknown error during import'
    );
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
