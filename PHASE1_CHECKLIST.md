# Phase 1 Implementation Checklist

**Goal**: Foundation layer (Docker, auth, setup wizard, dashboard, job queue) — **Weeks 1-2**

---

## ✅ COMPLETED (Infrastructure)

- [x] Docker Compose setup (SQLite dev, PostgreSQL prod)
- [x] Next.js 14 + TypeScript scaffolding
- [x] Prisma ORM with Phase 1 schema (6 tables)
- [x] Health check endpoint (`GET /api/health`)
- [x] Dev/prod mode support
- [x] Quick start documentation

---

## 🔨 PHASE 1A: AUTHENTICATION UTILITIES (3-4 hours)

### Password Hashing & Verification
- [ ] Create `lib/auth/password.ts`
  - [ ] `hashPassword(password: string)` → bcryptjs with salt=12
  - [ ] `verifyPassword(password: string, hash: string)` → boolean
  - [ ] Tests for both functions

### JWT Token Management
- [ ] Create `lib/auth/jwt.ts`
  - [ ] `generateToken(userId: string, expiresIn: string)` → JWT token
  - [ ] `verifyToken(token: string)` → payload or null
  - [ ] `refreshToken(token: string)` → new token
  - [ ] Env variables: `NEXTAUTH_SECRET`, `JWT_EXPIRY`
  - [ ] Tests for all functions

### Session Management
- [ ] Create `lib/auth/session.ts`
  - [ ] `createSession(userId: string, ipAddress?: string, userAgent?: string)` → Session
  - [ ] `getSession(token: string)` → Session or null
  - [ ] `invalidateSession(token: string)` → void
  - [ ] Cleanup expired sessions (cron job, Phase 1+)

### Auth Middleware
- [ ] Create `lib/middleware/auth.ts`
  - [ ] `withAuth(handler)` — middleware that validates JWT and injects user
  - [ ] `withoutAuth(handler)` — middleware that ensures no auth
  - [ ] Error handling for expired/invalid tokens
  - [ ] Tests for both middlewares

---

## 🔨 PHASE 1B: AUTHENTICATION ENDPOINTS (4-5 hours)

### Setup Endpoint (One-time Admin Creation)
- [ ] `POST /api/v1/auth/setup`
  - [ ] Check if admin already exists (return 403 if yes)
  - [ ] Validate email format and password strength (min 8 chars)
  - [ ] Hash password with bcryptjs
  - [ ] Create User record (isActive=true, admin)
  - [ ] Create AuditLog entry
  - [ ] Redirect flow: setup → login
  - [ ] Response: `{ success: true, message: "Admin created" }`
  - [ ] Tests

### Login Endpoint
- [ ] `POST /api/v1/auth/login`
  - [ ] Request: `{ email: string, password: string }`
  - [ ] Find User by email
  - [ ] Verify password
  - [ ] Check if user is active
  - [ ] Generate JWT token
  - [ ] Create Session record with ipAddress, userAgent
  - [ ] Create AuditLog entry (action: "login")
  - [ ] Response: `{ token: string, user: { id, email, name } }`
  - [ ] Tests

### Refresh Endpoint
- [ ] `POST /api/v1/auth/refresh`
  - [ ] Require valid JWT
  - [ ] Check session is still valid
  - [ ] Generate new token
  - [ ] Response: `{ token: string }`
  - [ ] Tests

### Logout Endpoint
- [ ] `POST /api/v1/auth/logout`
  - [ ] Require valid JWT
  - [ ] Invalidate session
  - [ ] Create AuditLog entry (action: "logout")
  - [ ] Response: `{ success: true }`
  - [ ] Tests

---

## 🎨 PHASE 1C: LOGIN PAGE & FORM (2-3 hours)

