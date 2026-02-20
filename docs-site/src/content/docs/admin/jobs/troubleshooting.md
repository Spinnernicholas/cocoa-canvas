---
title: Job Troubleshooting
description: Operational troubleshooting for stalled, failed, or unhealthy job processing
---

# Job Troubleshooting

## Job Stuck in `pending`

Check:
- Redis is reachable
- Workers started successfully
- Queue has waiting items

Actions:
- Verify `REDIS_URL` and app logs
- Check queue health endpoint in [Jobs API](/developer/api-reference/jobs/)
- Restart service if workers failed to initialize

## Job Stuck in `processing`

Check:
- Whether `processedItems` or `outputStats` is changing
- Processor/provider availability
- Recent errors in job `errorLog`

Actions:
- Wait if progress continues
- Pause/cancel if stalled via lifecycle controls in [Jobs API](/developer/api-reference/jobs/)
- Retry with narrower filters or lower limit

## High Failure Rate

Common causes:
- Invalid import/geocode inputs
- External provider rate limits or outages
- Environment/config drift

Actions:
- Inspect representative failed job payloads
- Reduce batch/workload size
- Validate provider configuration

## Redis/BullMQ Unhealthy

Check:
- `redis.connected`
- `bullmq.healthy`
- Worker activity and queue counts

Actions:
- Restore Redis connectivity
- Restart app workers
- Re-run recovery endpoint/process after stability returns

## Resume/Cancel Controls

Use lifecycle controls described in [Jobs API](/developer/api-reference/jobs/).

Status constraints apply; consult lifecycle docs for valid transitions.

## Related

- [Job Monitoring](/admin/jobs/monitoring/)
- [Job Lifecycle (Developer)](/developer/job-system/lifecycle-and-states/)
- [Job API Reference](/developer/job-system/api-reference/)
