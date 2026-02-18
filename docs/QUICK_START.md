# Quick Start

**Get Cocoa Canvas running locally with Docker.**

## Prerequisites

You need:
- **Docker** and **Docker Compose** ([Download Docker Desktop](https://www.docker.com/products/docker-desktop) for Mac/Windows)
- **Git**

Check if you have them:
```bash
docker --version
docker-compose --version
git --version
```

## Clone the Project

```bash
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas/cocoa-canvas
```

## Start Development Environment

This command starts PostgreSQL, Redis, and the Next.js app with hot reload:

```bash
npm run docker:dev:up
```

Wait 30-60 seconds for containers to start and dependencies to install.

The app will be at: **http://localhost:3000**

## Login

An admin account is created automatically:
- **Email**: `admin@example.com`
- **Password**: `password`

## Making Changes

Your source code is mounted into the container:
- Edit React components in `app/`
- Edit backend logic in `lib/`
- Changes appear automatically (hot reload)

## Stop the App

```bash
npm run docker:dev:down
```

Database data is preserved.

---

## Next Steps

- **View Logs**: `npm run docker:dev:logs`
- **Restart App**: `npm run docker:dev:restart`
- **Production Deployment**: See [admin/DOCKER_SETUP.md](admin/DOCKER_SETUP.md)
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Full Documentation**: See [IMPLEMENTATION.md](IMPLEMENTATION.md)
