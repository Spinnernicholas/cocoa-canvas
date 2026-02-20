# Job System Documentation Reorganization Plan

## Scope
Reorganize job-system documentation across:
- `cocoa-canvas` implementation/docs (source of truth for behavior)
- `docs-site` public docs (admin + developer audience)

Goal: make docs accurate, navigable, and role-oriented while removing contradictory or stale pages.

---

## 1) Current-State Findings (from code + docs review)

## Job system behavior in code (current)
- Dual system is real and active:
  - Prisma `Job` table for user-facing status/progress/errors
  - BullMQ + Redis for queueing/worker processing and recovery
- Workers + scheduler start at app startup in `cocoa-canvas/instrumentation.ts`.
- Startup recovery exists (`recoverJobsOnStartup`) for `pending`/`processing` jobs.
- Job statuses in active code include: `pending`, `processing`, `paused`, `completed`, `failed`, `cancelled`.
- Job control endpoint exists: pause/resume/cancel (`/api/v1/jobs/[id]/control`).
- Queue health/status endpoint exists (`/api/v1/admin/jobs/redis-status`).

## Documentation issues identified
1. **Contradiction in worker status**
   - `docs-site/src/content/docs/developer/job-system-verification.md` says “No Background Worker” as a limitation.
   - Current code has active workers/scheduler/recovery.

2. **Fragmented job docs across audiences**
   - Admin jobs docs: `admin/jobs/index.md`, `admin/jobs/overview.md`, `admin/jobs/geocoding-households.md`
   - Developer jobs docs: `developer/job-system-verification.md`, `developer/job-system-geocoding.md`
   - Job-related details also scattered in import architecture and Redis docs.

3. **Competing geocoding job entry points created doc ambiguity**
   - `POST /api/v1/jobs/geocoding` is now the canonical queue-backed path with BullMQ payload and mode (`static`/`dynamic`).
   - Docs must clearly define this as the only supported path.

4. **Broken or misleading links in docs-site**
   - Links to non-existent `developer/api/jobs` page.
   - Many references use old names/casing (`DATABASE_SCHEMA_MASTER.md`, direct links to repo paths from docs pages).

5. **Mixed “verification report” vs durable docs**
   - `job-system-verification.md` reads like point-in-time test report, but is presented in long-lived developer docs.

---

## 2) Reorganization Goals

1. **Single source of truth by audience**
   - Admin docs = operational usage and troubleshooting.
   - Developer docs = architecture, lifecycle, extension, and API contract details.

2. **Canonical job lifecycle and endpoint story**
   - One clearly documented lifecycle model and supported status transitions.
   - One canonical geocoding enqueue path documented (plus note on compatibility/legacy route if retained).

3. **Remove stale/contradictory statements**
   - Especially around workers, retries, and resilience.

4. **Reference-first navigation**
   - Add explicit API/reference pages so admin pages stop linking to non-existent endpoints.

5. **Reduce duplication**
   - Keep deep technical content in one place, link from other pages.

---

## 3) Proposed Information Architecture (docs-site)

## Admin & Deployment (operator-facing)
### Keep / Create
- `admin/jobs/index.md` → **Jobs (landing)**
- `admin/jobs/overview.md` → **Jobs Overview (operator view)**
- `admin/jobs/geocoding-households.md` → **Geocode Households Runbook**
- **New:** `admin/jobs/troubleshooting.md`
- **New:** `admin/jobs/monitoring.md` (UI + API monitoring + Redis status endpoint)

### Content boundaries
- Focus on “how to run, monitor, recover, troubleshoot”.
- No deep implementation internals beyond what operators need.

## Developer Guide (engineering-facing)
### Replace current job docs with a cohesive set
- **New:** `developer/job-system/architecture.md`
- **New:** `developer/job-system/lifecycle-and-states.md`
- **New:** `developer/job-system/queues-and-workers.md`
- **New:** `developer/job-system/recovery-and-resilience.md`
- **New:** `developer/job-system/extending-job-types.md`
- **New:** `developer/job-system/geocoding-flow.md`
- **New:** `developer/job-system/api-reference.md`

### Deprecate / move
- `developer/job-system-verification.md` → move to planning/archive style page (or remove from sidebar).
- `developer/job-system-geocoding.md` → split into `geocoding-flow.md` + API/reference sections.

## Planning
- If verification history is useful, move report-style docs to `planning/` as dated artifacts.

---

## 4) Canonical Content Model (what each page owns)

## `developer/job-system/architecture.md`
- Dual system overview (Prisma + BullMQ).
- Queue names and worker responsibilities.
- Startup wiring (`instrumentation.ts`) and dependency on `REDIS_URL`.