### Login Page (`/login`)
- [ ] Create `app/login/page.tsx`
  - [ ] Page layout (centered card)
  - [ ] "Cocoa Canvas" branding/logo area
  - [ ] Email input field
  - [ ] Password input field
  - [ ] "Sign In" button
  - [ ] Error messages display
  - [ ] Redirect to `/dashboard` on success
  - [ ] Redirect to `/setup` if no admin exists (check health endpoint)
  - [ ] Basic CSS/Tailwind styling

### Login Form Component
- [ ] Create `components/LoginForm.tsx`
  - [ ] Form state management (email, password, loading, error)
  - [ ] Input validation (client-side)
  - [ ] Call `POST /api/v1/auth/login`
  - [ ] Store JWT in `httpOnly` cookie (or localStorage)
  - [ ] Clear form on success
  - [ ] Display error messages
  - [ ] Disable button while submitting

### Setup Wizard (`/setup`)
- [ ] Create `app/setup/page.tsx`
  - [ ] Check if admin exists (GET `/api/v1/auth/setup`)
  - [ ] Redirect to `/login` if admin already exists
  - [ ] Show setup wizard form
  - [ ] Admin email and password inputs (with strength indicator)
  - [ ] Campaign name input
  - [ ] Campaign dates (start/end date pickers)
  - [ ] Campaign target area (text field)
  - [ ] "Create Admin & Campaign" button
  - [ ] Call `POST /api/v1/auth/setup` + `POST /api/v1/setup/campaign`
  - [ ] Redirect to `/login` on success

---

## 📊 PHASE 1D: ADMIN DASHBOARD (2-3 hours)

### Dashboard Page (`/dashboard`)
- [ ] Create `app/dashboard/page.tsx`
  - [ ] Require authentication (use `withAuth` middleware)
  - [ ] Show welcome message: "Welcome, [user name]"
  - [ ] Display current campaign card:
    - Campaign name
    - Start date, end date
    - Target area
    - Status (planning, active, paused, completed)
  - [ ] Show job queue status:
    - Total jobs
    - Pending jobs count
    - Processing jobs count
    - Completed jobs count
  - [ ] Show recent jobs list (last 5):
    - Job type, status, created date, progress
  - [ ] Links to:
    - Import voters (Phase 2)
    - Search voters (Phase 2)
    - Map (Phase 4)
    - Settings
    - Logout

### Navbar/Header Component
- [ ] Create `components/Header.tsx`
  - [ ] Logo + "Cocoa Canvas" branding
  - [ ] Current user name
  - [ ] Logout button
  - [ ] Navigation links (TBD by phase)

---

## ⚙️ PHASE 1E: JOB QUEUE (2-3 hours)

### Job Queue Runner
- [ ] Create `lib/queue/runner.ts`
  - [ ] Poll database for pending jobs (every 5 seconds)
  - [ ] Process one job at a time
  - [ ] Update job status: pending → processing → completed/failed
  - [ ] Handle job data parsing and execution
  - [ ] Log errors to errorLog field
  - [ ] Trigger based on job type (extensible)

### Job Endpoints
- [ ] `GET /api/v1/jobs`
  - [ ] List all jobs with pagination
  - [ ] Filter by status, type
  - [ ] Response: `{ jobs: Job[], total: number, page: number }`
  - [ ] Tests

- [ ] `GET /api/v1/jobs/:id`
  - [ ] Get single job with full details
  - [ ] Response: `{ job: Job }`
  - [ ] Tests

- [ ] `GET /api/v1/jobs/:id/progress`
  - [ ] Get real-time progress (for polling)
  - [ ] Response: `{ status, processedItems, totalItems, errorLog }`
  - [ ] Tests

---

## 📝 PHASE 1F: AUDIT LOGGING (1-2 hours)

### Audit Logger Utility
- [ ] Create `lib/audit/logger.ts`
  - [ ] `logAction(userId: string, action: string, resource?: string, resourceId?: string, details?: object)` → AuditLog
  - [ ] Automatically capture ipAddress, userAgent from request
  - [ ] Tests

