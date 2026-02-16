/**
 * Scheduled Job Scheduler
 * 
 * Runs in background to check for scheduled jobs that need to execute
 * Uses cron expressions to determine next run time
 */

import { PrismaClient } from '@prisma/client';
import { Cron } from 'croner';
import { getScheduledJobsQueue } from './bullmq';

const prisma = new PrismaClient();

// Map to track active cron jobs
const cronJobs = new Map<string, InstanceType<typeof Cron>>();

/**
 * Initialize the scheduled job scheduler
 * Loads all enabled scheduled jobs and sets up poll interval
 */
export async function initializeScheduler() {
  console.log('[Scheduler] Initializing scheduled job scheduler');

  // Load existing scheduled jobs from database
  await loadScheduledJobs();

  // Start polling for jobs that need to run
  startSchedulerPoll();
}

/**
 * Load scheduled jobs from database and set up their cron schedule
 */
async function loadScheduledJobs() {
  try {
    const jobs = await prisma.scheduledJob.findMany({
      where: { enabled: true },
    });

    console.log(`[Scheduler] Found ${jobs.length} enabled scheduled jobs`);

    for (const job of jobs) {
      setupCronJob(job);
    }
  } catch (error) {
    console.error('[Scheduler] Error loading scheduled jobs:', error);
  }
}

/**
 * Setup a cron job for a scheduled job record
 */
function setupCronJob(job: any) {
  try {
    // Clean up existing job if any
    if (cronJobs.has(job.id)) {
      const existing = cronJobs.get(job.id);
      existing?.stop();
      cronJobs.delete(job.id);
    }

    // Create new cron job
    const cron = new Cron(job.schedule, async () => {
      await executeScheduledJob(job.id);
    });

    cronJobs.set(job.id, cron);
    console.log(`[Scheduler] Setup cron job: ${job.name} (${job.schedule})`);
  } catch (error) {
    console.error(`[Scheduler] Error setting up cron for ${job.name}:`, error);
  }
}

/**
 * Poll for scheduled jobs that haven't been executed yet
 * This is a fallback mechanism in case cron schedule is missed
 */
function startSchedulerPoll() {
  setInterval(async () => {
    try {
      const now = new Date();

      // Find jobs that are due to run
      const dueJobs = await prisma.scheduledJob.findMany({
        where: {
          enabled: true,
          nextRunAt: {
            lte: now,
          },
        },
      });

      for (const job of dueJobs) {
        console.log(`[Scheduler] Executing overdue job: ${job.name}`);
        await executeScheduledJob(job.id);
      }
    } catch (error) {
      console.error('[Scheduler] Error in poll loop:', error);
    }
  }, 60000);  // Poll every minute

  console.log('[Scheduler] Started poll interval (60s)');
}

/**
 * Execute a scheduled job by adding it to the queue
 */
async function executeScheduledJob(jobId: string) {
  try {
    const job = await prisma.scheduledJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      console.error(`[Scheduler] Scheduled job not found: ${jobId}`);
      return;
    }

    // Skip if already running
    if (job.lastStatus === 'running') {
      console.log(`[Scheduler] Job ${job.name} is already running`);
      return;
    }

    console.log(`[Scheduler] Executing: ${job.name} (${job.type})`);

    // Add job to queue
    const queue = getScheduledJobsQueue();
    const jobData = JSON.parse(job.data || '{}');
    
    await queue.add(
      `${job.type}-${job.id}`,
      {
        jobType: job.type,
        scheduledJobId: job.id,
        ...jobData,
      },
      {
        jobId: `scheduled-${job.id}-${Date.now()}`,
      }
    );

    // Update scheduled job record
    const nextRun = calculateNextRun(job.schedule);

    await prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: nextRun,
        lastStatus: 'running',
        runCount: { increment: 1 },
      },
    });
  } catch (error) {
    console.error(`[Scheduler] Error executing job ${jobId}:`, error);

    // Update job with error
    try {
      await prisma.scheduledJob.update({
        where: { id: jobId },
        data: {
          lastStatus: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (updateError) {
      console.error(`[Scheduler] Error updating job status:`, updateError);
    }
  }
}

/**
 * Calculate next run time from cron expression
 */
function calculateNextRun(cronExpression: string): Date {
  try {
    const cron = new Cron(cronExpression);
    const nextDate = cron.nextRun();
    return nextDate instanceof Date ? nextDate : new Date();
  } catch {
    // If cron expression is invalid, schedule for next hour
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    return nextHour;
  }
}

/**
 * Add or update a scheduled job
 */
export async function upsertScheduledJob(
  id: string | undefined,
  data: {
    name: string;
    description?: string;
    type: string;
    schedule: string;
    enabled: boolean;
    jobData?: any;
    createdById?: string;
  }
) {
  try {
    const job = await prisma.scheduledJob.upsert({
      where: { id: id || 'new' },
      update: {
        name: data.name,
        description: data.description,
        type: data.type,
        schedule: data.schedule,
        enabled: data.enabled,
        data: data.jobData ? JSON.stringify(data.jobData) : undefined,
      },
      create: {
        name: data.name,
        description: data.description,
        type: data.type,
        schedule: data.schedule,
        enabled: data.enabled,
        data: data.jobData ? JSON.stringify(data.jobData) : null,
        nextRunAt: calculateNextRun(data.schedule),
        createdById: data.createdById || '',
      },
    });

    // Setup/teardown cron as needed
    if (job.enabled) {
      setupCronJob(job);
    } else {
      const cron = cronJobs.get(job.id);
      if (cron) {
        cron.stop();
        cronJobs.delete(job.id);
      }
    }

    console.log(`[Scheduler] Upserted scheduled job: ${job.name}`);
    return job;
  } catch (error) {
    console.error('[Scheduler] Error upserting scheduled job:', error);
    throw error;
  }
}

/**
 * Delete a scheduled job
 */
export async function deleteScheduledJob(jobId: string) {
  try {
    // Stop cron job
    const cron = cronJobs.get(jobId);
    if (cron) {
      cron.stop();
      cronJobs.delete(jobId);
    }

    // Delete from database
    await prisma.scheduledJob.delete({
      where: { id: jobId },
    });

    console.log(`[Scheduler] Deleted scheduled job: ${jobId}`);
  } catch (error) {
    console.error('[Scheduler] Error deleting scheduled job:', error);
    throw error;
  }
}

/**
 * Shutdown scheduler
 */
export async function shutdownScheduler() {
  console.log('[Scheduler] Shutting down');
  for (const [id, cron] of cronJobs.entries()) {
    cron.stop();
  }
  cronJobs.clear();
  await prisma.$disconnect();
}

