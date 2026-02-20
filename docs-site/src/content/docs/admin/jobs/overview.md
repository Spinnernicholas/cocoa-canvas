---
title: Job System Overview
description: Operator overview for background jobs, lifecycle controls, and progress tracking
---

# Job System Overview

The job system runs long operations asynchronously so the UI remains responsive.

## What Runs as Jobs

- Voter imports
- Household geocoding
- Scheduled/background maintenance work

## Lifecycle States

- `pending`
- `processing`
- `paused`
- `completed`
- `failed`
- `cancelled`

For transition details, see [Job Lifecycle & States](/developer/job-system/lifecycle-and-states/).

## API Contracts

All endpoint contracts are centralized in [Jobs API](/developer/api-reference/jobs/).

## Geocoding Job Creation

Use the queue-backed geocoding path documented in [Jobs API](/developer/api-reference/jobs/).

## Operator Workflow

1. Trigger operation (import/geocode/scheduled action).
2. Capture returned `jobId`.
3. Monitor status and progress in `/jobs` or via API.
4. Use control endpoint when pause/resume/cancel is required.
5. Inspect error logs for failed jobs and retry with narrower scope if needed.

## Monitoring and Health

- Monitor runtime with [Job Monitoring](/admin/jobs/monitoring/).
- Use [Job Troubleshooting](/admin/jobs/troubleshooting/) for incident response.
- Check Redis/BullMQ health through the endpoint documented in [Jobs API](/developer/api-reference/jobs/).

## Related

- [Geocoding Households](/admin/jobs/geocoding-households/)
- [Voter Import](/admin/voter-import/)
- [Developer Job API Reference](/developer/api-reference/jobs/)
