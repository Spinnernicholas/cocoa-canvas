---
title: Redis Setup Guide
---

# Redis Setup Guide

This application uses Redis for job queues, caching, and scheduled tasks.

## Development Setup

### Option 1: Docker Compose (Recommended)

The easiest way to run Redis locally is using Docker Compose.

Run all commands from the `cocoa-canvas/` directory:

```bash
cd cocoa-canvas

# Start Redis in the background
npm run docker:dev:up

# Stop Redis
npm run docker:dev:down

# View Redis logs
npm run docker:dev:logs

# Restart Redis
npm run docker:dev:restart
```

Redis will be available at `redis://localhost:6379`

### Option 2: Local Redis Installation

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Windows:**
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL2 with Ubuntu

### Verify Redis is Running

```bash
# Test connection
redis-cli ping
# Should return: PONG

# Or use Docker:
docker exec cocoa-canvas-redis-dev redis-cli ping
```

## Production Setup

Redis is included in the production Docker Compose configuration:

```bash
# Build and start all services (web + redis)
npm run docker:prod:build
npm run docker:prod:up

# View logs
npm run docker:prod:logs

# Stop services
npm run docker:prod:down
```

## Environment Variables

### Development (.env.development)
```
REDIS_URL=redis://localhost:6379
```

### Production (.env.production)
```
REDIS_URL=redis://redis:6379
```

### Docker Compose
The production compose file automatically sets `REDIS_URL=redis://redis:6379` for the web service.

## Redis Configuration

The default configuration includes:
- **Port**: 6379
- **Persistence**: AOF (Append-Only File) enabled
- **Data Volume**: Persists across container restarts
- **Health Checks**: Automatic health monitoring

## Redis Usage in Application

Redis is used for:

1. **Job Queue System (BullMQ)**
   - Voter imports
   - Scheduled tasks
   - Background processing
   - Delayed jobs

2. **Caching**
   - API response caching
   - Session data
   - Rate limiting

3. **Scheduled Jobs**
   - Recurring imports
   - Data cleanup
   - Report generation

## Monitoring Redis

### Connect to Redis CLI

**Development:**
```bash
# Via Docker
docker exec -it cocoa-canvas-redis-dev redis-cli

# Local install
redis-cli
```

**Production:**
```bash
docker exec -it cocoa-canvas-redis redis-cli
```

### Useful Redis Commands

```bash
# View all keys
KEYS *

# Get key value
GET key_name

# View queue info (BullMQ)
KEYS bull:*

# Monitor live commands
MONITOR

# Get server info
INFO

# View memory usage
INFO memory

# Check persistence status
INFO persistence
```

## Troubleshooting

### Redis connection refused
- Ensure Redis is running: `docker ps` or `redis-cli ping`
- Check REDIS_URL environment variable
- Verify port 6379 is not in use by another process

### Data not persisting
- Check Docker volume: `docker volume ls | grep redis`
- Verify AOF is enabled: `redis-cli INFO persistence | grep aof_enabled`

### Out of memory
- Check Redis memory usage: `redis-cli INFO memory`
- Adjust Docker memory limits in docker-compose.yml
- Configure maxmemory policy if needed

## Redis Desktop Clients (Optional)

For GUI management:
- **RedisInsight** (free): https://redis.com/redis-enterprise/redis-insight/
- **Another Redis Desktop Manager** (free): https://github.com/qishibo/AnotherRedisDesktopManager
- **Medis** (macOS): https://getmedis.com/

## Next Steps

After Redis is running:

1. Install BullMQ for job queues:
   ```bash
   npm install bullmq ioredis
   ```

2. Update job queue system to use Redis
3. Implement scheduled jobs with BullMQ
4. Add caching layer for API responses

## Additional Resources

- [Redis Documentation](https://redis.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
