# Cocoa Canvas - AI Coding Agent Instructions

## Project Overview

Cocoa Canvas is an open-source voter database and canvassing platform built with Next.js 16. **Critical architectural decision**: Single-campaign-per-deployment model - each instance manages ONE political race. Multiple campaigns require separate deployments with isolated databases.

## Stack & Structure

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: Prisma ORM with PostgreSQL (dev and production)
- **Job Queue**: BullMQ with Redis for background processing + Prisma Job table for tracking
- **Testing**: Vitest with 101 tests, `jsdom` for components, `node` environment for API routes
- **Auth**: JWT tokens + database session validation (no NextAuth in production)
- **Maps**: Leaflet with OpenStreetMap
- **Deployment**: Docker Compose with auto-setup support

**Monorepo structure**:
- `cocoa-canvas/` - Main Next.js application (work here)
- `docs-site/` - **Public documentation** (Astro Starlight site, deployed to GitHub Pages)
- `docker/` - Docker & Docker Compose configuration for deployment
- `scripts/` - Build and utility scripts

**Documentation strategy**:
- **Public docs** (user & developer guides): `docs-site/src/content/docs/`
- **GitHub-specific docs** (API specs, architecture details): README.md files in respective folders

**Path alias**: `@/` maps to `cocoa-canvas/` root (e.g., `@/lib/prisma`, `@/components/Map`)

## Critical Architecture Patterns

### 1. Single Campaign Model

All voters belong to THE campaign (no `campaignId` fields). See the developer docs for architecture details.

```typescript
// ✅ Correct: All voters are implicitly part of THE campaign
const voters = await prisma.voter.findMany({ where: { city: "Oakland" } });

// ❌ Wrong: No campaign filtering needed
const voters = await prisma.voter.findMany({ where: { campaignId: "..." } });
```

### 2. Importer Registry Pattern

Voter file formats supported via pluggable Strategy + Registry pattern. Currently registered: `simple_csv`, `contra_costa`. See [lib/importers/](cocoa-canvas/lib/importers/).

**Add new importer**:
1. Create `lib/importers/{format-name}.ts` implementing `VoterImporter` interface with:
   - `formatId`: unique identifier (e.g., `"alameda"`)
   - `formatName`: human-readable name
   - `formatDescription`: UI description
   - `validate()`: verify file structure
   - `parse()`: convert file to `VoterRecord[]`
2. Register in `lib/importers/index.ts`: `importerRegistry.register(yourImporter)`
3. Use unified endpoint: `POST /api/v1/voters/import` with `format` parameter

Examples: [lib/importers/contra-costa.ts](cocoa-canvas/lib/importers/contra-costa.ts), [lib/importers/simple-csv.ts](cocoa-canvas/lib/importers/simple-csv.ts)

### 3. Dual Job System

Jobs use **two systems**:
- **Prisma Job table**: User-facing status tracking, progress, error logs
- **BullMQ + Redis**: Background processing, retries, scheduling

**Job lifecycle**:
1. Create: `createJob(type, userId, data)` → Prisma record with `status: "pending"`
2. Queue: Add to BullMQ queue (e.g., `getVoterImportQueue().add(...)`)
3. Process: Worker calls `startJob()`, `updateJobProgress()`, then `completeJob()` or `failJob()`

See: [lib/queue/runner.ts](cocoa-canvas/lib/queue/runner.ts), [lib/queue/bullmq.ts](cocoa-canvas/lib/queue/bullmq.ts)

### 4. Authentication Pattern

**All protected routes must use `validateProtectedRoute()`**:

```typescript
import { validateProtectedRoute } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response; // Returns 401 with error
  }
  
  const user = authResult.user; // { userId, email, name }
  // Your protected logic here
}
```

Auth flow: JWT token (Bearer header) → Verify signature → Check session exists in DB → Return user payload

See: [lib/middleware/auth.ts](cocoa-canvas/lib/middleware/auth.ts), [lib/auth/jwt.ts](cocoa-canvas/lib/auth/jwt.ts)

## Key Development Workflows

### Local Development
```bash
cd cocoa-canvas
npm run docker:dev:up  # Start PostgreSQL, Redis, and Next.js app
# App runs in Docker with hot reload on port 3000
# Source code is mounted, so changes on host are reflected instantly

# View logs
npm run docker:dev:logs
```

### Database Operations
```bash
npm run db:migrate   # Create migration and apply
npm run db:push      # Push schema without migration (dev only)
npm run db:studio    # Open Prisma Studio GUI
```

### Docker Workflows
```bash
npm run docker:dev:up       # Start dev environment (Postgres + Redis + App)
npm run docker:dev:down     # Stop and remove containers
npm run docker:dev:logs     # View live logs
npm run docker:dev:restart  # Restart services

npm run docker:prod:up      # Production deployment
npm run docker:prod:logs    # View production logs
```

**Auto-setup**: Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` env vars to auto-create admin user on first boot.

### Testing Conventions

- **Unit tests**: Test individual functions with mocked Prisma
- **Integration tests**: Test API routes end-to-end (use test DB)
- **Mock Prisma** in unit tests:

```typescript
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    job: { update: vi.fn() }
  },
}));

