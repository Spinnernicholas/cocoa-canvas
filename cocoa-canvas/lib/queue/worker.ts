/**
 * BullMQ Job Worker
 * 
 * Processes jobs from Redis queues
 * Handles voter imports, scheduled tasks, and generic jobs
 */

import { Worker, Job } from 'bullmq';
import { VoterImportJobData, ScheduledJobData, GeocodeJobData, JobData } from './bullmq';
import { processImportJob } from '@/lib/importers/job-processor';
import { processGeocodeJob } from '@/lib/gis/geocode-job-processor';
import { prisma } from '@/lib/prisma';
import { DEFAULT_JOBS_CONFIG, getJobsConfig } from './config';

const redisConnection = {
  url: process.env.REDIS_URL!,
};

let workers: Worker[] = [];

type WorkerType = 'import' | 'geocode' | 'scheduled';

class CentralWorkerPool {
  private readonly maxWorkers: number;
  private readonly maxByType: Record<WorkerType, number>;
  private activeWorkers = 0;
  private readonly activeByType: Record<WorkerType, number> = {
    import: 0,
    geocode: 0,
    scheduled: 0,
  };
  private readonly waitQueue: Array<{ type: WorkerType; resolve: () => void }> = [];

  constructor(maxWorkers: number, maxByType: Record<WorkerType, number>) {
    this.maxWorkers = Math.max(1, maxWorkers);
    this.maxByType = maxByType;
  }

  private canRun(type: WorkerType) {
    return this.activeWorkers < this.maxWorkers && this.activeByType[type] < this.maxByType[type];
  }

  async acquire(type: WorkerType) {
    if (this.canRun(type)) {
      this.activeWorkers++;
      this.activeByType[type]++;
      return;
    }

    await new Promise<void>((resolve) => {
      this.waitQueue.push({ type, resolve });
    });

    this.activeWorkers++;
    this.activeByType[type]++;
  }

  release(type: WorkerType) {
    this.activeWorkers = Math.max(0, this.activeWorkers - 1);
    this.activeByType[type] = Math.max(0, this.activeByType[type] - 1);

    for (let index = 0; index < this.waitQueue.length; ) {
      const candidate = this.waitQueue[index];
      if (this.canRun(candidate.type)) {
        this.waitQueue.splice(index, 1);
        candidate.resolve();
      } else {
        index++;
      }

      if (this.activeWorkers >= this.maxWorkers) {
        break;
      }
    }
  }

  snapshot() {
    return {
      maxWorkers: this.maxWorkers,
      activeWorkers: this.activeWorkers,
      waitingJobs: this.waitQueue.length,
      maxByType: { ...this.maxByType },
      activeByType: { ...this.activeByType },
    };
  }
}

let centralWorkerPool: CentralWorkerPool | null = null;

async function withWorkerSlot<T>(type: WorkerType, fn: () => Promise<T>): Promise<T> {
  if (!centralWorkerPool) {
    return fn();
  }

  await centralWorkerPool.acquire(type);
  try {
    return await fn();
  } finally {
    centralWorkerPool.release(type);
  }
}

/**
 * Start all job workers
 */
export async function startWorkers() {
  if (workers.length > 0) {
    console.log('[Worker] Workers already started');
    return workers;
  }

  console.log('[Worker] Starting job workers');

  let jobsConfig = DEFAULT_JOBS_CONFIG;
  try {
    jobsConfig = await getJobsConfig();
  } catch (error) {
    console.error('[Worker] Failed to load jobs config, using defaults', error);
  }

  console.log('[Worker] Using jobs config', jobsConfig);

  centralWorkerPool = new CentralWorkerPool(jobsConfig.maxWorkers, {
    import: jobsConfig.importWorkers,
    geocode: jobsConfig.geocodeWorkers,
    scheduled: jobsConfig.scheduledWorkers,
  });

  const importConcurrency = Math.max(1, Math.min(jobsConfig.importWorkers, jobsConfig.maxWorkers));
  const geocodeConcurrency = Math.max(1, Math.min(jobsConfig.geocodeWorkers, jobsConfig.maxWorkers));
  const scheduledConcurrency = Math.max(1, Math.min(jobsConfig.scheduledWorkers, jobsConfig.maxWorkers));

  // Voter Import Worker
  const voterImportWorker = new Worker<VoterImportJobData>(
    'voter-import',
    async (job: Job<VoterImportJobData>) => {
      return withWorkerSlot('import', async () => {
        console.log(`[Worker] Processing voter import job: ${job.id}`);
        try {
          const jobId = String(job.id);
          const dbJob = await prisma.job.findUnique({
            where: { id: jobId },
          });

          if (dbJob) {
            await processImportJob(dbJob.id, job.data);
          } else {
            throw new Error('No corresponding job record found');
          }

          return { success: true, jobId: job.id };
        } catch (error) {
          console.error(`[Worker] Error processing voter import job ${job.id}:`, error);
          throw error;
        }
      });
    },
    {
      connection: redisConnection,
      concurrency: importConcurrency,
    }
  );

  // Scheduled Jobs Worker
  const scheduledJobsWorker = new Worker<ScheduledJobData>(
    'scheduled-jobs',
    async (job: Job<ScheduledJobData>) => {
      return withWorkerSlot('scheduled', async () => {
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
      });
    },
    {
      connection: redisConnection,
      concurrency: scheduledConcurrency,
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

  // Household Geocoding Worker
  const geocodeWorker = new Worker<GeocodeJobData>(
    'geocode-households',
    async (job: Job<GeocodeJobData>) => {
      return withWorkerSlot('geocode', async () => {
        console.log(`[Worker] Processing geocode job: ${job.id}`);
        try {
          const dbJob = await prisma.job.findUnique({
            where: { id: job.id },
          });

          if (!dbJob) {
            throw new Error(`No database job record found for ${job.id}`);
          }

          await processGeocodeJob(dbJob.id, job.data, dbJob.createdById ?? undefined);

          return { success: true, jobId: job.id };
        } catch (error) {
          console.error(`[Worker] Error processing geocode job ${job.id}:`, error);
          throw error;
        }
      });
    },
    {
      connection: redisConnection,
      concurrency: geocodeConcurrency,
    }
  );

  geocodeWorker.on('completed', (job) => {
    console.log(`[Worker] Geocode job completed: ${job?.id}`);
  });

  geocodeWorker.on('failed', (job, error) => {
    console.error(`[Worker] Geocode job failed: ${job?.id}`, error?.message);
  });

  workers.push(voterImportWorker, scheduledJobsWorker, geocodeWorker);

  console.log('[Worker] All workers started');
  return workers;
}

/**
 * Stop all workers
 */
export async function stopWorkers() {
  if (workers.length === 0) {
    return;
  }

  console.log('[Worker] Stopping all workers');
  for (const worker of workers) {
    await worker.close();
  }
  workers = [];
  centralWorkerPool = null;
  console.log('[Worker] All workers stopped');
}

/**
 * Get worker status
 */
export async function getWorkerStatus() {
  return {
    activeWorkers: workers.length,
    workerNames: workers.map(w => w.name),
    pool: centralWorkerPool?.snapshot() || null,
  };
}
