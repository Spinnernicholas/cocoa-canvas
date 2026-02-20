import { prisma } from '@/lib/prisma';

export const JOBS_CONFIG_SETTING_KEY = 'jobs_config';

export interface JobsConfig {
  maxWorkers: number;
  importWorkers: number;
  geocodeWorkers: number;
  scheduledWorkers: number;
}

export const DEFAULT_JOBS_CONFIG: JobsConfig = {
  maxWorkers: 5,
  importWorkers: 1,
  geocodeWorkers: 1,
  scheduledWorkers: 3,
};

const MIN_WORKERS = 1;
const MAX_WORKERS = 10;

function clampWorkerCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  if (normalized < MIN_WORKERS) {
    return MIN_WORKERS;
  }

  if (normalized > MAX_WORKERS) {
    return MAX_WORKERS;
  }

  return normalized;
}

export function sanitizeJobsConfig(input: Partial<JobsConfig>): JobsConfig {
  return {
    maxWorkers: clampWorkerCount(input.maxWorkers, DEFAULT_JOBS_CONFIG.maxWorkers),
    importWorkers: clampWorkerCount(input.importWorkers, DEFAULT_JOBS_CONFIG.importWorkers),
    geocodeWorkers: clampWorkerCount(input.geocodeWorkers, DEFAULT_JOBS_CONFIG.geocodeWorkers),
    scheduledWorkers: clampWorkerCount(input.scheduledWorkers, DEFAULT_JOBS_CONFIG.scheduledWorkers),
  };
}

export async function getJobsConfig(): Promise<JobsConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: JOBS_CONFIG_SETTING_KEY },
  });

  if (!setting?.value) {
    return DEFAULT_JOBS_CONFIG;
  }

  try {
    const parsed = JSON.parse(setting.value) as Partial<JobsConfig>;
    return sanitizeJobsConfig(parsed);
  } catch {
    return DEFAULT_JOBS_CONFIG;
  }
}

export async function saveJobsConfig(input: Partial<JobsConfig>): Promise<JobsConfig> {
  const config = sanitizeJobsConfig(input);

  await prisma.setting.upsert({
    where: { key: JOBS_CONFIG_SETTING_KEY },
    update: { value: JSON.stringify(config) },
    create: {
      key: JOBS_CONFIG_SETTING_KEY,
      value: JSON.stringify(config),
    },
  });

  return config;
}
