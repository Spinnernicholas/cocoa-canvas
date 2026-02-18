---
title: Docker Setup Guide
---

# Docker Setup Guide

This guide explains how to run Cocoa Canvas using Docker for both **development** and **production** deployments.

**For local development**, see [QUICK_START.md](../QUICK_START.md) - use `npm run docker:dev:up` to start PostgreSQL, Redis, and the Next.js app with hot reload.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v1.29+)

## Quick Start - Production

Run from the `cocoa-canvas/` directory (where the docker-compose files are located):

```bash
cd cocoa-canvas
docker-compose up -d
```

Features:
- Optimized production build
- Minimal dependencies
- PostgreSQL support
- Compressed assets
- Health checks enabled

Visit: `http://localhost:3000`

## Environment Setup

### Development

For local development with Docker (PostgreSQL + Redis + App):

```bash
cd cocoa-canvas
npm run docker:dev:up
```

The `.env.development` file is pre-configured with:

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cocoa_canvas_dev
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-only-for-development-not-secure
```

### Production

Create a `.env` file for production:

```bash
cp .env.example .env
```

**Important**: Update these values in `.env`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/cocoa_canvas
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
```

**Note**: For production, use a properly secured PostgreSQL instance with strong credentials.

For auto-setup (create admin account automatically):

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePass123!
ADMIN_NAME=Administrator
AUTO_SETUP_ENABLED=true
```

## First Time Setup

1. **Start the app**: `docker-compose up -d`
2. **Create Admin Account**: Visit `http://localhost:3000` and complete the setup wizard
3. **Create Campaign**: Set up your first campaign with dates and target area

## Stopping

```bash
docker-compose down
```

To also remove data:

```bash
docker-compose down -v
```

## Using PostgreSQL

PostgreSQL is the default database for both development and production.

### Development (Local Docker)

You get PostgreSQL automatically with:

```bash
npm run docker:dev:up
```

This starts:
- PostgreSQL on localhost:5432
- Redis on localhost:6379
- Next.js app on localhost:3000

### Production (Docker Compose)

The production `docker-compose.yml` includes PostgreSQL by default:

```bash
docker-compose up -d
```

### External PostgreSQL

To use a managed PostgreSQL service or external server:

```
DATABASE_URL=postgresql://user:password@your-host:5432/cocoa_canvas
```

## Database Management

### Prisma Studio (Interactive GUI)

Best way to view and edit data:

```bash
docker-compose exec web npx prisma studio
```

Access at `http://localhost:5555`

### Migrations

Create a new migration:

```bash
docker-compose exec web npx prisma migrate dev --name migration_name
```

## Health Check

The application includes a health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-15T12:00:00Z",
  "version": "0.1.0"
}
```

## Debugging

### View Logs

```bash
docker-compose logs -f web
```

### Execute Commands in Container

```bash
docker-compose exec web npm run build
docker-compose exec web npx prisma db seed
```

## Build Configuration

The Dockerfile uses a **multi-stage build** for optimal production images:

1. **Builder Stage**: Installs dependencies, generates Prisma client, builds Next.js
2. **Runtime Stage**: Only includes production dependencies, reduces image size

### Image Size

- Builder image: ~1.2 GB (intermediate, discarded)
- Final runtime image: ~500 MB

## Data Persistence

### SQLite

Data stored in `./data/cocoa_canvas.db` (mounted volume):

```yaml
volumes:
  - ./data:/app/data
```

Backups:

```bash
cp data/cocoa_canvas.db data/cocoa_canvas.db.backup
```

### PostgreSQL

Data stored in `postgres_data` volume:

```bash
docker volume ls
docker volume inspect cocoa-canvas_postgres_data
```

## Production Deployment

This section covers production-grade deployment strategies using Docker.

### Pre-Deployment Checklist

Before deploying to production:

- [ ] PostgreSQL configured (recommended over SQLite)
- [ ] Strong `NEXTAUTH_SECRET` generated (32+ characters)
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] Redis secured with password
- [ ] Database credentials secured
- [ ] SSL/TLS certificates obtained
- [ ] Reverse proxy configured (Nginx/Traefik)
- [ ] Backup strategy implemented
- [ ] Monitoring and logging configured
- [ ] Environment variables stored securely
- [ ] Firewall rules configured
- [ ] Auto-setup credentials set (if using)

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete configuration reference.

---

### Production Environment Variables

Create `.env.production`:

```bash
cp .env.example .env.production
```

**Minimum required configuration**:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db-host:5432/cocoa_canvas
REDIS_URL=redis://:password@redis-host:6379
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generated-with-openssl-rand-base64-32>

# Auto-setup (optional)
AUTO_SETUP_ENABLED=true
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<secure-generated-password>
ADMIN_NAME=Administrator

# Logging
LOG_LEVEL=info

# Feature flags
ENABLE_OAUTH=false
ENABLE_MFA=false
ENABLE_LDAP=false
```

