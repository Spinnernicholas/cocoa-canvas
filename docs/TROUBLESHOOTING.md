# Troubleshooting

Common issues and how to fix them.

## Port Conflicts

**Error**: `Address already in use` when starting containers

If ports 3000 (app), 5432 (database), or 6379 (Redis) are already in use:

```bash
# Find what's using the port
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Option 1: Stop conflicting services
# Option 2: Change ports in docker-compose.dev.yml
```

## Database Errors

**Error**: Database connection failed, migrations failed, or corrupted state

Reset the database:
```bash
npm run docker:dev:down -v  # Removes volumes
npm run docker:dev:up       # Fresh start with clean database
```

## Changes Not Showing Up

**Issue**: Code changes aren't reflected in the running app

1. Refresh your browser
2. Check logs for errors:
   ```bash
   docker logs -f cocoa-canvas-app-dev
   ```
3. Restart the app container:
   ```bash
   docker-compose -f docker-compose.dev.yml restart app
   ```

## Container Won't Start

**Error**: Containers fail to start or keep restarting

1. Check container logs:
   ```bash
   docker logs cocoa-canvas-app-dev
   docker logs cocoa-canvas-postgres-dev
   docker logs cocoa-canvas-redis-dev
   ```

2. Try rebuilding from scratch:
   ```bash
   npm run docker:dev:down
   npm run docker:dev:up
   ```

## Authentication Errors

**Error**: "Unauthorized" or login doesn't work

1. Check if your token is in localStorage:
   ```javascript
   // In browser console
   localStorage.getItem('authToken')
   ```

2. Clear localStorage and try logging in again:
   ```javascript
   localStorage.clear()
   ```

3. Verify default admin credentials in `.env` or `.env.local`:
   - Look for `ADMIN_EMAIL=admin@example.com`
   - Default password is `password`

## Tests Failing

**Error**: Running `npm test` produces failures

1. Check test output for specific error messages
2. Run tests with verbose output:
   ```bash
   npm test -- --reporter=verbose
   ```

3. Run tests for a specific file:
   ```bash
   npm test lib/auth/jwt.test.ts
   ```

4. Check that all dependencies are installed:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm test
   ```

## Import Errors

**Error**: Module import fails, `@/lib/...` paths don't resolve

1. Verify the `@/` path alias in `tsconfig.json`:
   ```json
   "baseUrl": ".",
   "paths": {
     "@/*": ["./*"]
   }
   ```

2. Restart your IDE or TypeScript server
3. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run build
   ```

## Redis Connection Issues

**Error**: BullMQ job queue can't connect to Redis

1. Check if Redis is running:
   ```bash
   docker logs cocoa-canvas-redis-dev
   ```

2. Verify REDIS_URL in `.env`:
   ```
   REDIS_URL=redis://localhost:6379
   ```

3. Test Redis connection:
   ```bash
   docker exec cocoa-canvas-redis-dev redis-cli ping
   # Should output: PONG
   ```

## Prisma Schema Issues

**Error**: `prisma generate` fails or schema sync fails

1. Reset migrations:
   ```bash
   npm run db:push
   ```

2. View detailed migration status:
   ```bash
   npm run db:migrate status
   ```

3. If migrations are stuck, you may need to manually reset:
   ```bash
   npm run docker:dev:down
   npm run docker:dev:up
   npm run db:push
   ```

## Still Stuck?

1. **Check logs**: Most issues show up in container logs
   ```bash
   npm run docker:dev:logs
   ```

2. **Check GitHub Issues**: Your problem might already be solved
   - https://github.com/Spinnernicholas/cocoa-canvas/issues

3. **Review documentation**: 
   - [Admin Setup Guide](admin/DOCKER_SETUP.md)
   - [Environment Variables](admin/ENVIRONMENT_VARIABLES.md)
   - [Developer Documentation](developer/)

