---
title: Job Monitoring
description: How operators monitor queue health and job execution
---

# Job Monitoring

## Primary Monitoring Surfaces

- **Jobs UI** (`/jobs`) for status and progress
- **Job APIs** for polling specific job IDs
- **Redis/BullMQ status API** for queue and worker health

## Polling Recommendations

- Normal operations: poll every 5–10 seconds
- High-throughput imports/geocoding: poll every 2–5 seconds
- Back off polling for completed/failed/cancelled jobs

## Useful Endpoints

See [Jobs API](/developer/api-reference/jobs/) for endpoint details.

## Healthy Signals

From the queue health endpoint (see [Jobs API](/developer/api-reference/jobs/)), healthy operation usually shows:

- `redis.connected: true`
- `bullmq.healthy: true`
- `workers.activeWorkers > 0`
- Queue counts changing over time for active workloads

## Warning Signals

- Redis ping failures
- Active jobs in DB but no queue activity
- Repeated failed jobs for the same type/provider
- Long-running `processing` jobs with no progress changes

## Related

- [Job Troubleshooting](/admin/jobs/troubleshooting/)
- [Job System Overview](/admin/jobs/overview/)
- [Developer API Reference](/developer/job-system/api-reference/)
