---
title: Testing Guide & Strategy
description: Comprehensive guide for writing effective tests and overhauling the test suite
---

# Testing Guide & Strategy

## Overview

This guide outlines Cocoa Canvas's testing strategy, identifies issues with mock-heavy tests, and provides a roadmap for building a legitimate test suite that catches real bugs.

## Current State Assessment

### Test Distribution (101 tests total)

| Category | Files | Tests | Quality |
|----------|-------|-------|---------|
| ✅ **Legitimate Tests** | 2 | 27 | Real functionality testing |
| ⚠️ **Mock-Heavy Tests** | 7 | 74 | Low value, false security |

### Code Coverage
- **Overall:** 12.49% statement coverage
- **Problem:** Despite 101 passing tests, most critical paths untested
- **Cause:** Over-mocking prevents testing actual implementation

---

## The Mock Problem

### Anti-Pattern Example

```typescript
// ❌ BAD: Tests that mocks work, not that code works
it('should create a session', async () => {
  // 1. Tell mock what to return
  (prisma.session.create as Mock).mockResolvedValue(mockSession);
  
  // 2. Call function
  const session = await createSession(userId, token);
  
  // 3. Assert mock did what we told it to
  expect(session?.userId).toBe(userId); // We just set this!
  expect(prisma.session.create).toHaveBeenCalled(); // So what?
});
```

**What's wrong:**
- Tests mock coordination, not business logic
- Won't catch real bugs (DB constraints, transactions, race conditions)
- Creates false sense of security

### Critical Mocking Issues

Files that mock the very functionality they should test:

1. **`login.test.ts`** - Mocks password verification and JWT generation
2. **`logout.test.ts`** - Mocks session invalidation
3. **`voters.test.ts`** - Labeled "Integration" but mocks everything
4. **`jobs.test.ts`** - Mocks entire job runner
5. **`session.test.ts`** - Mocks Prisma and JWT verification

---

## Testing Philosophy

### When to Mock vs. Use Real Dependencies

| Dependency | Strategy | Reason |
|------------|----------|--------|
| Database (Prisma) | **Use test DB** | Need to test queries, constraints, transactions |
| Redis/BullMQ | **Use test instance** | Need to test queue behavior |
| Password hashing | **Use real bcrypt** | Need to verify security |
| JWT generation | **Use real library** | Need to verify tokens work |
| External APIs | **Mock** | Don't want to hit real services |
| File system | **Use temp directory** | Need to test file operations |
| Time | **Mock** | Need deterministic tests |

### Test Type Decision Matrix

```
Does the code do I/O (database, network, files)?
│
├─ NO → Unit test (fast, no mocks needed)
│   └─ Example: Pure functions, calculations, formatters
│
└─ YES → Integration test (slower, uses real dependencies)
    └─ Example: API routes, database operations, file processing
```

---

## Phase 1: Infrastructure Setup

### 1. Test Database Configuration

Create separate test database that gets reset between test runs.

**Update `cocoa-canvas/vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '.next/',
        'coverage/',
      ],
    },
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/cocoa_canvas_test',
      REDIS_URL: 'redis://localhost:6380',
      NODE_ENV: 'test',
      NEXTAUTH_SECRET: 'test-secret-key-for-testing-only-do-not-use-in-production',
      NEXTAUTH_URL: 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 2. Docker Test Services

**Add to `docker-compose.dev.yml`:**

```yaml
services:
  # ... existing services ...

  postgres-test:
    profiles: ["test"]  # Only starts with --profile test
    image: postgres:16
    container_name: cocoa-canvas-postgres-test
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cocoa_canvas_test
    ports:
      - "5433:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
    networks:
      - cocoa-network

  redis-test:
    profiles: ["test"]  # Only starts with --profile test
    image: redis:7-alpine
    container_name: cocoa-canvas-redis-test
    ports:
      - "6380:6379"
    networks:
      - cocoa-network

volumes:
  postgres_test_data:
