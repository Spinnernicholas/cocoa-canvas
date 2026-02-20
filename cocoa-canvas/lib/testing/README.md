# Testing Utilities

This directory contains helpers for writing integration tests with real database dependencies.

## Files

- **`db-setup.ts`** - Test database lifecycle management and helper functions

## Quick Start

### 1. Start Test Services

```bash
# Start only test services (PostgreSQL on port 5433, Redis on port 6380)
npm run docker:test:up

# Or start all services (dev + test)
npm run docker:all:up
```

### 2. Initialize Test Database (First Time)

```bash
cd cocoa-canvas
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cocoa_canvas_test npm run test:db:setup
```

### 3. Write Integration Test

```typescript
import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  disconnectTestDatabase,
  createTestUser,
  createAuthenticatedRequest,
} from '@/lib/testing/db-setup';

describe('My API Route (Integration)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('should do something', async () => {
    // Create test user
    const { user, password } = await createTestUser({
      email: 'test@example.com',
    });

    // Test your API...
  });
});
```

### 4. Run Tests

```bash
npm test                    # Run all tests
npm run test:integration    # Run only integration tests
npm run test:watch          # Watch mode
```

## API Reference

### Database Lifecycle

#### `setupTestDatabase()`
Pushes Prisma schema to test database. Run once before all tests.

```typescript
beforeAll(async () => {
  await setupTestDatabase();
});
```

#### `cleanupTestDatabase()`
Deletes all data from test database. Run before each test for isolation.

```typescript
beforeEach(async () => {
  await cleanupTestDatabase();
});
```

#### `disconnectTestDatabase()`
Disconnects from test database. Run once after all tests.

```typescript
afterAll(async () => {
  await disconnectTestDatabase();
});
```

### Test Data Creation

#### `createTestUser(overrides?)`
Creates a user with hashed password.

```typescript
const { user, password } = await createTestUser({
  email: 'admin@test.com',
  password: 'AdminPass123!',
  name: 'Admin User',
  isActive: true,
});

// user: Prisma User object
// password: Plain text password for testing login
```

#### `createAuthenticatedRequest(userId)`
Creates a valid session and returns token + headers.

```typescript
const { user } = await createTestUser();
const { token, headers } = await createAuthenticatedRequest(user.id);

const request = new NextRequest('http://localhost/api/v1/voters', {
  method: 'GET',
  headers, // Contains: Authorization: Bearer <token>
});
```

#### `createTestVoter(overrides?)`
Creates a voter with associated person record.

```typescript
const voter = await createTestVoter({
  firstName: 'John',
  lastName: 'Doe',
  notes: 'Test voter',
});

// Returns voter with person relation included
```

#### `createTestJob(userId, type?, data?)`
Creates a job record.

```typescript
const job = await createTestJob(user.id, 'import_voters', {
  filePath: '/tmp/voters.csv',
});
```

### Utilities

#### `waitFor(condition, timeout?, interval?)`
Polls until condition is true. Useful for async operations.

```typescript
// Wait for job to complete (max 5 seconds)
await waitFor(async () => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  return job?.status === 'completed';
}, 5000, 100);
```

## Testing Patterns

### Pattern 1: API Route Test

```typescript
import { POST } from './route';
import { createTestUser } from '@/lib/testing/db-setup';

it('should create resource', async () => {
  const { user } = await createTestUser();
  const { headers } = await createAuthenticatedRequest(user.id);

  const request = new NextRequest('http://localhost/api/v1/resource', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Test' }),
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(201);
  expect(data.name).toBe('Test');

  // Verify database state
  const resource = await prisma.resource.findFirst({
    where: { name: 'Test' },
  });
  expect(resource).toBeDefined();
});
```

### Pattern 2: Testing Database Side Effects

```typescript
it('should create audit log on delete', async () => {
  const { user } = await createTestUser();
  const voter = await createTestVoter();

  // Perform delete
  await DELETE(request);

  // Verify audit log created
  const auditLog = await prisma.auditLog.findFirst({
    where: {
      userId: user.id,
      action: 'delete',
      resource: 'voter',
    },
  });

  expect(auditLog).toBeDefined();
});
```

### Pattern 3: Testing Authentication

```typescript
it('should reject unauthenticated requests', async () => {
  const request = new NextRequest('http://localhost/api/v1/protected', {
    method: 'GET',
    // No Authorization header
  });

  const response = await GET(request);

  expect(response.status).toBe(401);
});

it('should accept authenticated requests', async () => {
  const { user } = await createTestUser();
  const { headers } = await createAuthenticatedRequest(user.id);

  const request = new NextRequest('http://localhost/api/v1/protected', {
    method: 'GET',
    headers,
  });

  const response = await GET(request);

  expect(response.status).toBe(200);
});
```

### Pattern 4: Testing Async Jobs

```typescript
it('should process job successfully', async () => {
  const { user } = await createTestUser();
  const job = await createTestJob(user.id, 'import_voters');

  // Add to queue
  const queue = getVoterImportQueue();
  await queue.add('process', { jobId: job.id });

  // Wait for completion
  await waitFor(async () => {
    const updated = await prisma.job.findUnique({
      where: { id: job.id },
    });
    return updated?.status === 'completed';
  }, 10000);

  // Verify result
  const completedJob = await prisma.job.findUnique({
    where: { id: job.id },
  });
  expect(completedJob?.status).toBe('completed');
});
```

## Troubleshooting

### Tests fail with "DATABASE_URL not set"

Ensure test database is configured in `vitest.config.ts`:

```typescript
env: {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/cocoa_canvas_test',
}
```

### Tests fail with "Cannot connect to database"

Start test services:

```bash
npm run docker:dev:up
```

### Tests leak data between runs

Ensure `cleanupTestDatabase()` is called in `beforeEach`:

```typescript
beforeEach(async () => {
  await cleanupTestDatabase();
});
```

### Slow test performance

Integration tests are inherently slower than unit tests (50-200ms vs <10ms). This is expected and acceptable for the value they provide.

To speed up:
- Run fewer tests in watch mode
- Use parallel test execution: `vitest --threads`
- Keep test database on local disk (not network)

## Best Practices

### ✅ DO

- Use `beforeEach` to clean data between tests
- Test actual database state changes
- Use real Prisma (no mocking)
- Use real password hashing
- Use real JWT generation
- Verify side effects (audit logs, sessions, etc.)

### ❌ DON'T

- Mock Prisma in integration tests
- Mock core security functions (password, JWT)
- Share state between tests
- Use production database for tests
- Skip `cleanupTestDatabase()`

## See Also

- [Testing Guide](../../../../docs-site/src/content/docs/developer/testing-guide.md) - Full testing strategy
- [Vitest Documentation](https://vitest.dev)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
