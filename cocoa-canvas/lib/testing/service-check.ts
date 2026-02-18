/**
 * Service availability checker for integration tests
 * 
 * Verifies that test PostgreSQL and Redis are running before tests execute.
 * Prevents cryptic connection errors by failing fast with helpful messages.
 */

import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

let servicesChecked = false;
let postgresAvailable = false;
let redisAvailable = false;

/**
 * Check if test PostgreSQL is available
 */
async function checkPostgres(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if test Redis is available
 */
async function checkRedis(): Promise<boolean> {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380', {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check all required test services
 * Call once at the start of test suite
 */
export async function checkTestServices(): Promise<{
  postgres: boolean;
  redis: boolean;
  allAvailable: boolean;
}> {
  if (servicesChecked) {
    return {
      postgres: postgresAvailable,
      redis: redisAvailable,
      allAvailable: postgresAvailable && redisAvailable,
    };
  }

  console.log('[Test Services] Checking availability...');

  postgresAvailable = await checkPostgres();
  redisAvailable = await checkRedis();
  servicesChecked = true;

  if (postgresAvailable) {
    console.log('✓ PostgreSQL test database available');
  } else {
    console.warn('✗ PostgreSQL test database NOT available');
  }

  if (redisAvailable) {
    console.log('✓ Redis test instance available');
  } else {
    console.warn('✗ Redis test instance NOT available');
  }

  return {
    postgres: postgresAvailable,
    redis: redisAvailable,
    allAvailable: postgresAvailable && redisAvailable,
  };
}

/**
 * Require test services or skip test suite
 * Use in describe() blocks for integration tests
 */
export async function requireTestServices(services: {
  postgres?: boolean;
  redis?: boolean;
}): Promise<void> {
  const status = await checkTestServices();

  const missing: string[] = [];

  if (services.postgres && !status.postgres) {
    missing.push('PostgreSQL (port 5433)');
  }

  if (services.redis && !status.redis) {
    missing.push('Redis (port 6380)');
  }

  if (missing.length > 0) {
    const message = `
╔════════════════════════════════════════════════════════════════╗
║  Test Services Required But Not Available                     ║
╠════════════════════════════════════════════════════════════════╣
║  Missing: ${missing.join(', ').padEnd(50)} ║
║                                                                ║
║  To run integration tests, start test services:                ║
║  $ npm run docker:test:up                                      ║
║                                                                ║
║  To run unit tests only (no services needed):                  ║
║  $ npm run test:unit                                           ║
╚════════════════════════════════════════════════════════════════╝
    `.trim();

    throw new Error(message);
  }
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
}

/**
 * Get helpful error message for missing services
 */
export function getServiceErrorMessage(service: 'postgres' | 'redis'): string {
  const portMap = {
    postgres: '5433',
    redis: '6380',
  };

  return `
${service.toUpperCase()} test service not available on port ${portMap[service]}.

Start test services with:
  npm run docker:test:up

Or check if services are running:
  docker ps | grep test

View logs:
  npm run docker:test:logs
  `.trim();
}
