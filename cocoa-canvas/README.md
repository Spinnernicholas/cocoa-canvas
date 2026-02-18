# Cocoa Canvas - Next.js Application

The main Next.js application for the Cocoa Canvas voter database and canvassing platform.

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose (for local development)
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

### Development Environment

Start the full development stack with Docker:

```bash
npm run docker:dev:up
```

This starts:
- PostgreSQL database
- Redis for job queues
- Next.js app with hot reload

The app will be available at http://localhost:3000

View logs:
```bash
npm run docker:dev:logs
```

### Environment Setup

Create `.env.development` with:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cocoa_canvas_dev
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=dev-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## Project Structure

```
cocoa-canvas/
├── app/                      # Next.js App Router (pages & API routes)
│   ├── api/v1/              # REST API endpoints (28 routes)
│   ├── campaign/            # Campaign dashboard
│   ├── people/              # Voter management
│   ├── dashboard/           # Main dashboard
│   ├── maps/                # Map visualization
│   ├── login/               # Authentication
│   ├── setup/               # Initial setup wizard
│   ├── admin/               # Admin configuration
│   ├── settings/            # Settings pages
│   └── jobs/                # Job queue monitoring
├── components/              # React components
│   ├── Header.tsx
│   ├── LoginForm.tsx
│   ├── Map.tsx
│   ├── PeopleSearch.tsx
│   └── ...
├── lib/                     # Backend logic & utilities
│   ├── auth/                # JWT & session management
│   ├── queue/               # BullMQ job queue
│   ├── gis/                 # GIS utilities (centroid, parcel linking)
│   ├── importers/           # Voter file format importers
│   ├── middleware/          # Auth middleware
│   ├── db/                  # Database utilities
│   └── audit/               # Audit logging
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma        # Data models
│   └── migrations/          # Migration history
├── docker-compose.dev.yml   # Development environment config
├── package.json
├── tsconfig.json
├── next.config.js
├── vitest.config.ts         # Testing configuration
└── README.md                # This file
```

## Common Commands

### Development

```bash
# Start dev environment (Docker)
npm run docker:dev:up

# Stop dev environment (keep data)
npm run docker:dev:down

# Reset environment (delete all data)
npm run docker:dev:down -- -v
npm run docker:dev:up

# View logs
npm run docker:dev:logs

# Restart services
npm run docker:dev:restart
```

### Database

```bash
# Open Prisma Studio (visual database editor)
npm run db:studio

# Create and run a migration
npm run db:migrate

# Push schema changes without migration
npm run db:push

# Check migration status
npm run db:migrate:status

# Generate Prisma client
npm run prisma:generate
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:ci

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run specific test file
npm test lib/auth/jwt.test.ts

# Watch mode
npm test -- --watch
```

### Code Quality

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Using Docker
npm run docker:prod:up
npm run docker:prod:logs
npm run docker:prod:down
```

## API Endpoints

The application provides 28 REST API endpoints organized by resource:

- **Authentication**: `/api/v1/auth/*` - login, logout, refresh token
- **Users**: `/api/v1/users/*` - user management
- **People/Voters**: `/api/v1/people/*` - voter CRUD and search
- **Campaigns**: `/api/v1/campaigns/*` - campaign configuration
- **Imports**: `/api/v1/voters/import` - file uploads
- **GIS/Households**: `/api/v1/households/*` - geographic queries
- **Parcels**: `/api/v1/parcels/*` - parcel data
- **Jobs**: `/api/v1/jobs/*` - job queue status
- **Health**: `/api/health` - application health check

See the public documentation for API specifications.

## Architecture Patterns

### Single Campaign Model

Each deployment manages ONE political race. No `campaignId` field needed on voters - all data belongs to THE campaign.

### Pluggable Importer Registry

Voter file formats use a Strategy + Registry pattern:

```typescript
// lib/importers/my-format.ts
export const myFormatImporter: VoterImporter = {
  formatId: 'my_format',
  formatName: 'My County Format',
  formatDescription: 'Supports the My County voter export',
  validate: (file) => { /* validate structure */ },
  parse: (file) => { /* convert to VoterRecord[] */ }
};

