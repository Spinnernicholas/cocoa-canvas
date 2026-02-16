# Docker Setup Guide

This guide explains how to run Cocoa Canvas using Docker in **development** or **production** mode.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v1.29+)

## Quick Start

### Development Mode (Recommended for local development)

**With helper script:**

```bash
# Linux/macOS
./run.sh dev

# Windows PowerShell
./run.ps1 dev
```

**Or manually:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Features:
- Hot reload (changes reflect instantly)
- Source maps for debugging
- Development logging
- SQLite database

Visit: `http://localhost:3000`

### Production Mode

**With helper script:**

```bash
# Linux/macOS
./run.sh prod

# Windows PowerShell
./run.ps1 prod
```

**Or manually:**

```bash
docker-compose up
```

Features:
- Optimized production build
- Minimal dependencies
- PostgreSQL support
- Compressed assets

Visit: `http://localhost:3000`

## Environment Setup

Choose your environment file based on mode:

### Development
```bash
cp .env.development .env
```

Environment variables:
- `NODE_ENV=development`
- `DATABASE_URL=file:./data/cocoa_canvas.db` (SQLite)
- `NEXTAUTH_SECRET=dev-secret-only-for-development-not-secure`

### Production
```bash
cp .env.production .env
```

**Important**: Before running in production, update `.env`:
- `NEXTAUTH_URL=https://your-domain.com`
- `NEXTAUTH_SECRET=<generate-with: `openssl rand -base64 32`>`
- `DATABASE_URL=postgresql://user:pass@postgres:5432/cocoa_canvas`

## First Time Setup

1. **Start the app** (dev or prod mode above)
2. **Create Admin Account**: Visit `http://localhost:3000` and complete the setup wizard
3. **Create Campaign**: Set up your first campaign with dates and target area

## Stopping

```bash
docker-compose down
```

To also remove data:

```bash
docker-compose down -v
```

## Using PostgreSQL

By default, Phase 1 uses SQLite for local development. To switch to PostgreSQL:

### Option 1: Use Docker Compose Profile

```bash
docker-compose --profile postgres up
```

Then update `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/cocoa_canvas
```

### Option 2: Manual PostgreSQL Connection

Install PostgreSQL locally and set:

```
DATABASE_URL=postgresql://user:password@localhost:5432/cocoa_canvas
```

## Database Management

### View Database (SQLite)

```bash
sqlite3 data/cocoa_canvas.db
```

### Prisma Studio (Interactive GUI)

```bash
docker-compose exec web npx prisma studio
```

Access at `http://localhost:5555`

### Migrations

Create a new migration:

```bash
docker-compose exec web npx prisma migrate dev --name migration_name
```

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-15T12:00:00Z",
  "version": "0.1.0"
}
```

## Debugging

### View Logs

```bash
docker-compose logs -f web
```

### Execute Commands in Container

```bash
docker-compose exec web npm run build
docker-compose exec web npx prisma db seed
```

## BuildConfiguration

The Dockerfile uses a **multi-stage build**:

1. **Builder Stage**: Installs dependencies, generates Prisma client, builds Next.js
2. **Runtime Stage**: Only includes production dependencies, reduces image size

### Image Size

- Builder image: ~1.2 GB (intermediate, discarded)
- Final runtime image: ~500 MB

## Data Persistence

### SQLite

Data stored in `./data/cocoa_canvas.db` (mounted volume):

```yaml
volumes:
  - ./data:/app/data
```

Backups:

```bash
cp data/cocoa_canvas.db data/cocoa_canvas.db.backup
```

### PostgreSQL

Data stored in `postgres_data` volume:

```bash
docker volume ls
docker volume inspect cocoa-canvas_postgres_data
```

## Production Deployment

For production:

1. Use PostgreSQL instead of SQLite
2. Set `NODE_ENV=production` in `.env`
3. Generate strong `NEXTAUTH_SECRET`
4. Use environment-specific `.env` files:
   - `.env.production`
   - `.env.staging`
5. Deploy using Docker Swarm, Kubernetes, or managed services

## Troubleshooting

### Port 3000 Already in Use

Change the exposed port in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Maps host 3001 to container 3000
```

### Database Connection Error

Check if PostgreSQL is healthy:

```bash
docker-compose ps
docker-compose logs postgres
```

### Can't Access http://localhost:3000

- Verify container is running: `docker-compose ps`
- Check logs: `docker-compose logs web`
- Ensure port 3000 is not blocked by firewall

## Next Steps

After Docker setup is working:

1. Implement authentication endpoints (`POST /api/v1/auth/login`, etc.)
2. Build setup wizard UI
3. Create dashboard
4. See `planning/PHASE_PLAN.md` for detailed Phase 1 implementation

## References

- [Next.js in Docker](https://nextjs.org/docs/deployment/docker)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
