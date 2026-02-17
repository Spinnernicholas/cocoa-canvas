# Cocoa Canvas - Authentication & Security Plan

## Overview

Voter data is sensitive. Cocoa Canvas implements layered security with a focus on **simplicity for self-hosted deployments** while maintaining enterprise-grade protection for raw voter information.

Design principle: **Secure by default, with reasonable defaults that work for small orgs.**

**NOTE**: This document describes the *complete* authentication vision. See **PHASE_PLAN.md** for which features are implemented in each phase:
- **Phase 1**: Local email/password auth only (bcrypt)
- **Phase 2+**: Optional OAuth, optional MFA, optional LDAP (all deferred)

---

## Authentication Architecture

### Core Authentication System

**Technology**: NextAuth.js v5 (App Router compatible)

**Why NextAuth.js?**
- Built for Next.js, minimal setup overhead
- Supports multiple auth providers out of the box
- Session management integrated with Next.js
- No separate auth service needed (self-hosted)
- Production-ready security defaults

### Authentication Methods

#### Method 1: Local Credentials (Default for Self-Hosted)
**Best for**: Single organization, offline-capable, private deployments

```
Implementation:
- Email/password authentication
- Passwords hashed with bcrypt (12+ rounds)
- Optional 2FA via TOTP (Google Authenticator, Authy)
- No third-party dependency
```

**Setup**:
```bash
# Users created in database with secure password hashing
npx prisma studio  # or CLI command to create first admin user
```

#### Method 2: OAuth Providers (Optional)
**Best for**: Organizations with existing SSO infrastructure

```
Supported:
- Google OAuth (easiest for small groups)
- GitHub (for developer-friendly orgs)
- Microsoft Azure AD (enterprise)
- Custom OIDC provider
```

**Easy setup** via environment variables:
```
GOOGLE_ID=<your-oauth-id>
GOOGLE_SECRET=<your-oauth-secret>
```

#### Method 3: LDAP/Active Directory (Advanced)
**Best for**: Organizations already using LDAP/AD

```
Implementation:
- ldapjs or similar for authentication
- Optional: sync user roles from LDAP groups
- Falls back to local credentials if LDAP unavailable
```

---

## Authorization & Role-Based Access Control

### Database Schema

Schema definitions are centralized in the master reference:

- [Master Database Schema](../developer/DATABASE_SCHEMA_MASTER.md)

### Default Roles & Permissions

#### Admin
- All permissions
- User management
- System configuration
- Full audit log access

#### Campaign Manager
- Create/edit campaigns
- View all voters in assigned campaigns
- Export voter lists
- Assign canvassers
- View campaign results

#### Canvasser
- View assigned voters only
- Enter survey responses
- View own assignment history
- Cannot export or edit voters

#### Viewer
- Read-only access to aggregated data
- Cannot see individual voter records
- Cannot export

#### Auditor
- Read-only access to audit logs
- View system activity
- Cannot access voter data

---

## Data Access Control

### Voter Record Visibility

**Default field masking by role**:

| Field | Admin | Manager | Canvasser | Viewer |
|-------|-------|---------|-----------|--------|
| Name | ✓ | ✓ | ✓ | ✗ |
| Address | ✓ | ✓ | ✓ | ✗ |
| Phone | ✓ | ✓ | Masked | ✗ |
| Email | ✓ | ✓ | Masked | ✗ |
| Voter ID | ✓ | ✓ | ✓ | ✗ |
| Precinct | ✓ | ✓ | ✓ | ✓* |
| Survey Response | ✓ | ✓ | ✓ | ✓* |
| Demographics | ✓ | ✓ | Limited | ✗ |

*Aggregated data only

### Query-Level Access Control

```typescript
// Example: Automatically filter voters based on user's campaign/precinct access
async function getVisibleVoters(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: true, permissions: true }
  });
  
  // Build permission-based query
  const query: any = {};
  
  if (!user.roles.some(r => r.name === 'admin')) {
    // Non-admins: filter by assigned campaigns/precincts
    query.assignments = {
      some: { userId }
    };
  }
  
  return db.voter.findMany({ where: query });
}
```

---

## Session Security

### Session Management