```

**Update package.json scripts:**

```json
{
  "scripts": {
    "docker:dev:up": "docker-compose -f docker-compose.dev.yml --profile dev up -d",
    "docker:test:up": "docker-compose -f docker-compose.dev.yml --profile test up -d",
    "docker:all:up": "docker-compose -f docker-compose.dev.yml --profile dev --profile test up -d"
  }
}
```

### 3. Test Database Setup Helper

**Create `lib/testing/db-setup.ts`:**

```typescript
import { execSync } from 'child_process';
import { prisma } from '@/lib/prisma';

/**
 * Initialize test database with current schema
 * Run once before all tests
 */
export async function setupTestDatabase() {
  try {
    // Push schema to test database
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
 */
export async function cleanupTestDatabase() {
  // Delete in correct order (respecting foreign keys)
  const tables = [
    'ContactLog',
    'AuditLog',
    'Job',
    'ScheduledJob',
    'Session',
    'Voter',
    'Person',
    'Parcel',
    'Household',
    'Address',
    'Precinct',
    'PartyOptionGroup',
    'LocationOptionGroup',
    'Campaign',
    'User',
  ];

  for (const table of tables) {
    try {
      await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({});
    } catch (error) {
      // Table might not exist or name mismatch, continue
      console.warn(`[Test DB] Could not clean ${table}:`, error);
    }
  }
}

/**
 * Disconnect from test database
 * Run after all tests complete
 */
export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}

/**
 * Helper to create a test user
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
      email: overrides.email || 'test@example.com',
      name: overrides.name || 'Test User',
      passwordHash,
      isActive: overrides.isActive ?? true,
    },
  });

  return { user, password };
}

/**
 * Helper to create authenticated test request
 */
export async function createAuthenticatedRequest(userId: string) {
  const { generateToken } = await import('@/lib/auth/jwt');
  const { createSession } = await import('@/lib/auth/session');
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

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
```

### 4. Update package.json Scripts

**Add to `cocoa-canvas/package.json`:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:unit": "vitest --include \"lib/**/*.test.{ts,tsx}\" --include \"components/**/*.test.{ts,tsx}\"",
    "test:integration": "vitest --include \"app/api/**/*.integration.test.ts\"",
    "test:db:setup": "npx prisma db push --skip-generate --accept-data-loss",
    "test:watch": "vitest --watch"
  }
}
```

---

## Phase 2: Writing Integration Tests

### Integration Test Template

**Create `app/api/v1/auth/login.integration.test.ts`:**

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/auth/login/route';
import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  disconnectTestDatabase,
  createTestUser 
} from '@/lib/testing/db-setup';
import { prisma } from '@/lib/prisma';

describe('POST /api/v1/auth/login (Integration)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('should login user with correct credentials', async () => {
    // ARRANGE: Create real user in test database
    const { user, password } = await createTestUser({
      email: 'test@example.com',
      password: 'TestPassword123!',
    });

    // ACT: Make real API request
    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!',
      }),
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Test Browser',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    // ASSERT: Response correct
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');

    // VERIFY: Session created in database
    const session = await prisma.session.findUnique({
      where: { token: data.token },
    });
    expect(session).toBeDefined();
    expect(session?.userId).toBe(user.id);

    // VERIFY: Audit log created
    const auditLog = await prisma.auditLog.findFirst({
      where: { 
        userId: user.id, 
        action: 'login' 
      },
    });
    expect(auditLog).toBeDefined();

    // VERIFY: User last login updated
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser?.lastLogin).toBeTruthy();
    expect(updatedUser?.loginAttempts).toBe(0);
  });

  it('should reject incorrect password', async () => {
    await createTestUser({
      email: 'test@example.com',
      password: 'CorrectPassword123!',
    });

    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    // ASSERT: Rejected
    expect(response.status).toBe(401);
    expect(data.success).toBe(false);

    // VERIFY: No session created
    const sessionCount = await prisma.session.count();
    expect(sessionCount).toBe(0);
  });

  it('should increment login attempts on failed password', async () => {
    const { user } = await createTestUser({
      email: 'test@example.com',
      password: 'CorrectPassword123!',
    });

    // First failed attempt
    await POST(new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    // VERIFY: Login attempts incremented
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser?.loginAttempts).toBe(1);

    // Second failed attempt
    await POST(new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'WrongPassword456!',
      }),
      headers: { 'content-type': 'application/json' },
    }));

    // VERIFY: Attempts incremented again
    const user2 = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(user2?.loginAttempts).toBe(2);
  });

  it('should reject disabled account', async () => {
    await createTestUser({
      email: 'test@example.com',
      password: 'TestPassword123!',
      isActive: false,
    });

    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('disabled');
  });

  it('should reject missing email', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'TestPassword123!' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should reject invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: 'not valid json {]',
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });
});
```

### Key Differences from Mock-Heavy Tests

| Mock-Heavy | Integration |
|------------|-------------|
| `vi.mock('@/lib/prisma')` | Real Prisma with test DB |
| `vi.mock('@/lib/auth/password')` | Real bcrypt hashing |
| `(prisma.user.findUnique as Mock).mockResolvedValue(...)` | `await createTestUser(...)` |
| `expect(prisma.user.create).toHaveBeenCalled()` | `const user = await prisma.user.findUnique(...)` |
| Tests mock coordination | Tests real behavior |

---

## Phase 3: Unit Tests for Pure Logic

Keep unit tests for functions without I/O (no mocking needed).

**Example: Math/formatting/validation functions**

```typescript
// lib/utils/formatting.test.ts
import { formatPhoneNumber, parseVoterName, calculateAge } from './formatting';

