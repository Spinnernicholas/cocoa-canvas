/**
 * BullMQ Configuration and Queue Setup
 * 
 * Manages Redis-backed job queues with BullMQ for:
 * - Asynchronous job processing
 * - Scheduled/recurring jobs
 * - Job retries and failure handling
 * - Job priority and delays
 */

import { Queue, QueueOptions, Worker, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL for connection options
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
}

// Default queue options
export const defaultQueueOptions: QueueOptions = {
  connection: parseRedisUrl(REDIS_URL),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Default worker options
export const defaultWorkerOptions: WorkerOptions = {
  connection: parseRedisUrl(REDIS_URL),
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
};

// Queue names
export const QUEUE_NAMES = {
  VOTER_IMPORT: 'voter-import',
  SCHEDULED_JOBS: 'scheduled-jobs',
  DATA_CLEANUP: 'data-cleanup',
  REPORT_GENERATION: 'report-generation',
} as const;

// Singleton queues
let voterImportQueue: Queue | null = null;
let scheduledJobsQueue: Queue | null = null;

/**
 * Get or create voter import queue
 */
export function getVoterImportQueue(): Queue {
  if (!voterImportQueue) {
    voterImportQueue = new Queue(QUEUE_NAMES.VOTER_IMPORT, defaultQueueOptions);
  }
  return voterImportQueue;
}

/**
 * Get or create scheduled jobs queue
 */
export function getScheduledJobsQueue(): Queue {
  if (!scheduledJobsQueue) {
    scheduledJobsQueue = new Queue(QUEUE_NAMES.SCHEDULED_JOBS, defaultQueueOptions);
  }
  return scheduledJobsQueue;
}

/**
 * Close all queue connections
 */
export async function closeQueues() {
  const queues = [voterImportQueue, scheduledJobsQueue].filter(Boolean);
  await Promise.all(queues.map(q => q?.close()));
  voterImportQueue = null;
  scheduledJobsQueue = null;
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = new Redis(parseRedisUrl(REDIS_URL));
    const pong = await redis.ping();
    await redis.quit();
    return pong === 'PONG';
  } catch (error) {
    console.error('[Redis Health Check] Failed:', error);
    return false;
  }
}