---

### Reverse Proxy Setup

For production, run behind a reverse proxy (Nginx or Traefik) to handle:
- SSL/TLS termination
- Load balancing
- Rate limiting
- Static file caching
- Security headers

#### Option 1: Nginx

Create `nginx.conf`:

```nginx
upstream cocoa_canvas {
    server web:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL certificates
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy settings
    location / {
        proxy_pass http://cocoa_canvas;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://cocoa_canvas;
        # ... (same proxy settings as above)
    }
}
```

**Docker Compose with Nginx**:

```yaml
services:
  web:
    build: .
    expose:
      - "3000"
    # ... other config

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - web
    networks:
      - cocoa-network
```

#### Option 2: Traefik (with automatic SSL)

**docker-compose.traefik.yml**:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=admin@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    networks:
      - cocoa-network

  web:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cocoa.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.cocoa.entrypoints=websecure"
      - "traefik.http.routers.cocoa.tls.certresolver=myresolver"
      - "traefik.http.services.cocoa.loadbalancer.server.port=3000"
    # ... rest of config
```

---

### SSL/TLS Certificates

#### Option 1: Let's Encrypt (Free, Automated)

With Traefik (see above) or Certbot:

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates located at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Auto-renewal (crontab)
0 0 1 * * certbot renew --quiet
```

#### Option 2: Commercial Certificate

Purchase from certificate authority, then:

```bash
# Copy certificates
cp your-domain.crt /path/to/ssl/certs/
cp your-domain.key /path/to/ssl/private/

# Set permissions
chmod 600 /path/to/ssl/private/your-domain.key
```

---

### Deployment Strategies

#### Strategy 1: Single Server (Simple)

**Best for**: Small deployments, < 10k users

```bash
# On production server
git clone <repo>
cd cocoa-canvas
cp .env.example .env.production
# Edit .env.production with production values
docker-compose -f docker-compose.yml --env-file .env.production up -d
```

**Pros**: Simple, low cost  
**Cons**: No high availability, single point of failure

---

#### Strategy 2: Docker Swarm (Multi-Node)

**Best for**: Medium deployments, high availability needed

**docker-compose.swarm.yml**:

```yaml
version: '3.8'

services:
  web:
    image: your-registry.com/cocoa-canvas:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    # ... rest of config

  postgres:
    image: postgres:15-alpine
    deploy:
      placement:
        constraints:
          - node.role == manager
    # ... rest of config
```

**Deploy to swarm**:

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.swarm.yml cocoa

# Scale services
docker service scale cocoa_web=5

# Update service
docker service update --image cocoa-canvas:v2 cocoa_web

# View services
docker service ls
docker service ps cocoa_web
```

**Pros**: Built-in load balancing, rolling updates, self-healing  
**Cons**: More complex than single server

---

#### Strategy 3: Kubernetes (Production-Grade)

**Best for**: Large deployments, enterprise requirements

**kubernetes/deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cocoa-canvas
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cocoa-canvas
  template:
    metadata:
      labels:
        app: cocoa-canvas
    spec:
      containers:
      - name: web
        image: your-registry.com/cocoa-canvas:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cocoa-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: cocoa-secrets
              key: nextauth-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: cocoa-canvas
spec:
  selector:
    app: cocoa-canvas
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

**Deploy to Kubernetes**:

```bash
# Create secrets
kubectl create secret generic cocoa-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=nextauth-secret='...'

# Deploy
kubectl apply -f kubernetes/

# Scale
kubectl scale deployment cocoa-canvas --replicas=5

# Rolling update
kubectl set image deployment/cocoa-canvas web=cocoa-canvas:v2

# View status
kubectl get pods
kubectl get svc
kubectl logs -f deployment/cocoa-canvas
```

**Pros**: Industry standard, full orchestration, auto-scaling  
**Cons**: Steep learning curve, more infrastructure required

---

### Monitoring & Logging

#### Docker Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f web

# Last 100 lines
docker-compose logs --tail=100 web

# Since timestamp
docker-compose logs --since 2024-01-01T12:00:00 web
```

#### Log Aggregation

**Option 1: Simple - Log to file and rotate**

```yaml
services:
  web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Option 2: ELK Stack (Elasticsearch, Logstash, Kibana)**

Add to docker-compose:

```yaml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

**Option 3: Cloud logging (DataDog, New Relic, CloudWatch)**

---

#### Health Monitoring

**Built-in health endpoint**:

```bash
curl http://localhost:3000/api/health
```

