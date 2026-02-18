# Production Deployment

**Deploy Cocoa Canvas to production with Docker.**

## Quick Start

```bash
cd cocoa-canvas

# Set environment variables (see below)
export ADMIN_EMAIL=admin@yourdomain.com
export ADMIN_PASSWORD=YourSecurePassword123
export ADMIN_NAME="System Administrator"

# Start production containers
npm run docker:prod:up

# View logs
npm run docker:prod:logs
```

The app will be running on your configured port (default: 3000).

## System Requirements

- **Server**: Linux or macOS
- **Docker** and **Docker Compose**: Latest versions
- **Storage**: 10GB+ for database and uploads
- **Memory**: 2GB+ recommended
- **CPU**: 2+ cores recommended

## Configuration

### Required Environment Variables

Set these before starting the application:

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:PASSWORD@db:5432/cocoa_canvas_prod

# Redis
REDIS_URL=redis://redis:6379

# Security
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32
NEXTAUTH_URL=https://yourapp.example.com

# Auto-create admin user on first boot
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!
ADMIN_NAME=Administrator
```

### Optional Environment Variables

```bash
# JWT Token Expiry
JWT_EXPIRY=30d

# Node Environment
NODE_ENV=production

# Custom Port
PORT=3000
```

## Deployment Steps

### 1. Prepare Your Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone and Configure

```bash
git clone https://github.com/Spinnernicholas/cocoa-canvas.git
cd cocoa-canvas/cocoa-canvas

# Create .env file with production settings
cat > .env.production << 'EOF'
DATABASE_URL=postgresql://postgres:PASSWORD@db:5432/cocoa_canvas_prod
REDIS_URL=redis://redis:6379
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://yourapp.example.com
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!
ADMIN_NAME=Administrator
NODE_ENV=production
EOF

# Secure the .env file
chmod 600 .env.production
```

### 3. Update Docker Compose Configuration

Edit `docker-compose.yml`:

```yaml
# Change PostgreSQL password
postgres:
  environment:
    POSTGRES_PASSWORD: your-secure-password-here

# Configure port binding
app:
  ports:
    - "3000:3000"  # Change 3000 to your desired port
```

### 4. Start Application

```bash
# Pull latest images
docker-compose -f docker-compose.yml pull

# Start all services
npm run docker:prod:up

# Wait 30-60 seconds for startup
sleep 60

# Check status
npm run docker:prod:logs | tail -20
```

### 5. Verify Deployment

```bash
# Check if app is running
curl http://localhost:3000

# Try logging in
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePassword123!"}'
```

## First Boot (Auto-Setup)

On first boot with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` set:

1. Admin user is automatically created
2. Campaign is initialized
3. System is ready to use

Login with your configured credentials.

## Ongoing Operations

### View Logs

```bash
# All services
npm run docker:prod:logs

# Specific service
docker logs -f cocoa-canvas-app

# Real-time follow
npm run docker:prod:logs -f
```

### Restart Services

```bash
# Restart all
npm run docker:prod:restart

# Restart specific service
docker-compose restart app
docker-compose restart postgres
docker-compose restart redis
```

### Stop Application

```bash
# Stop all containers (data preserved)
npm run docker:prod:down

# Stop and remove containers
docker-compose down

# Stop and remove everything including volumes (DATA LOSS!)
docker-compose down -v
```

### Backup Database

```bash
# Backup PostgreSQL
docker exec cocoa-canvas-postgres pg_dump -U postgres cocoa_canvas_prod > backup.sql

# Restore from backup
docker exec -i cocoa-canvas-postgres psql -U postgres cocoa_canvas_prod < backup.sql
```

## Security Considerations

### Passwords & Secrets

- Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`
- Use strong passwords for ADMIN_PASSWORD and DATABASE passwords
- Store secrets in a secrets manager, not in version control
- Rotate passwords periodically

### Network Security

- Run behind a reverse proxy (nginx, Cloudflare, AWS Load Balancer)
- Enable HTTPS/TLS on the reverse proxy
- Restrict direct access to ports 5432 (PostgreSQL) and 6379 (Redis)
- Use a firewall to restrict access

### Data Protection

- Enable automated database backups
- Monitor disk space
- Keep Docker images updated
- Review audit logs regularly

### Example: nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name yourapp.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### App won't start
```bash
npm run docker:prod:logs
docker logs cocoa-canvas-app
```

### Database connection failed
```bash
# Test PostgreSQL
docker exec cocoa-canvas-postgres pg_isready -U postgres

# Check DATABASE_URL format
echo $DATABASE_URL
```

### Port already in use
Change the port mapping in `docker-compose.yml`:
```yaml
app:
  ports:
    - "8080:3000"  # Use 8080 instead of 3000
```

### Out of disk space
```bash
# Clean up Docker
docker system prune -a

# Check disk usage
df -h
du -sh cocoa-canvas/
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more issues.

## Monitoring

### Check Application Health

```bash
# Basic health check
curl http://localhost:3000

# API health endpoint
curl http://localhost:3000/api/health
```

### Monitor Container Resource Usage

```bash
docker stats cocoa-canvas-app cocoa-canvas-postgres cocoa-canvas-redis
```

### Database Monitoring

```bash
# Connect to PostgreSQL
docker exec -it cocoa-canvas-postgres psql -U postgres -d cocoa_canvas_prod

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check disk usage
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;
```

## Scaling Considerations

Current deployment is single-instance. For scaling:

- Consider managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Use external Redis (Upstash, AWS ElastiCache)
- Deploy app to Kubernetes (k8s, ECS, Render)
- Use load balancer for multiple app instances
- Set up CDN for static assets

See [admin/DOCKER_SETUP.md](admin/DOCKER_SETUP.md) for advanced configuration.

## Getting Help

- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues
- **[GitHub Issues](https://github.com/Spinnernicholas/cocoa-canvas/issues)** - Report bugs
- **[Docker Documentation](https://docs.docker.com/)** - Docker help
- **[Full Documentation](IMPLEMENTATION.md)** - Feature overview

