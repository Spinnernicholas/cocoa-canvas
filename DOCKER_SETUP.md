# Docker Setup Guide

This guide explains how to run Cocoa Canvas using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v1.29+)

## Quick Start

### 1. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set `NEXTAUTH_SECRET`:

```bash
# Generate a secure secret
openssl rand -base64 32
```

Add the output to `.env`:

```
NEXTAUTH_SECRET=your-generated-secret-here
```

### 2. Run with Docker Compose

```bash
docker-compose up
```

On first run:
1. Docker builds the image
2. Prisma generates the client
3. Database migrations run automatically
4. App starts on `http://localhost:3000`

### 3. Create Admin Account

Visit `http://localhost:3000` and complete the setup wizard:
- Create admin email and password
- Set up initial campaign
- Done!

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
