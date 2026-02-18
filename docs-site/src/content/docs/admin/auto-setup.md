---
title: Auto-Setup Feature Documentation
---

# Auto-Setup Feature Documentation

## Overview

The Cocoa Canvas application now supports automatic setup via environment variables. This feature allows the initial admin user to be created automatically without using the web-based setup wizard, making it ideal for containerized deployments (Docker), CI/CD pipelines, and automated infrastructure provisioning.

## How It Works

When the application starts:

1. The health check endpoint (`/api/health`) verifies if setup is needed (no users in database)
2. If setup is needed AND the required environment variables are configured, the application automatically creates the admin user
3. Subsequent requests will see that setup is complete and can proceed normally

## Environment Variables

### Required Variables

- **`ADMIN_EMAIL`**: Email address for the initial admin user
  - Example: `admin@example.com`
  - Must be a valid email format
  - Will be normalized to lowercase

- **`ADMIN_PASSWORD`**: Password for the initial admin user
  - Minimum 8 characters
  - Must contain:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character (!@#$%^&*)
  - Example: `SecurePass123!`

### Optional Variables

- **`ADMIN_NAME`**: Display name for the admin user
  - Default: `"Admin"`
  - Example: `John Doe`

- **`AUTO_SETUP_ENABLED`**: Enable/disable auto-setup
  - Default: `true` (auto-setup is enabled if email and password are provided)
  - Set to `"false"` to disable auto-setup even if env vars are configured
  - Example: `AUTO_SETUP_ENABLED=false`

## Usage Examples

### Docker Deployment

```dockerfile
ENV ADMIN_EMAIL=admin@example.com \
    ADMIN_PASSWORD=SecurePass123! \
    ADMIN_NAME="System Administrator" \
    AUTO_SETUP_ENABLED=true
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./prisma/data/cocoa_canvas.db
      - ADMIN_EMAIL=admin@example.com
      - ADMIN_PASSWORD=SecurePass123!
      - ADMIN_NAME=Administrator
      - AUTO_SETUP_ENABLED=true
```

### .env File

```dotenv
# Application
NODE_ENV=production
DATABASE_URL=file:./prisma/data/cocoa_canvas.db

# Auto-Setup (will create admin user on first run)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePass123!
ADMIN_NAME=Administrator
AUTO_SETUP_ENABLED=true
```

### Development Environment

```bash
# Manually set env vars before running the app
export ADMIN_EMAIL="dev@example.com"
export ADMIN_PASSWORD="DevPass123!"
export ADMIN_NAME="Developer"

cdnpm run dev
```

## API Endpoints

### 1. Health Check with Auto-Setup

**Endpoint:** `GET /api/health`

**Purpose:** Check application health and attempt auto-setup if needed

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T12:34:56.789Z",
  "version": "0.1.0",
  "setup": {
    "needed": false,
    "autoSetupAttempted": true,
    "autoSetupCompleted": true
  }
}
```

### 2. Auto-Setup Status

**Endpoint:** `GET /api/v1/auth/auto-setup`

**Purpose:** Check if auto-setup is configured (without performing setup)

**Response (Auto-setup configured):**
```json
{
  "success": true,
  "message": "Auto-setup is configured and ready to be triggered",
  "completed": false
}
```

**Response (Auto-setup not configured):**
```json
{
  "success": true,
  "message": "Auto-setup is not configured",
  "completed": false
}
```

### 3. Trigger Auto-Setup

**Endpoint:** `POST /api/v1/auth/auto-setup`

**Purpose:** Manually trigger auto-setup (if set up hasn't run yet)

**Response (Success):**
```json
{
  "success": true,
  "message": "Admin user created successfully via auto-setup",
  "completed": true,
  "user": {
    "id": "unique-id",
    "email": "admin@example.com",
    "name": "Administrator"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Setup already complete):**
```json
{
  "success": false,
  "message": "Setup already completed - users exist in database",
  "completed": false,
  "error": null
}
```

## Setup Page Behavior

The setup page (`/setup`) now intelligently handles auto-setup:

1. **Shows Loading State**: Checks if setup is needed when the page loads
2. **Shows Setup Complete Message**: If setup was already completed (via auto-setup), shows a confirmation and redirects to login after 2 seconds
3. **Shows Auto-Setup Available Message**: If auto-setup environment variables are configured, displays a notification
4. **Shows Form**: Only shows the manual setup form if setup is actually needed and auto-setup is not available

## Security Considerations

- **Environment Variables are Sensitive**: Do not commit `.env` files with credentials to version control
- **Password Requirements**: The password will be validated against strength requirements; weak passwords will be rejected
- **Setup occurs Once**: Once the initial user is created, subsequent auto-setup attempts will fail gracefully
- **Auto-Setup Disabled by Default in Non-Prod**: For production deployments, ensure environment variables are provided securely (via Docker secrets, CI/CD secrets, environment variable managers, etc.)

## Troubleshooting

### Auto-setup didn't trigger

**Check:**
- [x] Both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set
- [x] `AUTO_SETUP_ENABLED` is not set to `"false"`
- [x] The database doesn't already contain users
- [x] The password meets strength requirements (8+ chars, uppercase, lowercase, number, special char)

### "Setup already completed" message after auto-setup failed

**Solution:**
- Delete the database file (e.g., `prisma/data/cocoa_canvas.db`)
- Restart the application

### Invalid email error

**Check:**
- The email format is valid (e.g., `user@example.com`)
- The email doesn't contain spaces or invalid characters

## Scenario Examples

### Scenario 1: First Run with Auto-Setup Disabled

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are NOT set:
1. App starts without attempting auto-setup
2. User navigates to `/setup` to create admin account manually
3. After form submission, admin user is created and user is redirected to dashboard

### Scenario 2: Docker Deployment with Auto-Setup

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are provided:
1. Container starts
2. Health check detects no users exist
3. Auto-setup creates admin user automatically
4. App is ready to use without manual setup
5. User can log in immediately with provided credentials

### Scenario 3: Auto-Setup with Disabled Feature Flag

If `AUTO_SETUP_ENABLED="false"` even with email/password set:
1. App ignores environment variables
2. User must complete manual setup via web form
3. Useful for testing manual setup flow even when env vars are available

## Integration with CI/CD

```yaml
# Example GitHub Actions workflow
env:
  ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
  ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
  ADMIN_NAME: "CI/CD Admin"
  AUTO_SETUP_ENABLED: true

steps:
  - name: Start Application
    run: npm start
```

## Future Enhancements

Potential improvements for future versions:
- Support for creating additional users via environment variables
- Role-based auto-setup (admin, editor, viewer)
- Configuration file support (YAML/JSON)
- Multiple admin user creation
- Organization/tenant setup via environment
