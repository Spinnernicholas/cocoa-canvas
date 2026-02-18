import { execSync } from 'child_process';
import { prisma } from '@/lib/prisma';

/**
 * Test Database Setup Utilities
 * 
 * Provides helpers for managing test database lifecycle:
 * - Schema initialization
 * - Data cleanup between tests
 * - Test user creation
 * - Authenticated request helpers
 * 
 * Usage in tests:
 * 
 * beforeAll(async () => {
 *   await setupTestDatabase();
 * });
 * 
 * beforeEach(async () => {
 *   await cleanupTestDatabase();
 * });
 * 
 * afterAll(async () => {
 *   await disconnectTestDatabase();
 * });
 */

/**
 * Initialize test database with current schema
 * Run once before all tests in a suite
 */
export async function setupTestDatabase() {
  try {
    console.log('[Test DB] Pushing schema to test database...');
    
    // Push schema to test database (overwrites existing)
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      env: { 
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || '',
      },
      stdio: 'inherit',
    });
    
    console.log('[Test DB] Schema pushed successfully');
  } catch (error) {
    console.error('[Test DB] Failed to push schema:', error);
    throw error;
  }
}

/**
 * Clean all data from test database
 * Run before each test to ensure isolation
 * 
 * Deletes in correct order to respect foreign key constraints
 */
export async function cleanupTestDatabase() {
  // Order matters: delete children before parents
  const tables = [
    'contactLog',
    'auditLog',
    'job',
    'scheduledJob',
    'session',
    'voter',
    'person',
    'parcel',
    'household',
    'address',
    'precinct',
    'partyOptionGroup',
    'locationOptionGroup',
    'campaign',
    'user',
  ];

  for (const table of tables) {
    try {
      // Access Prisma models by lowercase name
      if ((prisma as any)[table]) {
        await (prisma as any)[table].deleteMany({});
      }
    } catch (error) {
      // Table might not exist in schema yet, or naming mismatch
      // Log but continue cleaning other tables
      if (process.env.DEBUG_TESTS) {
        console.warn(`[Test DB] Could not clean ${table}:`, error);
      }
    }
  }
}

/**
 * Disconnect from test database
 * Run after all tests complete in a suite
 */
export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}

/**
 * Helper to create a test user with hashed password
 * 
 * @param overrides - Optional user properties to override defaults
 * @returns Object with created user and plain-text password
 * 
 * @example
 * const { user, password } = await createTestUser({
 *   email: 'admin@test.com',
 *   password: 'AdminPass123!',
 * });
 */
export async function createTestUser(overrides: Partial<{
  email: string;
  password: string;
  name: string;
  isActive: boolean;
}> = {}) {
  const { hashPassword } = await import('@/lib/auth/password');
  
  const password = overrides.password || 'TestPassword123!';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: overrides.email || `test-${Date.now()}@example.com`,
      name: overrides.name || 'Test User',
      passwordHash,
      isActive: overrides.isActive ?? true,
    },
  });

  return { user, password };
}

/**
 * Create an authenticated session and return token + headers
 * Useful for testing protected API routes
 * 
 * @param userId - ID of user to authenticate
 * @returns Object with token and headers ready for NextRequest
 * 
 * @example
 * const { user } = await createTestUser();
 * const { token, headers } = await createAuthenticatedRequest(user.id);
 * 
 * const request = new NextRequest('http://localhost/api/v1/voters', {
 *   method: 'GET',
 *   headers,
 * });
 */
export async function createAuthenticatedRequest(userId: string) {
  const { generateToken } = await import('@/lib/auth/jwt');
  const { createSession } = await import('@/lib/auth/session');
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  const token = generateToken(userId, user.email);
  await createSession(userId, token);

  return {
    token,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Create a test voter with minimal data
 * 
 * @param overrides - Optional voter/person properties
 * @returns Created voter with person relation
 * 
 * @example
 * const voter = await createTestVoter({
 *   firstName: 'John',
 *   lastName: 'Doe',
 * });
 */
export async function createTestVoter(overrides: Partial<{
  firstName: string;
  lastName: string;
  middleName?: string;
  notes?: string;
}> = {}) {
  const person = await prisma.person.create({
    data: {
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'Voter',
      middleName: overrides.middleName || null,
      notes: overrides.notes || null,
    },
  });

  const voter = await prisma.voter.create({
    data: {
      personId: person.id,
      externalSource: 'test',
      registrationDate: new Date(),
      importedFrom: 'test',
      importType: 'full',
      importFormat: 'test',
    },
    include: {
      person: true,
    },
  });

  return voter;
}

/**
 * Create a test job
 * 
 * @param userId - User who created the job
 * @param type - Job type
 * @param data - Job data (will be JSON stringified)
 * @returns Created job
 */
export async function createTestJob(
  userId: string,
  type: string = 'import_voters',
  data: Record<string, any> = {}
) {
  const job = await prisma.job.create({
    data: {
      type,
      status: 'pending',
      data: JSON.stringify(data),
      createdById: userId,
      totalItems: 0,
      processedItems: 0,
    },
  });

  return job;
}

/**
 * Wait for a condition to be true (polling helper for async tests)
 * 
 * @param condition - Function that returns true when done
 * @param timeout - Max milliseconds to wait
 * @param interval - Check interval in milliseconds
 * 
 * @example
 * await waitFor(async () => {
 *   const job = await prisma.job.findUnique({ where: { id: jobId } });
 *   return job?.status === 'completed';
 * }, 5000, 100);
 */
export async function waitFor(
  condition: () => Promise<boolean> | boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}