```env
# NextAuth configuration (.env.local)

# Core
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000  # For Docker

# Session
NEXTAUTH_SESSION_MAX_AGE=1800             # 30 minutes
NEXTAUTH_SESSION_IDLE_TIMEOUT=900         # 15 minutes idle
NEXTAUTH_SESSION_UPDATE_AGE=86400         # Allow refresh for 24h

# Cookies (secure by default in production)
NEXTAUTH_SECURE=true                      # Require HTTPS
NEXTAUTH_SAME_SITE=strict                 # CSRF protection
NEXTAUTH_HTTP_ONLY=true                   # JS cannot access cookie
```

### Session Features

- **Short-lived tokens**: 30-minute default, refreshable for 24 hours
- **Automatic logout**: Inactivity triggers logout + re-auth required
- **Session invalidation**: On password change, role update, or admin logout
- **Device tracking**: Optional session per device, view active sessions
- **Re-auth for sensitive operations**:
  - Data export
  - Bulk operations
  - User management
  - Settings changes

---

## Multi-Factor Authentication (Optional but Recommended)

### Implementation

**Technology**: TOTP (Time-based One-Time Password)
- Uses Google Authenticator, Authy, or similar
- No SMS dependency (better for offline/private deployments)
- Can be optional for canvassers, mandatory for admins

### Setup Flow

```
1. User enables MFA in settings
2. Server generates secret key
3. User scans QR code with authenticator app
4. User confirms by entering 6-digit code
5. Server stores encrypted secret in database
6. On login, prompts for TOTP code before session creation
```

### Configuration

```env
# .env.local
MFA_ENABLED=true                          # Enable MFA feature
MFA_REQUIRED_FOR_ROLES=admin,manager      # Mandatory for these roles
MFA_OPTIONAL_FOR_ROLES=canvasser,viewer   # Optional for these roles
```

---

## Data Encryption

### At Rest

**Sensitive fields encrypted in database**:

```prisma
// Additional encryption for extra-sensitive data
model VoterPII {
  id            String   @id
  voterId       String   @unique
  
  // Encrypted in database
  phone         String   @db.VarChar(255)  // Encrypted
  email         String   @db.VarChar(255)  // Encrypted
  ssn           String?  @db.VarChar(255)  // Encrypted if stored
  
  // Encryption key management
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Implementation**:
```typescript
// Use encryptjs or libsodium for field-level encryption
import { encrypt, decrypt } from '@/lib/crypto';

// Encrypt on save
const encrypted = encrypt(plaintext, encryptionKey);

// Decrypt on read (with permission check first)
const decrypted = decrypt(encrypted, encryptionKey);
```

### In Transit

- HTTPS/TLS enforced in production
- HSTS headers (Strict-Transport-Security)
- Certificate pinning optional for high-security deployments

### Database Backups

- Encrypted backups with separate key
- Access restricted to admin only
- Encryption key stored separately from backup
- Automated backup retention policy

---

## Audit Logging

### What Gets Logged

```typescript
// Every action on sensitive data
- User login/logout (success + failure)
- Voter record viewed (with fields accessed)
- Voter data exported
- Bulk operations (mass tagging, assignment)
- Data imports (file + user)
- Campaign created/modified/deleted
- User role/permission changes
- System configuration changes
- Database backups
- Failed authentication attempts
```

### Audit Log Schema

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  action      String   // Standard action names
  resource    String   // Type of resource
  resourceId  String   // ID of resource
  
  // What changed
  changes     Json?    // { field: { before, after, ... } }
  
  // Context
  ipAddress   String?
  userAgent   String?
  status      String?  // success, failure, partial
  
  createdAt   DateTime @default(now())
  
  // Retention: default 90 days, configurable
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

### Audit Log Views

```
Dashboard views for admins:
- Recent activity feed
- User activity timeline
- Data access reports
- Failed login attempts
- Export audit trail
- System change log
```

---

## Compliance & Privacy

### GDPR/Privacy Law Compliance

**Built-in features**:

```typescript
// Right to be forgotten (data deletion)
async function deleteVoterData(voterId: string, userId: string) {
  // Verify user has permission
  // Create audit log of deletion
  // Delete voter records
  // Keep audit trail (for compliance)
}

