---
title: Job System Architecture
description: How Prisma, BullMQ, workers, and startup hooks fit together
---

# Job System Architecture

Cocoa Canvas uses a dual-layer async job design:

1. **Prisma `Job` table** for user-visible lifecycle/progress/errors.
2. **BullMQ + Redis** for queueing, retries, scheduling, and worker execution.

## Core Components

- **Runner utilities**: `cocoa-canvas/lib/queue/runner.ts`
  - Create jobs, state transitions, progress/error updates.
- **Queue definitions**: `cocoa-canvas/lib/queue/bullmq.ts`
  - Queue names, default attempts/backoff, queue events.
- **Workers**: `cocoa-canvas/lib/queue/worker.ts`
  - Import, geocode, scheduled processors with central slot control.
- **Scheduler**: `cocoa-canvas/lib/queue/scheduler.ts`
  - Cron + poll fallback for scheduled jobs.
- **Recovery**: `cocoa-canvas/lib/queue/recovery.ts`
  - Requeue/recover pending or interrupted work on startup.
- **Startup integration**: `cocoa-canvas/instrumentation.ts`
  - Starts scheduler/workers and invokes recovery.

## Queue Names

- `voter-import`
- `geocode-households`
- `scheduled-jobs`
- `generic`

## Job Type Notes

The code currently recognizes aliases in recovery/control logic:

- Import: `voter_import` and `import_voters`
- Geocoding: `geocoding` and `geocode_households`

Prefer stable naming in new code and document alias behavior where needed.
