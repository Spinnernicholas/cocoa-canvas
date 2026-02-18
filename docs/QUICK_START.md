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

## Stop the App

```bash
npm run docker:dev:down
```

Database data is preserved.

---

## Next Steps

- **[Development Guide](DEVELOPMENT.md)** - Working with the codebase
- **[Production Deployment](PRODUCTION.md)** - Deploy to production
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues
- **[Full Documentation](IMPLEMENTATION.md)** - Feature overview
