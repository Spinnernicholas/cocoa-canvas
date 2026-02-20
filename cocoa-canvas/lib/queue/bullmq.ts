/**
 * BullMQ Configuration
 * 
 * Centralizes Redis connection and queue creation
 * Provides typed queue instances for the application
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import IoRedis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required');
}

// Create Redis client for general use
export const redis = new IoRedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Handle connection errors
redis.on('error', (error) => {
  console.error('[Redis Connection Error]', error);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('disconnect', () => {
  console.log('[Redis] Disconnected');
});

/**
 * Job Queue Types
 */
export interface VoterImportJobData {
  filePath: string;
  format: string;
  importType: 'full' | 'incremental';
  fileName: string;
  fileSize: number;
  userId?: string;
  [key: string]: string | number | boolean | object | null | undefined;
}

export interface ScheduledJobData {
  jobType: string;
  scheduledJobId: string;
  [key: string]: string | number | boolean | object | null | undefined;
}

export interface GeocodeJobData {
  filters: {
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
    precinctNumber?: string;
  };
  limit?: number;
  providerId?: string;
  skipGeocoded?: boolean;
  householdIds?: string[];
  checkpointIndex?: number;
  dynamic?: boolean;
}

export type JobData = VoterImportJobData | ScheduledJobData | GeocodeJobData | Record<string, any>;

/**
 * Create or get job queues
 */
const queuesMap = {
  voterImportQueue: null as Queue<VoterImportJobData> | null,
  scheduledJobsQueue: null as Queue<ScheduledJobData> | null,
  geocodeQueue: null as Queue<GeocodeJobData> | null,
  genericQueue: null as Queue<JobData> | null,
};

export function getVoterImportQueue(): Queue<VoterImportJobData> {
  if (!queuesMap.voterImportQueue) {
    queuesMap.voterImportQueue = new Queue<VoterImportJobData>('voter-import', {
      connection: {
        url: process.env.REDIS_URL!,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return queuesMap.voterImportQueue;
}

export function getScheduledJobsQueue(): Queue<ScheduledJobData> {
  if (!queuesMap.scheduledJobsQueue) {
    queuesMap.scheduledJobsQueue = new Queue<ScheduledJobData>('scheduled-jobs', {
      connection: {
        url: process.env.REDIS_URL!,
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return queuesMap.scheduledJobsQueue;
}

export function getGeocodeQueue(): Queue<GeocodeJobData> {
  if (!queuesMap.geocodeQueue) {
    queuesMap.geocodeQueue = new Queue<GeocodeJobData>('geocode-households', {
      connection: {
        url: process.env.REDIS_URL!,
      },
      defaultJobOptions: {
        attempts: 1,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return queuesMap.geocodeQueue;
}

export function getGenericQueue(): Queue<JobData> {
  if (!queuesMap.genericQueue) {
    queuesMap.genericQueue = new Queue<JobData>('generic', {
      connection: {
        url: process.env.REDIS_URL!,
      },
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return queuesMap.genericQueue;
}

// Setup queue events for logging
const setupQueueEvents = () => {
  const voterImportQueue = getVoterImportQueue();
  const scheduledJobsQueue = getScheduledJobsQueue();
  const geocodeQueue = getGeocodeQueue();

  const voterImportQueueEvents = new QueueEvents('voter-import', { connection: { url: process.env.REDIS_URL! } });
  const scheduledJobsQueueEvents = new QueueEvents('scheduled-jobs', { connection: { url: process.env.REDIS_URL! } });
  const geocodeQueueEvents = new QueueEvents('geocode-households', { connection: { url: process.env.REDIS_URL! } });

  voterImportQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[Queue] Job ${jobId} completed`);
  });

  voterImportQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] Job ${jobId} failed:`, failedReason);
  });

  scheduledJobsQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[Queue] Scheduled job ${jobId} completed`);
  });

  scheduledJobsQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] Scheduled job ${jobId} failed:`, failedReason);
  });

  geocodeQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[Queue] Geocode job ${jobId} completed`);
  });

  geocodeQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] Geocode job ${jobId} failed:`, failedReason);
  });

  return {
    voterImport: voterImportQueueEvents,
    scheduledJobs: scheduledJobsQueueEvents,
    geocode: geocodeQueueEvents,
  };
};

let queueEventsInstance: ReturnType<typeof setupQueueEvents> | null = null;

export function getQueueEvents() {
  if (!queueEventsInstance) {
    queueEventsInstance = setupQueueEvents();
  }
  return queueEventsInstance;
}

/**
 * Graceful shutdown
 */
export async function closeQueues() {
  if (queuesMap.voterImportQueue) await queuesMap.voterImportQueue.close();
  if (queuesMap.scheduledJobsQueue) await queuesMap.scheduledJobsQueue.close();
  if (queuesMap.geocodeQueue) await queuesMap.geocodeQueue.close();
  if (queuesMap.genericQueue) await queuesMap.genericQueue.close();
  if (queueEventsInstance) {
    await queueEventsInstance.voterImport.close();
    await queueEventsInstance.scheduledJobs.close();
    await queueEventsInstance.geocode.close();
  }
  await redis.quit();
}