**Uptime monitoring services**:
- UptimeRobot
- Pingdom
- StatusCake
- AWS Route 53 Health Checks

**Application Performance Monitoring (APM)**:
- New Relic
- DataDog APM
- Sentry (error tracking)
- Application Insights (Azure)

---

### Backup & Recovery

#### Database Backups

**SQLite**:

```bash
# Backup
docker-compose exec web cp /app/prisma/data/cocoa_canvas.db /app/prisma/data/backup-$(date +%Y%m%d).db

# Restore
docker-compose exec web cp /app/prisma/data/backup-20240116.db /app/prisma/data/cocoa_canvas.db
docker-compose restart web
```

**PostgreSQL**:

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres cocoa_canvas > backup-$(date +%Y%m%d).sql

# Compressed backup
docker-compose exec postgres pg_dump -U postgres cocoa_canvas | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore
cat backup-20240116.sql | docker-compose exec -T postgres psql -U postgres cocoa_canvas

# Automated daily backups (crontab)
0 2 * * * cd /path/to/cocoa-canvas && docker-compose exec postgres pg_dump -U postgres cocoa_canvas | gzip > backups/backup-$(date +\%Y\%m\%d).sql.gz
```

#### Redis Backups

Redis automatically persists data (AOF enabled):

```bash
# Manual save
docker-compose exec redis redis-cli SAVE

# Copy RDB file
docker cp cocoa-canvas-redis:/data/dump.rdb ./backup/redis-$(date +%Y%m%d).rdb
```

#### Volume Backups

```bash
# Backup all volumes
docker run --rm \
  -v cocoa-canvas_postgres_data:/source \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /source .

# Restore
docker run --rm \
  -v cocoa-canvas_postgres_data:/target \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres-20240116.tar.gz -C /target
```

---

### Performance Optimization

#### Resource Limits

Set resource limits in docker-compose:

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

#### Database Connection Pooling

Already configured in Prisma, but tune for production:

```env
# In DATABASE_URL
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

#### Redis Configuration

Optimize Redis for job queues:

```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --appendonly yes
```

#### CDN for Static Assets

For production, serve static assets from CDN:

1. Build app with `next.config.js` using `assetPrefix`
2. Upload `_next/static` to CDN
3. Configure CDN to cache aggressively

---

### Security Hardening

#### Docker Security

```yaml
services:
  web:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp
```

#### Network Isolation

```yaml
services:
  web:
    networks:
      - frontend
      - backend
  
  postgres:
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true  # No external access
```

#### Environment Variable Security

**Never** commit secrets to git. Use:

1. **Docker Secrets** (Swarm):
```bash
echo "my-secret" | docker secret create nextauth_secret -
```

2. **Kubernetes Secrets**:
```bash
kubectl create secret generic cocoa-secrets --from-literal=key=value
```

3. **External Secrets Manager**:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

---

### Updates and Rollbacks

#### Rolling Updates

```bash
# Build new image
docker build -t cocoa-canvas:v2 .

# Update service (zero-downtime with multiple replicas)
docker service update --image cocoa-canvas:v2 cocoa_web

# Rollback if issues
docker service rollback cocoa_web
```

#### Blue-Green Deployment

```bash
# Start green environment
docker-compose -f docker-compose.green.yml up -d

# Test green environment
curl http://green.localhost:3000/api/health

# Switch traffic (update DNS/load balancer)
# ...

# Stop blue environment
docker-compose -f docker-compose.blue.yml down
```

## Troubleshooting

### Port 3000 Already in Use

Change the exposed port in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Maps host 3001 to container 3000
```

### Database Connection Error

Check if PostgreSQL is healthy:

```bash
docker-compose ps
docker-compose logs postgres
```

### Can't Access http://localhost:3000

- Verify container is running: `docker-compose ps`
- Check logs: `docker-compose logs web`
- Ensure port 3000 is not blocked by firewall

## Next Steps

After Docker setup is working:

1. Review [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete configuration reference
2. Set up monitoring and alerting
3. Configure automated backups
4. Implement SSL/TLS with auto-renewal
5. Set up log aggregation
6. Configure reverse proxy
7. Review security hardening checklist

## See Also

- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Complete environment variable reference
- [Auto Setup](./AUTO_SETUP.md) - Automatic admin user creation
- [Redis Setup](./REDIS_SETUP.md) - Redis configuration for job queues
- [Quick Start Guide](../QUICK_START.md) - Local development setup
- [Phase Plan](../planning/PHASE_PLAN.md) - Project implementation phases

## References

- [Next.js in Docker](https://nextjs.org/docs/deployment/docker)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Swarm Tutorial](https://docs.docker.com/engine/swarm/swarm-tutorial/)
- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