// lib/importers/index.ts
importerRegistry.register(myFormatImporter);
```

Currently registered formats: `simple_csv`, `contra_costa`

### Dual Job System

Jobs use both Prisma and BullMQ:
1. **Prisma Job table** - for user-facing status tracking
2. **BullMQ + Redis** - for background processing and retries

### Authentication

JWT tokens (30-day expiry) + database sessions. All protected routes use:

```typescript
import { validateProtectedRoute } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) return authResult.response;
  
  const user = authResult.user; // { userId, email, name }
  // Your protected logic
}
```

## Key Libraries

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Prisma** - ORM for PostgreSQL
- **BullMQ** - Job queue processor
- **Leaflet** - Interactive maps
- **Vitest** - Testing framework
- **TailwindCSS** - Styling

## Environment Variables

### Required

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - Public URL of application

### Optional

- `ADMIN_EMAIL` - Auto-create admin user on startup
- `ADMIN_PASSWORD` - Admin password
- `ADMIN_NAME` - Admin user full name
- `NODE_ENV` - `development` or `production`

See the public documentation for all environment variables.

## Troubleshooting

### Docker Issues

Check service health:
```bash
docker-compose -f docker-compose.dev.yml ps
```

View specific service logs:
```bash
docker logs cocoa-canvas-app-dev
docker logs cocoa-canvas-postgres-dev
docker logs cocoa-canvas-redis-dev
```

### Database Issues

Open Prisma Studio:
```bash
npm run db:studio
```

Access PostgreSQL directly:
```bash
docker exec -it cocoa-canvas-postgres-dev psql -U postgres -d cocoa_canvas_dev
```

### Port Conflicts

Change ports in `docker-compose.dev.yml`:
```yaml
ports:
  - "3001:3000"  # app
  - "5433:5432"  # postgres
  - "6380:6379"  # redis
```

## Documentation

- **Public Documentation**: See the [docs-site](../docs-site/) for comprehensive guides
- **Architecture Details**: Check `lib/` folder READMEs for technical specifications
- **API Specifications**: See the public API documentation

## Development Workflows

### Adding a New API Endpoint

1. Create `app/api/v1/{resource}/route.ts`
2. Import `validateProtectedRoute` for authentication
3. Implement GET/POST/PUT/DELETE handlers
4. Write integration tests in same directory
5. Add Prisma models if needed

### Adding Database Model

1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` and name the migration
3. Test with `npm run db:studio`
4. Write migrations for the team

### Creating a New Voter Importer

1. Create `lib/importers/{format}.ts` with `VoterImporter` interface
2. Register in `lib/importers/index.ts`
3. Use unified endpoint: `POST /api/v1/voters/import` with `format` param

See [architecture documentation](https://spinnernicholas.github.io/cocoa-canvas/developer/single-campaign-architecture/) for details.

## Testing

```bash
# Unit tests with coverage
npm run test:ci

# Watch mode for development
npm test -- --watch

# Specific test file
npm test lib/auth/jwt.test.ts

# Integration tests (API routes)
npm run test:integration
```

Test patterns:
- Mock Prisma in unit tests
- Use test database for integration tests
- Test API routes with actual HTTP requests

## Performance

- **Static generation**: Pages without real-time data are pre-rendered
- **Dynamic routes**: Use `export const dynamic = 'force-dynamic'` for database routes
- **Image optimization**: Next.js Image component for responsive images
- **API caching**: Redis for frequently accessed data

## Security

- **JWT tokens** - Signed with NEXTAUTH_SECRET
- **Session validation** - All sessions checked in database
- **Audit logging** - All sensitive operations logged
- **SQL injection protection** - Prisma parameterized queries
- **CSRF protection** - Built-in Next.js middleware

## Deployment

### Development
```bash
npm run docker:dev:up
```

### Production
```bash
# Build the image
npm run docker:prod:build

# Start services
npm run docker:prod:up
```

For production deployments, see the [Docker README](../docker/README.md).

## Contributing

1. Create a feature branch
2. Make changes following project conventions
3. Write tests for new features
4. Ensure all tests pass: `npm test`
5. Commit with clear messages
6. Push and create a pull request

## License

AGPL-3.0 - See LICENSE file in root directory

## Support

For issues, questions, or feature requests:
- Check the [public documentation](../docs-site/)
- Search existing [GitHub issues](https://github.com/Spinnernicholas/cocoa-canvas/issues)
- Create a new issue with details

## Architecture Reference

This is a **single-campaign-per-deployment** system. Each instance manages ONE political race. For multiple campaigns, use separate deployments with isolated databases.

Key architectural decisions:
- Single campaign model (no campaignId filtering)
- Voter file format registry pattern
- Dual job system (Prisma + BullMQ)
- JWT + session-based authentication
- GIS for household geocoding and parcel mapping
