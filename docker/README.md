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
cd ..
docker compose up -d
```

This builds and starts the application with:
- **Next.js app** (port 3000) - optimized production build
- **Redis** (port 6379) - optional, can use external Redis
- **PostgreSQL** (optional) - can use external database

### View Logs

```bash
docker compose logs -f web
```

### Stop Services

```bash
docker compose down
```

### Rebuild Image

```bash
docker compose build
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

## Automated Docker Image Releases

Docker images are automatically built and pushed to GitHub Container Registry (GHCR) via GitHub Actions.

### Release Workflow

#### 1. Development Images (Dev Branch)

When you push to the `dev` branch, GitHub Actions automatically:
- Builds the Docker image
- Tags with `dev-latest` and `dev-{git-sha}`
- Pushes to `ghcr.io/spinnernicholas/cocoa-canvas`

Example:
```bash
git checkout dev
# Make changes to cocoa-canvas/
git add .
git commit -m "Add feature"
git push origin dev
# GitHub Actions builds and pushes dev-{sha}
```

Pull the dev image:
```bash
docker pull ghcr.io/spinnernicholas/cocoa-canvas:dev-latest
```

#### 2. Production Images (Main Branch)

When you push to the `main` branch (typically via PR merge), GitHub Actions:
- Builds the Docker image
- Tags with `latest` and `prod-{git-sha}`
- Pushes to GHCR

```bash
git checkout main
# (or merge dev PR into main)
git push origin main
# GitHub Actions builds and pushes prod-{sha} and latest
```

Pull the production image:
```bash
docker pull ghcr.io/spinnernicholas/cocoa-canvas:latest
```

#### 3. Official Releases (Tags on Main)

To create an official release (e.g., v1.0.0), create and push a git tag on `main`:

```bash
git checkout main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
# GitHub Actions builds, pushes v1.0.0, updates latest, and creates a GitHub Release
```

Pull the release image:
```bash
docker pull ghcr.io/spinnernicholas/cocoa-canvas:v1.0.0
```

### Tag Reference

| Branch | Trigger | Tags | Use Case |
|--------|---------|------|----------|
| `dev` | Push to dev | `dev-latest`, `dev-{sha}` | Testing latest dev features |
| `main` | Push to main | `latest`, `prod-{sha}` | Production deployments |
| Tags (e.g., `v1.0.0`) | Tag on main | `v1.0.0`, `latest` | Official releases, GitHub releases |

### GitHub Actions Setup

The workflows are configured in `.github/workflows/`:
- **docker-build.yml** - Automatic builds on dev & main branch pushes
- **docker-release.yml** - Official releases on version tags

No additional configuration needed—uses GitHub's built-in `GITHUB_TOKEN` for authentication.

### Pushing to Production

Once you have a Docker image, deploy with Docker Compose:

```bash
# Using the latest production image
docker pull ghcr.io/spinnernicholas/cocoa-canvas:latest

# Or a specific release
docker pull ghcr.io/spinnernicholas/cocoa-canvas:v1.0.0

# Update docker-compose.yml to reference the image:
# services:
#   web:
#     image: ghcr.io/spinnernicholas/cocoa-canvas:latest

docker-compose -f docker-compose.yml up -d
```