### Middleware Integration
- [ ] Integrate audit logging into:
  - [ ] Auth endpoints (login, logout, setup)
  - [ ] Campaign creation
  - [ ] Job submission

---

## 🧪 PHASE 1G: TESTING (2-3 hours)

### Unit Tests
- [ ] `lib/auth/password.test.ts` — password hashing/verification
- [ ] `lib/auth/jwt.test.ts` — token generation/validation
- [ ] `lib/auth/session.test.ts` — session CRUD

### Integration Tests
- [ ] `app/api/v1/auth/setup.test.ts` — full setup flow
- [ ] `app/api/v1/auth/login.test.ts` — login flow
- [ ] `app/api/v1/auth/logout.test.ts` — logout flow
- [ ] `app/api/v1/jobs.test.ts` — job endpoints
- [ ] Dashboard page render test

### E2E Tests (Manual for Phase 1)
- [ ] Setup wizard flow (from /setup to /login)
- [ ] Login flow (from /login to /dashboard)
- [ ] Logout flow
- [ ] Dashboard displays campaign and job queue

---

## 📦 DELIVERABLES AT END OF PHASE 1

### Code Structure
```
app/
├── api/v1/
│   └── auth/
│       ├── setup/route.ts
│       ├── login/route.ts
│       ├── logout/route.ts
│       ├── refresh/route.ts
│   └── jobs/
│       ├── route.ts (GET list)
│       ├── [id]/route.ts (GET single)
│       ├── [id]/progress/route.ts
├── login/
│   └── page.tsx
├── setup/
│   └── page.tsx
├── dashboard/
│   └── page.tsx
├── layout.tsx
lib/
├── auth/
│   ├── password.ts
│   ├── jwt.ts
│   ├── session.ts
│   └── (tests)
├── middleware/
│   ├── auth.ts
│   └── (tests)
├── queue/
│   ├── runner.ts
│   └── (tests)
├── audit/
│   ├── logger.ts
│   └── (tests)
components/
├── LoginForm.tsx
├── SetupWizard.tsx
├── Header.tsx
├── Dashboard.tsx
├── JobQueueStatus.tsx
├── CampaignCard.tsx
```

### Database State
- User table with admin account
- Session table with active sessions
- Campaign table with initial campaign
- AuditLog table with login/logout/setup events
- Job table (empty, ready for Phase 2)

### APIs Ready
- ✅ `POST /api/v1/auth/setup`
- ✅ `POST /api/v1/auth/login`
- ✅ `POST /api/v1/auth/logout`
- ✅ `POST /api/v1/auth/refresh`
- ✅ `GET /api/v1/jobs`
- ✅ `GET /api/v1/jobs/:id`
- ✅ `GET /api/v1/jobs/:id/progress`

### UI Pages Ready
- ✅ `/setup` — One-time admin and campaign creation
- ✅ `/login` — Email/password login
- ✅ `/dashboard` — Post-login dashboard

### Definition of Done
```
✓ Docker: docker-compose up starts app
✓ Setup: Can create admin account via /setup wizard
✓ Login: Can login with email/password
✓ Dashboard: Shows campaign info and job queue
✓ Logout: Can logout securely
✓ Audit: All actions logged
✓ Tests: 80%+ code coverage for auth, job queue
✓ Git: All committed and pushed to main
```

---

## TIME ESTIMATE

- 🔐 Phase 1A (Auth utils): **3-4 hours**
- 🔌 Phase 1B (Auth endpoints): **4-5 hours**
- 🎨 Phase 1C (Login page): **2-3 hours**
- 📊 Phase 1D (Dashboard): **2-3 hours**
- ⚙️ Phase 1E (Job queue): **2-3 hours**
- 📝 Phase 1F (Audit logging): **1-2 hours**
- 🧪 Phase 1G (Testing): **2-3 hours**

**Total: ~18-24 hours (should fit in 2 weeks with other work)**

---

## Next: Start with Login Page & Form

Ready to implement the login page?