describe('Utility Functions (Unit)', () => {
  describe('formatPhoneNumber', () => {
    it('should format 10-digit number', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    });

    it('should handle numbers with dashes', () => {
      expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
    });

    it('should return empty string for invalid input', () => {
      expect(formatPhoneNumber('invalid')).toBe('');
    });
  });

  describe('calculateAge', () => {
    it('should calculate age from birthdate', () => {
      const birthdate = new Date('1990-01-01');
      const age = calculateAge(birthdate, new Date('2026-01-01'));
      expect(age).toBe(36);
    });
  });
});
```

**No mocks needed** because these are pure functions.

---

## Phase 4: Conversion Priority

Convert existing tests in this order (highest value first):

### Week 1: Auth System
1. ✅ `auth/login.test.ts` → `auth/login.integration.test.ts`
2. ✅ `auth/logout.test.ts` → `auth/logout.integration.test.ts`
3. ✅ `auth/setup.test.ts` → `auth/setup.integration.test.ts`

### Week 2: Core Features
4. ✅ `voters.test.ts` → `voters.integration.test.ts`
5. ✅ `jobs.test.ts` → `jobs.integration.test.ts`

### Week 3: Supporting Systems
6. ⚠️ `session.test.ts` - Keep only pure logic tests, delete mock tests
7. ⚠️ `queue/runner.test.ts` - Keep getJobProgress tests, convert rest to integration

### Week 4: Keep As-Is
8. ✅ `password.test.ts` - Already legitimate (uses real bcrypt)
9. ✅ `jwt.test.ts` - Already legitimate (uses real JWT library)

---

## Running Tests

### Development Workflow

```bash
# 1. Start dev services (PostgreSQL, Redis, Next.js app)
npm run docker:dev:up

# 2. Start test services (test PostgreSQL on port 5433, test Redis on port 6380)
npm run docker:test:up

# 3. Start all services (dev + test)
npm run docker:all:up

# 4. Initialize test database (first time only)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cocoa_canvas_test \
  npm run test:db:setup

# 5. Run all tests
npm test

# 6. Run only integration tests
npm run test:integration

# 7. Run tests in watch mode
npm run test:watch

# 8. Generate coverage report
npm run test:ci

