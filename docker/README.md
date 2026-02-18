# Docker Configuration

This folder contains Docker configuration for production deployment. Development configuration is in the [cocoa-canvas](../cocoa-canvas/) folder.

## Files

- **Dockerfile** - Multi-stage build for production image
- **docker-compose.yml** - Production deployment configuration
- **.dockerignore** - Files to exclude from Docker build context

**Development file** (in cocoa-canvas folder):
- **docker-compose.dev.yml** - Development environment with hot reload

## Development Environment

The development Docker Compose configuration is in [cocoa-canvas/docker-compose.dev.yml](../cocoa-canvas/docker-compose.dev.yml)

### Start Development

```bash
cd cocoa-canvas
npm run docker:dev:up
```

This starts three services:
- **Next.js app** (port 3000) - with source code mounted for hot reload
- **PostgreSQL** (port 5432) - development database
- **Redis** (port 6379) - job queue and caching

The app is ready when you see: `ready - started server on 0.0.0.0:3000`

Visit http://localhost:3000

### View Logs

```bash
npm run docker:dev:logs
```

### Stop (Keep Data)

```bash
npm run docker:dev:down
```

### Reset Environment (Delete All Data)

```bash
npm run docker:dev:down -- -v
npm run docker:dev:up
```

### Restart Services

```bash
npm run docker:dev:restart
```

## Production Deployment

### Prerequisites

Create `.env` or `.env.production` in the project root with:

```env
DATABASE_URL=postgresql://user:password@postgres-host:5432/cocoa_canvas
REDIS_URL=redis://redis-host:6379
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com
```

### Start Production

```bash
npm run docker:prod:up
```

This builds and starts the application with:
- **Next.js app** (port 3000) - optimized production build
- **Redis** (port 6379) - optional, can use external Redis
- **PostgreSQL** (optional) - can use external database

### View Logs

```bash
npm run docker:prod:logs
```

### Stop Services

```bash
npm run docker:prod:down
```

### Rebuild Image

```bash
npm run docker:prod:build
```

## Environment Variables

### Common

- `NEXTAUTH_URL` - Public URL (e.g., `https://app.example.com`)
- `NEXTAUTH_SECRET` - JWT signing secret (generate with `openssl rand -base64 32`)

### Database (PostgreSQL)

- `DATABASE_URL` - Connection string
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Username
- `POSTGRES_PASSWORD` - Password

### Redis

- `REDIS_URL` - Connection string (e.g., `redis://redis:6379`)

### Auto-Setup (Optional)

Enable automatic admin user creation on first boot:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
ADMIN_NAME=Admin User
AUTO_SETUP_ENABLED=true
```

## Networking

Both compose files define networks to isolate services:

- **Development**: `cocoa-dev-network`
- **Production**: `cocoa-network`

Services communicate via these networks internally.

## Volumes

### Development

- `postgres_dev_data` - PostgreSQL database persistence
- `redis_dev_data` - Redis data persistence
- Source code mounted from host for hot reload

### Production

- `postgres_data` - PostgreSQL database persistence
- `redis_data` - Redis data persistence
- `./cocoa-canvas/prisma/data` - SQLite (if using SQLite instead of PostgreSQL)

## Building the Image

The Dockerfile uses a multi-stage build:

1. **Builder stage**: Installs dependencies, generates Prisma client, builds Next.js
2. **Runtime stage**: Copies only production artifacts, installs prod dependencies

Result: Optimized production image ~800MB

## Health Checks

Both development and production configurations include health checks:

- **App**: `curl http://localhost:3000/api/health`
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`

## Troubleshooting

### Port Already in Use

Change the port in compose file:

```yaml
ports:
  - "3001:3000"  # Change 3001 to your desired port
```

### Database Connection Issues

Verify container is healthy:

```bash
docker-compose -f docker-compose.dev.yml ps
```

Check PostgreSQL logs:

```bash
docker logs cocoa-canvas-postgres-dev
```

### App Not Reloading in Development

Ensure source code is mounted:

```bash
docker inspect cocoa-canvas-app-dev | grep -A 5 Mounts
```

### Out of Disk Space

Clean up Docker resources:

```bash
docker system prune -a --volumes
```

## Production Considerations

- Use external PostgreSQL and Redis services (more scalable)
- Set strong `NEXTAUTH_SECRET`
- Configure proper `NEXTAUTH_URL` (no trailing slash)
- Use environment-specific `.env` files
- Monitor health check endpoints
- Set up log aggregation
- Configure reverse proxy (nginx, Traefik) for SSL termination

## Debugging

### Access Container Shell

```bash
docker exec -it cocoa-canvas-app-dev bash
```

### Check Environment Variables

```bash
docker exec cocoa-canvas-app-dev env | grep NEXTAUTH
```

### Run Commands in Container

```bash
docker exec cocoa-canvas-app-dev npm test
docker exec cocoa-canvas-app-dev npx prisma migrate status
```

### View Resource Usage

```bash
docker stats
```
