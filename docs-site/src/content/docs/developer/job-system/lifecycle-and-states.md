---
title: Job Lifecycle & States
description: Canonical lifecycle for async jobs, including status transitions and control actions
---

# Job Lifecycle & States

This page is the source of truth for how jobs move through states in Cocoa Canvas.

## Lifecycle Overview

```text
pending -> processing -> completed
    |         |  ^
    |         v  |
    |       paused
    |         |
    +-------> cancelled

processing -> failed
paused -> failed
pending -> failed
```

## Job States

| State | Meaning |
|---|---|
| `pending` | Job record exists and is waiting to run |
| `processing` | Worker is actively running the job |
| `paused` | Job is intentionally paused and can be resumed |
| `completed` | Job finished successfully |
| `failed` | Job finished with an unrecoverable error |
| `cancelled` | Job was cancelled by user/system action |

## Control Actions

Supported actions:

- `pause`
- `resume`
- `cancel`

Notes:
- `pause` is valid for `pending` and `processing` jobs.
- `resume` is valid only for `paused` jobs.
- `cancel` is valid for `pending`, `processing`, and `paused` jobs.

## Progress Semantics

Progress is derived in this order:

1. `outputStats` file-based progress (for example bytes processed)
2. Fallback to `processedItems / totalItems`
3. For active jobs, progress is capped at `99%` until terminal status
4. Terminal states (`completed`, `failed`, `cancelled`) return `100%`

## API Surface for Lifecycle Monitoring

See [Jobs API](/developer/api-reference/jobs/) for endpoint definitions and request/response contracts.

## Queue-backed Job Creation

Geocoding work is queue-backed. See [Jobs API](/developer/api-reference/jobs/) for the creation endpoint and payload.

## Recovery Behavior

On startup, recovery logic scans jobs in `pending` and `processing` for supported job types and attempts to requeue/recover as appropriate.

- Recovered jobs are moved back to `pending` and re-enqueued.
- Incomplete payloads are marked as failed when recovery cannot proceed.
