# Quick Start - Get Cocoa Canvas Running in 5 Minutes

**For developers who want to start coding right now.**

## Step 1: Prerequisites

You need:
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **Git**

**Check if you have Docker:**
```bash
docker --version
docker-compose --version
```

**Don't have Docker?**
- **Windows/Mac**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: 
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```

## Step 2: Clone the Project

```bash
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas
cd cocoa-canvas
```

## Step 3: Start Docker Development Environment

**This single command starts everything:**
- PostgreSQL database
- Redis (job queue)
- Next.js app with hot reload

```bash
npm run docker:dev:up
```

Wait 30 seconds for containers to start and app to install dependencies.

## Step 4: View Logs (Optional)

```bash
# See all logs
npm run docker:dev:logs

# Follow app logs only
docker logs -f cocoa-canvas-app-dev
```

The app will be running at:

👉 **http://localhost:3000**

## Step 5: Login

An admin account is automatically created:
- **Email**: admin@example.com
- **Password**: password

(You can change these in `.env` before starting)

## Making Changes

Your source code is mounted into the Docker container:
- Edit React components in `app/` folder
- Edit backend logic in `lib/` folder
- Changes appear automatically (hot reload)
- No need to restart containers

## Stop the App

```bash
npm run docker:dev:down
```

This stops and removes containers (database data is preserved).

---

## ❓ Troubleshooting

### Port conflicts?
If ports 3000, 5432, or 6379 are already in use:
```bash
# Find what's using the port
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Stop conflicting services or change ports in docker-compose.dev.yml
```

### Database errors?
Reset the database:
```bash
npm run docker:dev:down -- -v  # Removes volumes
npm run docker:dev:up          # Fresh start
```

### Changes not showing up?
- Refresh your browser
- Check logs: `docker logs -f cocoa-canvas-app-dev`
- Restart app: `docker-compose -f docker-compose.dev.yml restart app`

### Container won't start?
```bash
# View container logs
docker logs cocoa-canvas-app-dev
docker logs cocoa-canvas-postgres-dev

# Rebuild from scratch
npm run docker:dev:down -- -v
npm run docker:dev:up
```

---

## 🚀 Next Steps

- Read [../planning/PHASE_PLAN.md](../planning/PHASE_PLAN.md) to understand what comes next
- Check [../admin/DOCKER_SETUP.md](../admin/DOCKER_SETUP.md) for production deployment with Docker
- Start implementing Phase 1 features! See [../planning/API_PLAN.md](../planning/API_PLAN.md)

## 🐳 Production Deployment

For production, use Docker. See [../admin/DOCKER_SETUP.md](../admin/DOCKER_SETUP.md) for details:

```bash
# You're already in the cocoa-canvas directory
docker-compose up -d
```

## 💬 Need Help?

- Check existing GitHub issues
- Look at the planning docs in the `docs/planning/` folder
- Ask in discussions (coming soon)

---

**That's it!** You're ready to develop. Happy coding! 🎉
