# Development Guide

**Working with Cocoa Canvas locally and making changes to the codebase.**

## Prerequisites

- Set up Cocoa Canvas locally first: [Quick Start](QUICK_START.md)
- Docker development environment running (`npm run docker:dev:up`)

## Project Structure

```
cocoa-canvas/                # Main Next.js application
├── app/                     # Next.js App Router (pages & API routes)
│   ├── api/v1/            # REST API endpoints
│   ├── campaign/           # Campaign pages
│   ├── people/             # Person management pages
│   ├── dashboard/          # Main dashboard
│   └── ...other pages
├── components/             # React components
├── lib/                    # Backend logic, utilities, services
│   ├── prisma.ts          # Database client
│   ├── auth/              # Authentication & JWT
│   ├── queue/             # Job queue (BullMQ)
│   ├── gis/               # GIS/geocoding utilities
│   └── ...other utilities
├── prisma/                # Database schema & migrations
│   ├── schema.prisma      # Prisma schema
│   └── migrations/        # Database migrations
└── package.json
```

## Hot Reload Development

Your source code is mounted into the Docker container:

```bash
# Edit React components
nano app/campaign/page.tsx

# Edit backend logic
nano lib/queue/runner.ts

# Changes appear automatically (no restart needed)
```

Visit http://localhost:3000 to see updates immediately.

## Viewing Logs

```bash
# All containers
npm run docker:dev:logs

# Specific container
docker logs -f cocoa-canvas-app-dev
docker logs -f cocoa-canvas-postgres-dev
docker logs -f cocoa-canvas-redis-dev

# Follow app output only
docker logs -f cocoa-canvas-app-dev | grep -v connection
```

## Database Operations

```bash
# Open Prisma Studio (visual database editor)
npm run db:studio

# Create and run a migration
npm run db:migrate

# Push schema changes without migration
npm run db:push

# Check migration status
npm run db:migrate status

# Generate Prisma client
npm run prisma:generate
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:ci

# Run specific test file
npm test lib/auth/jwt.test.ts

# Run tests in watch mode
npm test -- --watch

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Linting & Code Quality

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## Starting Fresh

Reset everything and start clean:

```bash
# Stop containers and remove all data
npm run docker:dev:down

# Rebuild and start fresh
npm run docker:dev:up

# Database will be reset to schema
npm run db:push
```

## Running Commands in Container

Execute commands inside the running app container:

```bash
# Run a command inside the container
docker exec cocoa-canvas-app-dev npm test

# Access container shell
docker exec -it cocoa-canvas-app-dev bash
```

## Debugging

### Browser DevTools
- Open http://localhost:3000
- Press F12 for DevTools
- Check Console, Network, and Sources tabs

### Server-Side Debugging
Add `console.log()` to your code and check logs:
```bash
npm run docker:dev:logs | grep "your message"
```

### Database Debugging
Query the database directly:
```bash
# Open Prisma Studio
npm run db:studio

# Or access PostgreSQL directly
docker exec -it cocoa-canvas-postgres-dev psql -U postgres -d cocoa_canvas_dev
```

## Environment Variables

Local environment variables are in `.env` or `.env.local`. Common ones:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cocoa_canvas_dev
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## Making a Change Walk-Through

### Example: Add a new API endpoint

1. Create the route file:
   ```bash
   cat > app/api/v1/example/route.ts << 'EOF'
   import { NextRequest, NextResponse } from 'next/server';
   import { validateProtectedRoute } from '@/lib/middleware/auth';

   export async function GET(request: NextRequest) {
     const authResult = await validateProtectedRoute(request);
     if (!authResult.isValid) {
       return authResult.response;
     }
     
     return NextResponse.json({ message: "Hello" });
   }
   EOF
   ```

2. Test it with curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/example
   ```

3. Check logs for any errors
4. Write tests in `app/api/v1/example/route.test.ts`
5. Run tests: `npm test`

## Common Tasks

### Adding a new data model
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` and name the migration
3. Test with Prisma Studio (`npm run db:studio`)

### Creating a new page
1. Create file in `app/{feature}/page.tsx`
2. Add navigation link in `components/Header.tsx`
3. Test at http://localhost:3000/{feature}

### Writing a test
1. Create `path/to/feature.test.ts`
2. Import test utilities and mocks
3. Run `npm test`

See [../developer/STATUS.md](developer/STATUS.md) for architecture details.

## Need Help?

- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[GitHub Issues](https://github.com/Spinnernicholas/cocoa-canvas/issues)** - Search for similar problems
- **[Developer Documentation](developer/)** - Architecture and technical details

