# Environment Variables Reference

This document describes all environment variables used by Cocoa Canvas for configuration and deployment.

## File Locations

Environment variables can be set in:

- **`.env`** - General environment configuration (use for deployment)
- **`.env.development`** - Development-specific settings (local development)
- **`.env.production`** - Production-specific settings (Docker/deployment)
- **`.env.example`** - Template file with all available variables

**Important**: Never commit `.env`, `.env.development`, or `.env.production` files to version control. They are listed in `.gitignore`.

---

## Core Application Variables

### NODE_ENV

**Purpose**: Sets the application runtime environment  
**Type**: String  
**Values**: `development`, `production`, `test`  
**Default**: `development`  
**Required**: No

```env
NODE_ENV=production
```

**Effects**:
- `development`: Enables debug logging, hot reload, detailed error messages
- `production`: Optimized builds, minimal logging, error handling for security
- `test`: Used during automated testing

---

### PORT

**Purpose**: HTTP port the application listens on  
**Type**: Number  
**Default**: `3000`  
**Required**: No

```env
PORT=3000
```

**Usage**:
- Development: Usually `3000`
- Production: Usually `3000` (behind reverse proxy on 80/443)
- Docker: Internal port `3000` (map to host port in docker-compose.yml)

---

## Database Configuration

### DATABASE_URL

**Purpose**: Database connection string for Prisma ORM  
**Type**: String (Connection URL)  
**Required**: Yes  
**Default**: `postgresql://postgres:postgres@localhost:5432/cocoa_canvas_dev`

#### PostgreSQL (Default for Development and Production)

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

**Examples**:

```env
# Local development (Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cocoa_canvas_dev

# Docker Compose (internal network)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/cocoa_canvas

# External PostgreSQL server
DATABASE_URL=postgresql://user:SecurePass123@db.example.com:5432/cocoa_canvas

# Managed service (AWS RDS, Google Cloud SQL, etc.)
DATABASE_URL=postgresql://admin:password@your-instance.region.rds.amazonaws.com:5432/cocoa_canvas
```

**Connection String Format**:
```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

**Common Options**:
```env
# With SSL (recommended for production)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# With connection pool
DATABASE_URL=postgresql://user:pass@host:5432/db?pool_timeout=10&connection_limit=10
```

#### SQLite (Alternative for Simple Deployments)

```env
DATABASE_URL=file:./data/cocoa_canvas.db
```

**Notes**:
- Path is relative to `prisma/schema.prisma`
- Suitable for very small deployments or testing
- File stored at `prisma/data/cocoa_canvas.db`
- Requires changing Prisma schema provider to "sqlite"

---

## Redis Configuration

### REDIS_URL

**Purpose**: Redis connection string for job queues and caching  
**Type**: String (Connection URL)  
**Required**: Yes  
**Default**: `redis://localhost:6379`

```env
# Local development
REDIS_URL=redis://localhost:6379

# Docker Compose (internal network)
REDIS_URL=redis://redis:6379

# Redis with authentication
REDIS_URL=redis://:password@host:6379

# Redis with database selection
REDIS_URL=redis://host:6379/2
```

**Connection String Format**:
```
redis://[username]:[password]@[host]:[port]/[database]
```

**Usage**:
- Job queue management (BullMQ)
- Session caching
- Rate limiting
- Temporary data storage

**Notes**:
- Database number (0-15) can be specified in URL
- Authentication optional for local development
- **Always** use authentication in production

---

## Authentication & Security

### NEXTAUTH_URL

**Purpose**: Base URL of the application for NextAuth.js  
**Type**: String (URL)  
**Required**: Yes  
**Default**: `http://localhost:3000`

```env
# Development
NEXTAUTH_URL=http://localhost:3000

# Production
NEXTAUTH_URL=https://your-domain.com

# Production with custom port
NEXTAUTH_URL=https://your-domain.com:8443
```

**Notes**:
- Must match the actual URL users access
- Include protocol (`http://` or `https://`)
- No trailing slash
- Used for OAuth callbacks and session cookies

---

### NEXTAUTH_SECRET

**Purpose**: Secret key for signing JWT tokens and encrypting session data  
**Type**: String (Base64 or random string)  
**Required**: Yes  
**Security**: **CRITICAL** - Must be secret and unique per environment

**Generate a secure secret**:

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

```env
NEXTAUTH_SECRET=your-generated-secret-here-minimum-32-characters
```

**Best Practices**:
- **Never** use the same secret across environments
- **Never** commit secrets to version control
- Minimum 32 characters (longer is better)
- Rotate secrets periodically (requires re-login)
- Store in secure secret management service (production)

---

### JWT_EXPIRY

**Purpose**: JWT token expiration time  
**Type**: String (Zeit/ms format)  
**Default**: `30m` (30 minutes)  
**Required**: No

```env
JWT_EXPIRY=30m
```

