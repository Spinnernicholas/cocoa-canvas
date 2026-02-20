import { Job as DbJob } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getGeocodeQueue, getVoterImportQueue } from './bullmq';
import { failJob, mergeJobData, parseJobData } from './runner';
import { Queue } from 'bullmq';

export type RecoverAction = 'requeued' | 'failed' | 'skipped';

export interface RecoverySummary {
  scanned: number;
  pendingRequeued: number;
  processingRecovered: number;
  failed: number;
  skipped: number;
}

export type ProcessingRecoveryHandler = (job: DbJob) => Promise<RecoverAction>;

const processingRecoveryHandlers = new Map<string, ProcessingRecoveryHandler>();

function canonicalJobType(type: string): string {
  if (type === 'voter_import' || type === 'import_voters') {
    return 'import';
  }

  if (type === 'geocoding' || type === 'geocode_households') {
    return 'geocode';
  }

  return type;
}

export function registerProcessingRecoveryHandler(type: string, handler: ProcessingRecoveryHandler) {
  processingRecoveryHandlers.set(canonicalJobType(type), handler);
}

function getProcessingRecoveryHandler(type: string): ProcessingRecoveryHandler | undefined {
  return processingRecoveryHandlers.get(canonicalJobType(type));
}

function toImportPayload(job: DbJob) {
  const parsedData = parseJobData(job.data);

  if (!parsedData.filePath || !parsedData.format || !parsedData.fileName) {
    return null;
  }

  return {
    filePath: parsedData.filePath as string,
    format: parsedData.format as string,
    importType: (parsedData.importType as 'full' | 'incremental') || 'full',
    fileName: parsedData.fileName as string,
    fileSize: Number(parsedData.fileSize || 0),
    userId: parsedData.userId as string | undefined,
  };
}

function toGeocodePayload(job: DbJob) {
  const parsedData = parseJobData(job.data);

  return {
    filters: (parsedData.filters as Record<string, any>) || {},
    limit: (parsedData.limit as number) || 10000,
    skipGeocoded: (parsedData.skipGeocoded as boolean) !== false,
    providerId: parsedData.providerId as string | undefined,
    householdIds: Array.isArray(parsedData.householdIds)
      ? (parsedData.householdIds as string[])
      : undefined,
    checkpointIndex: Number(parsedData.checkpointIndex || job.processedItems || 0),
    dynamic: Boolean(parsedData.dynamic ?? job.isDynamic),
  };
}

async function enqueueImportJob(job: DbJob): Promise<RecoverAction> {
  const queue = getVoterImportQueue();
  const shouldContinue = await removeTerminalQueueJobIfPresent(queue, job.id);
  if (!shouldContinue) {
    return 'skipped';
  }

  const payload = toImportPayload(job);
  if (!payload) {
    await failJob(job.id, 'Import job data is incomplete and cannot be enqueued');
    return 'failed';
  }

  await queue.add('import-voters', payload, { jobId: job.id });
  return 'requeued';
}

async function enqueueGeocodeJob(job: DbJob): Promise<RecoverAction> {
  const queue = getGeocodeQueue();
  const shouldContinue = await removeTerminalQueueJobIfPresent(queue, job.id);
  if (!shouldContinue) {
    return 'skipped';
  }

  await queue.add('geocode', toGeocodePayload(job), { jobId: job.id });
  return 'requeued';
}

export async function enqueueJobFromDb(job: DbJob): Promise<RecoverAction> {
  const canonical = canonicalJobType(job.type);

  if (canonical === 'import') {
    return enqueueImportJob(job);
  }

  if (canonical === 'geocode') {
    return enqueueGeocodeJob(job);
  }

  return 'skipped';
}

async function recoverProcessingImportJob(job: DbJob): Promise<RecoverAction> {
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: 'pending',
      startedAt: null,
      completedAt: null,
    },
  });

  await mergeJobData(job.id, {
    recoveryMode: 'unexpected_shutdown',
    recoveredAt: new Date().toISOString(),
  });

  const refreshedJob = await prisma.job.findUnique({ where: { id: job.id } });
  if (!refreshedJob) {
    return 'failed';
  }

  return enqueueImportJob(refreshedJob);
}

async function recoverProcessingGeocodeJob(job: DbJob): Promise<RecoverAction> {
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: 'pending',
      startedAt: null,
      completedAt: null,
    },
  });

  await mergeJobData(job.id, {
    checkpointIndex: job.processedItems || 0,
    recoveryMode: 'unexpected_shutdown',
    recoveredAt: new Date().toISOString(),
  });

  const refreshedJob = await prisma.job.findUnique({ where: { id: job.id } });
  if (!refreshedJob) {
    return 'failed';
  }

  return enqueueGeocodeJob(refreshedJob);
}

registerProcessingRecoveryHandler('import', recoverProcessingImportJob);
registerProcessingRecoveryHandler('geocode', recoverProcessingGeocodeJob);

async function removeTerminalQueueJobIfPresent(queue: Queue, jobId: string): Promise<boolean> {
  const existing = await queue.getJob(jobId);
  if (!existing) {
    return true;
  }

  const state = await existing.getState();
  if (state === 'failed' || state === 'completed') {
    await existing.remove();
    return true;
  }

  return false;
}

export async function recoverJobsOnStartup(): Promise<RecoverySummary> {
  const summary: RecoverySummary = {
    scanned: 0,
    pendingRequeued: 0,
    processingRecovered: 0,
    failed: 0,
    skipped: 0,
  };

  const jobs = await prisma.job.findMany({
    where: {
      status: { in: ['pending', 'processing'] },
      type: { in: ['voter_import', 'import_voters', 'geocoding', 'geocode_households'] },
    },
    orderBy: { createdAt: 'asc' },
  });

  summary.scanned = jobs.length;

  for (const job of jobs) {
    try {
      if (job.status === 'pending') {
        const action = await enqueueJobFromDb(job);
        if (action === 'requeued') {
          summary.pendingRequeued++;
        } else if (action === 'failed') {
          summary.failed++;
        } else {
          summary.skipped++;
        }
        continue;
      }

      const handler = getProcessingRecoveryHandler(job.type);
      if (!handler) {
        summary.skipped++;
        continue;
      }

      const action = await handler(job);
      if (action === 'requeued') {
        summary.processingRecovered++;
      } else if (action === 'failed') {
        summary.failed++;
      } else {
        summary.skipped++;
      }
    } catch (error) {
      summary.failed++;
      console.error(`[Startup Recovery] Failed to recover job ${job.id}:`, error);
    }
  }

  return summary;
}
