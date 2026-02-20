---
title: Geocoding Households
description: Queue-backed geocoding operations for households
---

# Geocoding Households

Geocoding jobs convert household addresses into latitude/longitude in the background.

## Canonical Endpoint

API details are centralized in [Jobs API](/developer/api-reference/jobs/).

## Create a Geocoding Job
Use the geocoding job creation contract in [Jobs API](/developer/api-reference/jobs/).

## Request Fields
See [Jobs API](/developer/api-reference/jobs/) for field-level request/response definitions.

## Track Progress
Use the job status/progress endpoints described in [Jobs API](/developer/api-reference/jobs/).

## Operational Guidance

- Start with narrower filters before large state-wide runs.
- Use `mode: static` for deterministic input sets.
- Use Jobs UI for live status and error review.
- Use queue health endpoint guidance in [Jobs API](/developer/api-reference/jobs/).

## Troubleshooting

- Job does not start: verify auth, payload, and Redis/worker health.
- Job stalls in `processing`: inspect progress drift and provider availability.
- High failure rates: reduce limits and validate household address quality.

See:
- [Job Monitoring](/admin/jobs/monitoring/)
- [Job Troubleshooting](/admin/jobs/troubleshooting/)
- [Developer Geocoding Flow](/developer/job-system/geocoding-flow/)