**Valid Formats**:
- `30s` - 30 seconds
- `5m` - 5 minutes
- `30m` - 30 minutes
- `1h` - 1 hour
- `24h` - 24 hours
- `7d` - 7 days

**Recommendations**:
- Development: `30m` to `1h`
- Production: `15m` to `30m` (more secure)
- Longer expiry = convenience, shorter = security

---

### SESSION_TIMEOUT

**Purpose**: Session inactivity timeout (seconds)  
**Type**: Number  
**Default**: `1800` (30 minutes)  
**Required**: No

```env
SESSION_TIMEOUT=1800
```

**Common Values**:
- `900` - 15 minutes (high security)
- `1800` - 30 minutes (balanced)
- `3600` - 1 hour (convenience)
- `7200` - 2 hours (low security)

---

## Auto-Setup Configuration

These variables enable automatic admin user creation on first run, bypassing the web-based setup wizard.

### AUTO_SETUP_ENABLED

**Purpose**: Enable/disable automatic setup  
**Type**: Boolean String  
**Values**: `true`, `false`  
**Default**: `false`  
**Required**: No

```env
AUTO_SETUP_ENABLED=true
```

**When to use**:
- Docker deployments
- CI/CD pipelines
- Automated infrastructure provisioning
- Development environments

---

### ADMIN_EMAIL

**Purpose**: Email address for auto-created admin account  
**Type**: String (Email)  
**Required**: Only if `AUTO_SETUP_ENABLED=true`

```env
ADMIN_EMAIL=admin@example.com
```

**Validation**:
- Must be valid email format
- Used for login credentials
- Cannot be changed after creation (use admin UI to add new admins)

---

### ADMIN_PASSWORD

**Purpose**: Password for auto-created admin account  
**Type**: String  
**Required**: Only if `AUTO_SETUP_ENABLED=true`  
**Security**: Store securely, rotate after first login

```env
ADMIN_PASSWORD=SecurePassword123!
```

**Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Best Practices**:
- Generate strong random password
- Store in secrets manager (production)
- Change password after first login
- Never log or expose in error messages

---

### ADMIN_NAME

**Purpose**: Display name for auto-created admin account  
**Type**: String  
**Default**: `Admin`  
**Required**: No

```env
ADMIN_NAME=System Administrator
```

---

## Logging & Monitoring

### LOG_LEVEL

**Purpose**: Minimum log level to output  
**Type**: String  
**Values**: `debug`, `info`, `warn`, `error`  
**Default**: `info`  
**Required**: No

```env
# Development
LOG_LEVEL=debug

# Production
LOG_LEVEL=info
```

**Log Levels**:
- `debug` - All messages including debug info (verbose)
- `info` - Informational messages and above
- `warn` - Warnings and errors only
- `error` - Errors only

---

## Feature Flags

Feature flags enable/disable optional functionality. All default to `false` for Phase 1.

### ENABLE_OAUTH

**Purpose**: Enable OAuth authentication providers  
**Type**: Boolean String  
**Values**: `true`, `false`  
**Default**: `false`  
**Required**: No

```env
ENABLE_OAUTH=true
```

**Related Variables** (when enabled):
```env
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret
```

---

### ENABLE_MFA

**Purpose**: Enable multi-factor authentication  
**Type**: Boolean String  
**Values**: `true`, `false`  
**Default**: `false`  
**Required**: No

```env
ENABLE_MFA=true
```

**Status**: Planned for Phase 3+

---

### ENABLE_LDAP

**Purpose**: Enable LDAP/Active Directory authentication  
**Type**: Boolean String  
**Values**: `true`, `false`  
**Default**: `false`  
**Required**: No

```env
ENABLE_LDAP=true
```

**Related Variables** (when enabled):
```env
LDAP_URL=ldap://ldap.example.com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=admin-password
LDAP_SEARCH_BASE=ou=users,dc=example,dc=com
```

**Status**: Planned for Phase 3+

---

## OAuth Configuration (Optional)

Only required when `ENABLE_OAUTH=true`.

### GitHub OAuth

```env
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret
```

**Setup**:
1. Create OAuth App at https://github.com/settings/developers
2. Set callback URL: `https://your-domain.com/api/auth/callback/github`
3. Copy Client ID and Secret

---

### Google OAuth

```env
GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_SECRET=your-google-client-secret
```

**Setup**:
1. Create OAuth credentials in Google Cloud Console
2. Configure consent screen
3. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
4. Copy Client ID and Secret

---

## Environment Examples

### Development (Local)

**.env.development**:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=file:./data/cocoa_canvas.db
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-only-for-development-not-secure
JWT_EXPIRY=1h
SESSION_TIMEOUT=3600
LOG_LEVEL=debug
ENABLE_OAUTH=false
ENABLE_MFA=false
ENABLE_LDAP=false
```

---

### Docker Compose (Local)

**.env**:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./data/cocoa_canvas.db
REDIS_URL=redis://redis:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRY=30m
SESSION_TIMEOUT=1800
LOG_LEVEL=info

# Auto-setup for convenience
AUTO_SETUP_ENABLED=true
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=ChangeMe123!
ADMIN_NAME=Local Admin
```

