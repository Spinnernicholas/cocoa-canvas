---
title: Recovery & Resilience
description: Startup recovery, requeue behavior, and failure handling
---

# Recovery & Resilience

## Startup Recovery

At startup, recovery scans DB jobs with status:
- `pending`
- `processing`

for supported types and attempts recovery in `cocoa-canvas/lib/queue/recovery.ts`.

## Recovery Outcomes

Recovery tracks outcomes as:
- `requeued`
- `failed`
- `skipped`

Summary fields include scanned count and recovered/requeued totals.

## Processing Recovery Behavior

For supported processing jobs, recovery generally:
1. Resets status to `pending`
2. Clears/updates runtime timestamps
3. Adds recovery metadata in job data
4. Re-enqueues queue work

If required payload fields are missing, jobs are marked failed with diagnostic errors.

## Cancellation & Pause Resilience

Lifecycle controls are documented in [Jobs API](/developer/api-reference/jobs/).

Supported actions:
- `pause`
- `resume`
- `cancel`

For queued pending jobs, control logic removes queued BullMQ entries when applicable.

## Error Log Strategy

Job errors are appended as structured entries in `Job.errorLog` and capped to prevent unbounded growth.