// In test
(prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
```

See: [lib/queue/runner.test.ts](cocoa-canvas/lib/queue/runner.test.ts), [app/api/v1/jobs.test.ts](cocoa-canvas/app/api/v1/jobs.test.ts)

## API Route Patterns

**Structure**: `app/api/v1/{resource}/route.ts` or `app/api/v1/{resource}/[id]/route.ts`

**Standard response format**:
```typescript
// Success
return NextResponse.json({ success: true, data: result });

// Error
return NextResponse.json({ error: "Message" }, { status: 400 });
```

**Route requirements**:
- Add `export const dynamic = 'force-dynamic';` for routes that query the database or depend on request data (prevents static generation)
- Always add `import { validateProtectedRoute } from '@/lib/middleware/auth';` for protected routes
- Parse query params via `request.url` (NextRequest), build filters, use Prisma directly

**Query patterns**:
- Use Prisma directly (no repository pattern): `import { prisma } from '@/lib/prisma'`
- Parse errors consistently: Catch Prisma errors and return clean messages
- Implement pagination: `limit` (capped at 100), `offset` patterns in query string

## Project Conventions

1. **No campaign references**: Voters, contacts, precincts have no `campaignId` (single campaign model)
2. **JSON serialization in Job fields**: Job.data, Job.errorLog are TEXT fields storing JSON. Use `JSON.stringify()` / `JSON.parse()`:
   ```typescript
   // Storing job data
   await createJob('import_voters', userId, { filePath, format: 'csv' });
   // Retrieve and parse
   const job = await getJob(jobId);
   const data = JSON.parse(job.data || '{}');
   ```
3. **Error logs as structured array**: Store as `[{row: 1, error: "..."}]`:
   ```typescript
   const errors = JSON.parse(job.errorLog || '[]');
   errors.push({ row: lineNum, error: message });
   await updateJobProgress(jobId, { errorLog: JSON.stringify(errors) });
   ```
4. **File uploads**: Store in `tmp/uploads/`, clean up after successful processing. Use `fs.unlinkSync()` to remove.
5. **Audit logging**: All security-relevant actions logged via `auditLog(userId, action, resource, resourceId, details)` (see [lib/audit/logger.ts](cocoa-canvas/lib/audit/logger.ts))
6. **Client-side auth**: Store JWT in `localStorage.getItem('authToken')`, send as `Authorization: Bearer {token}` header

## Environment Variables

Required for development and production:
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://postgres:postgres@localhost:5432/cocoa_canvas_dev`)
- `REDIS_URL` - Redis connection (e.g., `redis://localhost:6379`)
- `NEXTAUTH_SECRET` - JWT signing secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Public URL (e.g., `http://localhost:3000` for dev, `https://app.example.com` for production)

Optional auto-setup:
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` - Creates admin on first boot

See: `docs-site/src/content/docs/admin/environment-variables.md`

## Common Tasks

**Add new API endpoint**:
1. Create `app/api/v1/{resource}/route.ts`
2. Export `GET`, `POST`, etc. as async functions
3. Add auth if needed: `const auth = await validateProtectedRoute(request)`
4. Use Prisma for DB access
5. Write integration test in same directory

**Add new job type**:
1. Add to Job.type enum (conceptually)
2. Create processor function (e.g., `processImportJob()`)
3. Create BullMQ worker in `lib/queue/worker.ts`
4. Use `createJob()` → queue in BullMQ → worker processes → update Prisma Job

**Debug job system**:
```bash
# Check if Redis is running
docker exec cocoa-canvas-redis redis-cli ping

# Check job status in DB
npm run db:studio  # Navigate to Job table

# View worker logs
npm run docker:prod:logs | grep -i worker
```

## Important Files Reference

- Authentication: [lib/auth/jwt.ts](cocoa-canvas/lib/auth/jwt.ts), [lib/auth/session.ts](cocoa-canvas/lib/auth/session.ts), [lib/middleware/auth.ts](cocoa-canvas/lib/middleware/auth.ts)
- Job system: [lib/queue/runner.ts](cocoa-canvas/lib/queue/runner.ts), [lib/queue/bullmq.ts](cocoa-canvas/lib/queue/bullmq.ts), [lib/queue/worker.ts](cocoa-canvas/lib/queue/worker.ts)
- Importers: [lib/importers/registry.ts](cocoa-canvas/lib/importers/registry.ts), [lib/importers/types.ts](cocoa-canvas/lib/importers/types.ts)
- Database: [prisma/schema.prisma](cocoa-canvas/prisma/schema.prisma), [lib/prisma.ts](cocoa-canvas/lib/prisma.ts)
- Public docs: `docs-site/src/content/docs/` (developer, admin, getting-started guides)
- Technical specifications: See README.md files in respective `cocoa-canvas/lib/` subdirectories

---

*For questions about specific features, see the public documentation at `docs-site/src/content/docs/developer/` or check README.md files in the codebase for technical specifications.*
