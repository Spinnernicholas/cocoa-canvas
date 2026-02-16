/**
 * BullMQ Job Worker
 * 
 * Processes jobs from Redis queues
 * Handles voter imports, scheduled tasks, and generic jobs
 */

import { Worker, Job } from 'bullmq';
import { VoterImportJobData, ScheduledJobData, JobData } from './bullmq';
import { processImportJob } from '@/lib/importers/job-processor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const redisConnection = {
  url: process.env.REDIS_URL!,
};

let workers: Worker[] = [];

/**
 * Start all job workers
 */
export async function startWorkers() {
  console.log('[Worker] Starting job workers');

  // Voter Import Worker
  const voterImportWorker = new Worker<VoterImportJobData>(
    'voter-import',
    async (job: Job<VoterImportJobData>) => {
      console.log(`[Worker] Processing voter import job: ${job.id}`);
      try {
        // Find the corresponding database job record by parsing JSON data
        const jobs = await prisma.job.findMany({
          where: {
            type: 'import_voters',
            status: { in: ['pending', 'processing'] },
          },
          take: 100, // Limit to prevent loading too many records
        });

        const dbJob = jobs.find((j) => {
          try {
            const jobData = j.data ? JSON.parse(j.data) : {};
            return jobData.filePath === job.data.filePath;
          } catch {
            return false;
          }
        });

        if (dbJob) {
          // Process using existing import job processor
          await processImportJob(dbJob.id, job.data);
        } else {
          // Direct processing if no DB job found
          throw new Error('No corresponding job record found');
        }

        return { success: true, jobId: job.id };
      } catch (error) {
        console.error(`[Worker] Error processing voter import job ${job.id}:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,  // Process one import at a time
    }
  );

  // Scheduled Jobs Worker
  const scheduledJobsWorker = new Worker<ScheduledJobData>(
    'scheduled-jobs',
    async (job: Job<ScheduledJobData>) => {
      console.log(`[Worker] Processing scheduled job: ${job.id}`);
      try {
        const { jobType, scheduledJobId } = job.data;

        // Update scheduled job status
        await prisma.scheduledJob.update({
          where: { id: scheduledJobId },
          data: {
            lastStatus: 'running',
          },
        });

        // Route to appropriate handler based on jobType
        switch (jobType) {
          case 'voter_import': {
            // For scheduled voter imports
            const scheduledJob = await prisma.scheduledJob.findUnique({
              where: { id: scheduledJobId },
            });

            if (!scheduledJob) {
              throw new Error(`Scheduled job ${scheduledJobId} not found`);
            }

            // Execute voter import with scheduled job data
            const jobData = JSON.parse(scheduledJob.data || '{}');
            const filePath = jobData.filePath;
            if (!filePath) {
              throw new Error('No filePath in scheduled job data');
            }

            // Create a temporary import job for processing
            const tempJob = await prisma.job.create({
              data: {
                type: 'voter_import',
                status: 'processing',
                data: JSON.stringify(jobData),
              },
            });

            try {
              await processImportJob(tempJob.id, jobData as VoterImportJobData);
            } finally {
              // Clean up temp job if needed
            }

            break;
          }

          case 'data_cleanup': {
            // Execute data cleanup logic
            console.log(`[Worker] Executing data cleanup`);
            // Add cleanup logic here
            break;
          }

          default:
            console.warn(`[Worker] Unknown job type: ${jobType}`);
        }

        // Update scheduled job status to success
        await prisma.scheduledJob.update({
          where: { id: scheduledJobId },
          data: {
            lastStatus: 'success',
            lastError: null,
          },
        });

        return { success: true, scheduledJobId };
      } catch (error) {
        console.error(`[Worker] Error processing scheduled job ${job.id}:`, error);

        // Update scheduled job with error
        try {
          const scheduledJobId = job.data.scheduledJobId;
          await prisma.scheduledJob.update({
            where: { id: scheduledJobId },
            data: {
              lastStatus: 'failed',
              lastError: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        } catch {
          // Silently fail if we can't update the db
        }

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 3,  // Allow some parallelism for scheduled jobs
    }
  );

  // Setup event handlers
  voterImportWorker.on('completed', (job) => {
    console.log(`[Worker] Voter import job completed: ${job.id}`);
  });

  voterImportWorker.on('failed', (job, error) => {
    console.error(`[Worker] Voter import job failed: ${job?.id}`, error?.message);
  });

  scheduledJobsWorker.on('completed', (job) => {
    console.log(`[Worker] Scheduled job completed: ${job.id}`);
  });

  scheduledJobsWorker.on('failed', (job, error) => {
    console.error(`[Worker] Scheduled job failed: ${job?.id}`, error?.message);
  });

  workers.push(voterImportWorker, scheduledJobsWorker);

  console.log('[Worker] All workers started');
  return workers;
}

/**
 * Stop all workers
 */
export async function stopWorkers() {
  console.log('[Worker] Stopping all workers');
  for (const worker of workers) {
    await worker.close();
  }
  workers = [];
  console.log('[Worker] All workers stopped');
}

/**
 * Get worker status
 */
export async function getWorkerStatus() {
  return {
    activeWorkers: workers.length,
    workerNames: workers.map(w => w.name),
  };
}
