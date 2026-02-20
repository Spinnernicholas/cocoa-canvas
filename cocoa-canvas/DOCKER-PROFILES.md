# Docker Compose Profiles Guide

The `docker-compose.dev.yml` uses **profiles** to separate development and test services, preventing unnecessary containers from starting.

## Available Profiles

### `dev` Profile
Development services needed for running the app:
- ✅ `redis` - Redis for job queues (port 6379)
- ✅ `postgres` - PostgreSQL for app data (port 5432)
- ✅ `app` - Next.js application (port 3000)

### `test` Profile
Test services needed for running integration tests:
- ✅ `postgres-test` - Test PostgreSQL (port 5433)
- ✅ `redis-test` - Test Redis (port 6380)

## NPM Scripts

### Development Only (Most Common)
```bash
npm run docker:dev:up        # Start dev services
npm run docker:dev:down      # Stop dev services
npm run docker:dev:logs      # View dev logs
npm run docker:dev:restart   # Restart dev services
```

**Starts:** postgres (5432), redis (6379), app (3000)  
**Use when:** Running the development app

---

### Testing Only
```bash
npm run docker:test:up       # Start test services
npm run docker:test:down     # Stop test services
npm run docker:test:logs     # View test logs
```

**Starts:** postgres-test (5433), redis-test (6380)  
**Use when:** Running integration tests without the app

---

### All Services (Dev + Test)
```bash
npm run docker:all:up        # Start everything
npm run docker:all:down      # Stop everything
```

**Starts:** All 5 services  
**Use when:** Developing and testing simultaneously

---

## Manual Docker Compose Commands

If you need more control:

```bash
# Start specific services
docker-compose -f docker-compose.dev.yml up redis postgres

# Start with specific profile
docker-compose -f docker-compose.dev.yml --profile dev up -d
docker-compose -f docker-compose.dev.yml --profile test up -d

# Start multiple profiles
docker-compose -f docker-compose.dev.yml --profile dev --profile test up -d

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f postgres-test

# Stop specific profile
docker-compose -f docker-compose.dev.yml --profile test down
```

## Common Workflows

### Workflow 1: Normal Development
```bash
# Start app with databases
npm run docker:dev:up

# Work on code (hot reload active)
# ...

# Stop when done
npm run docker:dev:down
```

### Workflow 2: Running Tests
```bash
# Start test databases
npm run docker:test:up

# Initialize test database (first time only)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cocoa_canvas_test \
  npm run test:db:setup

# Run tests
npm test

# Stop test databases
npm run docker:test:down
```

### Workflow 3: Full Stack Development + Testing
```bash
# Start everything
npm run docker:all:up

# Develop with app running on :3000
# Run tests against :5433

# Stop everything
npm run docker:all:down
```

## Why Use Profiles?

### Before Profiles ❌
```bash
docker-compose up  # Starts ALL 5 services every time
```
- Wasted resources (test DBs running when not needed)
- Port conflicts if you run multiple projects
- Slower startup
- Confusing which services are for what

### After Profiles ✅
```bash
npm run docker:dev:up   # Only 3 services
npm run docker:test:up  # Only 2 services
```
- Start only what you need
- Faster startup
- Clear separation of concerns
- No port conflicts

## Troubleshooting

### "Port already in use"
```bash
# Check what's using the port
lsof -i :5432
lsof -i :5433

# Stop all services
npm run docker:all:down

# Try again
npm run docker:dev:up
```

### "Can't connect to test database"
```bash
# Make sure test services are running
docker ps | grep test

# If not, start them
npm run docker:test:up

# Check logs
npm run docker:test:logs
```

### "Service 'app' depends on service 'postgres' which is not in the current profile"
This should not happen with the current setup, but if it does:
```bash
# The app profile includes postgres as a dependency
# Use docker:dev:up which starts both
npm run docker:dev:up
```

### View all running containers
```bash
docker ps
```

### Stop and remove all containers + volumes
```bash
# Nuclear option: clean slate
npm run docker:all:down
docker-compose -f docker-compose.dev.yml down -v
```

## Port Reference

| Service | Port | Profile | Purpose |
|---------|------|---------|---------|
| postgres | 5432 | dev | Development database |
| redis | 6379 | dev | Development Redis |
| app | 3000 | dev | Next.js dev server |
| postgres-test | 5433 | test | Test database |
| redis-test | 6380 | test | Test Redis |

## See Also

- [Testing Guide](../docs-site/src/content/docs/developer/testing-guide.md)
- [Docker Compose Documentation](https://docs.docker.com/compose/profiles/)
