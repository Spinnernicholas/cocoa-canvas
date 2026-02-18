---
title: Development Setup
---

# Development Setup

**Get a local development environment with hot reload and learn basic commands.**

## Prerequisites

Complete the [Quick Start](/cocoa-canvas/getting-started/01-basic/) first.

## Start Development Environment

```bash
cd cocoa-canvas
npm run docker:dev:up
```

This starts:
- **PostgreSQL** database on port 5432
- **Redis** on port 6379
- **Next.js app** on port 3000 with hot reload enabled

The app is ready when you see: `ready - started server on 0.0.0.0:3000`

Visit http://localhost:3000

## Hot Reload

Your source code is mounted into the container. Changes apply instantly:

```bash
# Edit any file - changes appear without restart
nano app/campaign/page.tsx
nano lib/queue/runner.ts
nano prisma/schema.prisma  # requires db:push
```

No container restart needed for code changes.

## Control Environment

### View Logs

```bash
# All services
npm run docker:dev:logs

# App only (follow output)
docker logs -f cocoa-canvas-app-dev
```

### Stop Services

```bash
# Stop containers (keeps data)
npm run docker:dev:down
```

### Reset Environment (Delete Data)

```bash
# Stop containers AND delete volumes (⚠️ deletes all data)
npm run docker:dev:down -- -v
```

### Restart Services

```bash
# Full restart
npm run docker:dev:restart

# Restart one service
docker-compose -f docker-compose.dev.yml up -d postgres-dev
docker-compose -f docker-compose.dev.yml up -d redis-dev
docker-compose -f docker-compose.dev.yml up -d app-dev
```

## Database Schema Changes

If you modify `prisma/schema.prisma`:

```bash
# Apply schema to dev database
npm run db:push

# Or create a migration (for team sharing)
npm run db:migrate
```

## Run Commands in Container

```bash
# Run any npm command in the container
docker exec cocoa-canvas-app-dev npm test
docker exec cocoa-canvas-app-dev npm run lint

# Open shell in container
docker exec -it cocoa-canvas-app-dev bash
```

## Reset to Clean Slate

```bash
# Stop containers and delete all volumes (⚠️ deletes data)
npm run docker:dev:down -- -v

# Start fresh
npm run docker:dev:up
```

---

For detailed development workflows (testing, database administration, debugging), see the main project documentation.