// Data export (GDPR/CCPA)
async function exportUserData(userId: string) {
  // Return all personal data about this user
  // In machine-readable format (JSON)
}

// Privacy policy acknowledgement
// Terms of service acceptance required on first login
```

### State Voter File Laws

**Considerations**:
- Voter data is public record, but usage is regulated
- Cannot use for unlawful/discriminatory purposes
- Must comply with state-specific restrictions
- Audit trails protect against misuse claims

**Documentation**:
- Clear terms of service about legal use
- State-specific compliance guides in docs
- Admins must acknowledge responsibility

---

## Phase 1 Implementation: Local Auth Only

Phase 1 implements **local email/password authentication only** - no OAuth, LDAP, or MFA.

### Setup (Phase 1)

```bash
# 1. Clone repo
git clone https://github.com/cocoa-county/cocoa-canvas.git
cd cocoa-canvas

# 2. Copy environment template
cp .env.example .env.local

# 3. Generate secure secrets (one-time)
openssl rand -base64 32  # Copy to NEXTAUTH_SECRET

# 4. Start with Docker
docker-compose up

# 5. App detects empty DB, redirects to /setup
# 6. Setup wizard: Create admin account (email + password)
# 7. Login at http://localhost:3000
```

**Phase 1 features**:
- ✓ Email/password with bcrypt hashing
- ✓ Session management (JWT tokens)
- ✓ Secure cookie storage
- ✓ Login/logout
- ✓ Account lockout on failed attempts

**Deferred to Phase 2+**:
- ✗ OAuth (Google, GitHub, etc.)
- ✗ MFA / TOTP
- ✗ LDAP / Active Directory

### Future: OAuth Setup (Phase 2+)

```bash
# Create OAuth app at console.cloud.google.com
# - Authorized redirect: http://localhost:3000/api/auth/callback/google

# Add to .env.local
GOOGLE_ID=<your-id>
GOOGLE_SECRET=<your-secret>
```

### Future: MFA Setup (Phase 2+)

```bash
# 1. Update .env.local
MFA_ENABLED=true
MFA_REQUIRED_FOR_ROLES=admin

# 2. Restart - Users see MFA option in account settings
```

### Backup & Restore

```bash
# Automated backups (with encryption key stored separately)
docker-compose exec db pg_dump -U postgres cocoa_canvas > backup.sql.enc

# Restore
cat backup.sql.enc | docker-compose exec -T db psql -U postgres cocoa_canvas
```

---

## Security Hardening Checklist

### Development
- [ ] NEXTAUTH_SECRET is unique (generated with openssl)
- [ ] Database password is strong (20+ chars)
- [ ] HTTPS enforced in production config
- [ ] CORS properly configured (same-origin only)

### Deployment
- [ ] Firewall rules restrict DB access to app only
- [ ] Secrets in `.env.local` NOT in git/Docker image
- [ ] Regular backups with encryption keys stored separately
- [ ] Log rotation configured (audit logs don't bloat disk)
- [ ] Database encryption enabled
- [ ] HSTS headers enabled

### Ongoing
- [ ] Weekly backup verification
- [ ] Monthly audit log review
- [ ] Quarterly security updates (Next.js, dependencies)
- [ ] Annual penetration test review
- [ ] User access reviews (remove stale accounts)

---

## Troubleshooting & Common Issues

### "Invalid authentication" errors

```bash
# Check NEXTAUTH_SECRET is set and consistent
echo $NEXTAUTH_SECRET

# Ensure database connection works
docker-compose logs web  # Look for DB connection errors
```

### Lost admin password

```bash
# Reset via direct database access
docker-compose exec db psql -U postgres cocoa_canvas

# Direct query (warning: bypass security)
UPDATE "User" SET "passwordHash" = '<run-cli-to-hash-new-password>' WHERE email='admin@example.com';
```

### Sessions not persisting

```bash
# Check NEXTAUTH_URL matches your deployment URL
# Verify cookies are being set (browser DevTools > Application > Cookies)
# In Docker, ensure NEXTAUTH_URL_INTERNAL is set
```

---

## References & Resources

- [NextAuth.js Docs](https://next-auth.js.org/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [GDPR Compliance Checklist](https://gdpr-info.eu/)
- [Consumer Privacy Laws by State](https://iapp.org/)