## `developer/job-system/lifecycle-and-states.md`
- State definitions: `pending`, `processing`, `paused`, `completed`, `failed`, `cancelled`.
- Valid transitions and control actions (pause/resume/cancel).
- Progress calculation model (`outputStats` + fallback).

## `developer/job-system/queues-and-workers.md`
- Queue config defaults (attempts/backoff/removeOn*).
- Worker concurrency model and central worker pool.
- Scheduled jobs scheduler model.

## `developer/job-system/recovery-and-resilience.md`
- Startup recovery flow.
- Canonicalization of job types (`voter_import`/`import_voters`, etc.).
- What is requeued vs failed vs skipped.

## `developer/job-system/geocoding-flow.md`
- Explicitly document **current canonical trigger path** (to be decided by code owners).
- Document alternate route as compatibility path if still exposed.
- Show payloads, limits, and edge cases.

## `developer/job-system/api-reference.md`
- Consolidate all job endpoints with auth requirements and response examples:
  - `/api/v1/jobs`
  - `/api/v1/jobs/[id]`
  - `/api/v1/jobs/[id]/progress`
  - `/api/v1/jobs/[id]/control`
  - `/api/v1/jobs/geocoding`
  - `/api/v1/admin/jobs/redis-status`
  - geocoding enqueue endpoint if officially supported

## `admin/jobs/troubleshooting.md`
- Stuck processing, failed jobs, queue unavailable, worker startup issues.
- Operator commands and recovery actions.

## `admin/jobs/monitoring.md`
- Jobs page interpretation.
- Polling cadence recommendation.
- Redis/BullMQ health endpoint usage and expected healthy signals.

---

## 5) File-Level Reorganization Plan

## Phase A — Build new structure
1. Add new developer folder: `docs-site/src/content/docs/developer/job-system/`
2. Add 7 new developer pages listed above.
3. Add admin pages:
   - `docs-site/src/content/docs/admin/jobs/troubleshooting.md`
   - `docs-site/src/content/docs/admin/jobs/monitoring.md`

## Phase B — Migrate and prune
4. Migrate accurate content from:
   - `developer/job-system-geocoding.md`
   - `admin/jobs/overview.md`
   - `admin/jobs/geocoding-households.md`
5. Rewrite/remove contradictory sections in `developer/job-system-verification.md`.
6. Either:
   - Move verification report to `planning/job-system-verification-2026-02.md`, or
   - Keep file but mark as historical snapshot and remove from developer nav prominence.

## Phase C — Fix links and navigation
7. Replace broken links like `/developer/api/jobs/` with new `developer/job-system/api-reference` path.
8. Update references to database schema page names (use existing lowercase slug naming).
9. Ensure all admin job pages cross-link to one canonical API reference.

## Phase D — Consistency pass
10. Normalize terminology:
   - “voter_import” vs “import_voters” (document aliases + preferred canonical term)
   - “geocode_households” vs “geocoding”
11. Standardize examples to realistic current responses.
12. Add “Last verified” date in technical pages.

---

## 6) Specific accuracy corrections to include

1. Remove claims that no worker exists.
2. Document `paused` and `cancelled` as first-class statuses.
3. Document `POST /api/v1/jobs/[id]/control` for pause/resume/cancel.
4. Document startup worker/scheduler/recovery behavior.
5. Keep geocoding docs aligned to the single canonical endpoint.
6. Clarify auth expectations per endpoint (some are currently unauthenticated, like progress).

---

## 7) Risks and Mitigations

- **Risk:** Keeping both geocoding enqueue routes undocumented causes future drift.
  - **Mitigation:** Pick one canonical route in docs; mark the other as compatibility/internal.

- **Risk:** Stale examples break trust.
  - **Mitigation:** Base every example payload on current route implementations.

- **Risk:** Duplicate explanations reappear.
  - **Mitigation:** “One owner page per concept” + link-out model.

---

## 8) Execution Checklist (implementation order)

1. Create new developer `job-system/` section and API reference page first.
2. Update admin jobs landing/overview to link to new canonical references.
3. Add troubleshooting + monitoring runbooks.
4. Migrate geocoding technical details to developer geocoding-flow page.
5. Archive or reframe verification report as historical.
6. Run full link check in docs-site and fix broken paths.
7. Final editorial pass for terminology and status/state consistency.

---

## 9) Definition of Done

- No contradictory statements about worker/queue reality.
- No broken job-doc links.
- Admin pages are task-oriented and concise.
- Developer pages provide complete architecture + endpoint reference.
- Geocoding enqueue path is explicitly canonicalized in docs.
- Historical verification content is clearly marked as historical or archived.
