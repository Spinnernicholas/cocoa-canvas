# Quick Start

**Get Cocoa Canvas running locally with Docker or deploy to production.**

## Prerequisites

Required:
- **Docker** and **Docker Compose** ([Download Docker Desktop](https://www.docker.com/products/docker-desktop) for Mac/Windows)
- **Git**

Check if you have them:
```bash
docker --version
docker-compose --version
git --version
```

---

## Development Setup

Get a local development environment with hot reload.

### 1. Clone the Project

```bash
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas/cocoa-canvas
```

### 2. Start Development Environment

```bash
npm run docker:dev:up
```

The app will be at: **http://localhost:3000**

Admin login:
- **Email**: `admin@example.com`
- **Password**: `password`

### 3. Common Commands

| Command | Purpose |
|---------|---------|
| `npm run docker:dev:logs` | View container logs |
| `npm run docker:dev:restart` | Restart the app |
| `npm run docker:dev:down` | Stop all containers |
| `npm test` | Run all tests |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Production Deployment

Deploy Cocoa Canvas to production with Docker Compose.

### 1. Clone the Project

```bash
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas/cocoa-canvas
```

### 2. Configure Environment

Create a `.env` file with production settings:

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/cocoa_canvas_prod

# Redis
REDIS_URL=redis://redis:6379

# Security
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# Auto-setup admin user (optional)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=SecurePassword123!
ADMIN_NAME=Administrator
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Start Production Environment

```bash
docker-compose up -d
```

Check status:
```bash
docker-compose logs -f
```

### 4. Common Commands

| Command | Purpose |
|---------|---------|
| `docker-compose logs -f` | View logs |
| `docker-compose restart app` | Restart app |
| `docker-compose down` | Stop all services |
| `docker-compose up -d` | Start all services |

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for:
- Port conflicts
- Database errors
- Container issues
- And more...

## Next Steps

- **Full Documentation**: [IMPLEMENTATION.md](IMPLEMENTATION.md)
- **Status & Roadmap**: [developer/STATUS.md](developer/STATUS.md)
- **Admin Setup**: [admin/DOCKER_SETUP.md](admin/DOCKER_SETUP.md)
