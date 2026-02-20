---
title: Queues & Workers
description: Queue configuration, worker execution model, and concurrency behavior
---

# Queues & Workers

## Queue Defaults

Queue defaults are defined in `cocoa-canvas/lib/queue/bullmq.ts`.

Typical defaults:
- Attempts and exponential backoff per queue
- `removeOnComplete: true`
- `removeOnFail: false`

These settings preserve failed jobs for inspection while minimizing Redis growth for successful jobs.

## Worker Startup

Workers start via `startWorkers()` in `cocoa-canvas/lib/queue/worker.ts` during app startup.

If `REDIS_URL` is missing, queue-based features are skipped.

## Concurrency Model

Workers use a central pool with:
- Global max workers (`maxWorkers`)
- Per-type limits (`importWorkers`, `geocodeWorkers`, `scheduledWorkers`)

Config is loaded from `Setting` key `jobs_config` with defaults in `cocoa-canvas/lib/queue/config.ts`.

## Scheduled Jobs

`cocoa-canvas/lib/queue/scheduler.ts` handles:
- Cron-triggered execution
- Poll fallback every 60s for overdue jobs
- Enqueueing into `scheduled-jobs` queue

## Queue Health

Queue/worker health endpoint details are documented in [Jobs API](/developer/api-reference/jobs/).