# 9. Stop services
npm run docker:dev:down    # Stop dev services
npm run docker:test:down   # Stop test services
npm run docker:all:down    # Stop all services
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cocoa_canvas_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Setup test database
        run: npm run test:db:setup
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cocoa_canvas_test
      
      - name: Run tests with coverage
        run: npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cocoa_canvas_test
          REDIS_URL: redis://localhost:6379
          NEXTAUTH_SECRET: test-secret-ci
          NEXTAUTH_URL: http://localhost:3000
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

## Best Practices

### ✅ DO

- **Use real dependencies** for I/O (database, Redis, file system)
- **Test actual behavior**, not implementation details
- **Verify side effects** (records created, files written)
- **Clean between tests** to ensure isolation
- **Use descriptive test names** that explain the scenario
- **Test error cases** (network failures, constraint violations)
- **Check database state** after operations

### ❌ DON'T

- Mock core functionality (Prisma, password hashing, JWT)
- Test only that mocks were called
- Label tests "integration" while mocking everything
- Share state between tests
- Use `toHaveBeenCalled()` as primary assertion
- Skip cleanup between tests
- Mock time unless necessary

---

## Test Naming Conventions

```typescript
// Good: Describes behavior
it('should reject login with incorrect password', async () => { ... });

// Bad: Describes implementation
it('should call verifyPassword with correct arguments', async () => { ... });

// Good: Specific scenario
it('should increment login attempts after 3rd failed password', async () => { ... });

// Bad: Vague
it('should handle failures', async () => { ... });

// Good: Integration test naming
describe('POST /api/v1/voters (Integration)', () => { ... });

// Good: Unit test naming
describe('formatPhoneNumber (Unit)', () => { ... });
```

---

## Measuring Success

### Before Overhaul
- ❌ 12.49% statement coverage
- ❌ 101 tests passing but low confidence
- ❌ Most tests won't catch real bugs
- ❌ Heavy mocking creates false security

### After Overhaul
Target metrics:
- ✅ 60%+ statement coverage (meaningful coverage)
- ✅ Integration tests use real dependencies
- ✅ Tests catch database constraint violations
- ✅ Tests verify full request/response cycle
- ✅ Clear separation: unit tests (fast) vs integration tests (thorough)

---

## FAQ

### Q: Won't integration tests be slower?
**A:** Yes, but it's worth it. Real tests that catch real bugs > fast tests that don't.
- Unit tests: <10ms each (pure functions)
- Integration tests: 50-200ms each (database operations)
- Total suite: 3-10 seconds (acceptable for CI)

### Q: Should I delete all the mock-heavy tests?
**A:** Transition gradually:
1. Write new integration test alongside old test
2. Once new test passes, delete old mock test
3. Don't delete legitimate unit tests (password, JWT, pure functions)

### Q: What about testing external APIs?
**A:** Mock those - we don't want to hit real services. But mock at the boundary:
```typescript
// Good: Mock HTTP client
vi.mock('axios', () => ({ get: vi.fn() }));

// Bad: Mock your own abstraction
vi.mock('@/lib/external-api'); // Test the abstraction!
```

### Q: How do I test job queue workers?
**A:** Use real Redis for true integration:
```typescript
// Start worker, add job, wait for completion
const worker = new Worker('import-queue', processor);
await queue.add('import', { jobId: 'test-job' });
await new Promise(r => setTimeout(r, 2000)); // Wait for processing
expect(await getJob('test-job').status).toBe('completed');
```

---

## Resources

- [Testing Best Practices (Martin Fowler)](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Vitest Documentation](https://vitest.dev)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Integration Test Patterns](https://testingjavascript.com)

---

## Next Steps

1. Set up test database (Phase 1)
2. Pick one file to convert (recommend starting with `login.test.ts`)
3. Write integration test using real dependencies
4. Run it and observe the difference
5. Gradually convert remaining tests
6. Update this guide with lessons learned

---

*Last updated: February 18, 2026*