---

### Production (SQLite)

**.env.production**:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./data/cocoa_canvas.db
REDIS_URL=redis://:your-redis-password@redis.example.com:6379
NEXTAUTH_URL=https://cocoa-canvas.example.com
NEXTAUTH_SECRET=<generated-secure-secret-32-chars-minimum>
JWT_EXPIRY=30m
SESSION_TIMEOUT=1800
LOG_LEVEL=info
ENABLE_OAUTH=false
ENABLE_MFA=false
ENABLE_LDAP=false

# Auto-setup for initial deployment
AUTO_SETUP_ENABLED=true
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<generated-secure-password>
ADMIN_NAME=Administrator
```

---

### Production (PostgreSQL)

**.env.production**:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://cocoa_user:SecureDBPass123@db.example.com:5432/cocoa_canvas?sslmode=require
REDIS_URL=redis://:SecureRedisPass123@redis.example.com:6379
NEXTAUTH_URL=https://cocoa-canvas.example.com
NEXTAUTH_SECRET=<generated-secure-secret-32-chars-minimum>
JWT_EXPIRY=30m
SESSION_TIMEOUT=1800
LOG_LEVEL=info
ENABLE_OAUTH=false
ENABLE_MFA=false
ENABLE_LDAP=false

# Auto-setup (optional, can use web wizard instead)
AUTO_SETUP_ENABLED=true
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<generated-secure-password>
ADMIN_NAME=Administrator
```

---

## Security Best Practices

### Secret Management

**Development**:
- Use `.env.development` with weak secrets
- Commit `.env.example` as template only
- Never commit actual `.env` files

**Production**:
1. **Environment Variables**: Set directly in hosting platform
2. **Docker Secrets**: Use Docker secrets for sensitive values
3. **Secrets Manager**: AWS Secrets Manager, Google Secret Manager, HashiCorp Vault
4. **CI/CD Secrets**: GitHub Secrets, GitLab CI Variables, etc.

### Secret Rotation

Rotate secrets periodically:

1. **NEXTAUTH_SECRET**: Every 90 days (forces user re-login)
2. **ADMIN_PASSWORD**: After initial setup, then quarterly
3. **Database passwords**: Every 6 months
4. **Redis passwords**: Every 6 months
5. **OAuth secrets**: When compromised or annually

### Access Control

- Limit who can view production environment variables
- Use role-based access for secrets management systems
- Audit secret access regularly
- Never expose secrets in logs, error messages, or client code

---

## Troubleshooting

### Missing Required Variables

**Error**: `NEXTAUTH_SECRET is required`

**Solution**: Set in `.env` file or environment
```bash
export NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

---

### Database Connection Failed

**Error**: `Can't reach database server`

**Check**:
1. Verify `DATABASE_URL` format
2. Check database server is running
3. Verify network connectivity
4. Check firewall rules
5. Verify credentials

**Test PostgreSQL connection**:
```bash
psql "postgresql://user:pass@host:5432/db"
```

---

### Redis Connection Failed

**Error**: `Redis connection timeout`

**Check**:
1. Verify `REDIS_URL` format
2. Check Redis server is running: `redis-cli ping`
3. Verify network connectivity
4. Check firewall rules

**Test Redis connection**:
```bash
redis-cli -u redis://localhost:6379 ping
```

---

### Invalid NEXTAUTH_URL

**Error**: `Invalid callback URL`

**Solution**: Ensure `NEXTAUTH_URL` matches actual application URL:
- Include protocol (`http://` or `https://`)
- Match domain exactly
- Match port if non-standard
- No trailing slash

---

### Auto-Setup Not Working

**Symptoms**: Admin user not created automatically

**Check**:
1. `AUTO_SETUP_ENABLED=true` is set
2. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are provided
3. Database is accessible
4. Check application logs for errors
5. Verify no existing admin users (auto-setup skips if admins exist)

---

## Validation

### Check Current Environment

```bash
# Print all environment variables (development only!)
printenv | grep -E "NODE_ENV|DATABASE_URL|REDIS_URL|NEXTAUTH"

# Check specific variable
echo $NEXTAUTH_SECRET
```

**Warning**: Never log environment variables in production!

### Validate Required Variables

Create a script to validate configuration:

```bash
#!/bin/bash
# validate-env.sh

REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "NEXTAUTH_URL"
  "NEXTAUTH_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
done

echo "All required environment variables are set"
```

---

## See Also

- [Auto Setup Guide](./AUTO_SETUP.md) - Automatic admin user creation
- [Docker Setup](./DOCKER_SETUP.md) - Docker deployment guide  
- [Redis Setup](./REDIS_SETUP.md) - Redis configuration for job queues
- [Database Schema](../developer/DATABASE_SCHEMA_MASTER.md) - Database structure
- [Quick Start](../QUICK_START.md) - Development setup guide
