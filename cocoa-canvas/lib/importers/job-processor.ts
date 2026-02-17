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
  completeJob,
  failJob,
  addJobError,
} from '@/lib/queue/runner';

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
    const { filePath, format, importType, fileName, userId } = jobData;

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
      userId,
      onProgress: async (processed, total, errors) => {
        // Update job progress
        await updateJobProgress(jobId, processed, total || undefined);
        
        if (errors > 0) {
          console.log(`[Import Job] ${jobId} - Processed: ${processed}, Errors: ${errors}`);
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

    // Complete the job with final stats
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
