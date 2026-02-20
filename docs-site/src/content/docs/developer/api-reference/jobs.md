---
title: Jobs API
description: Endpoints for creating, monitoring, and controlling jobs
sidebar:
  order: 1000
---

# Jobs API

## Core Job Endpoints

### `GET /api/v1/jobs`
List jobs with optional filters: `type`, `status`, `createdById`, `limit`, `offset`.

### `POST /api/v1/jobs`
Create a generic job row.

Body:

```json
{
  "type": "string",
  "data": {},
  "isDynamic": false
}
```

### `GET /api/v1/jobs/{id}`
Get a job with parsed payloads and computed progress.

### `DELETE /api/v1/jobs/{id}`
Cancel a job when status allows cancellation.

### `GET /api/v1/jobs/{id}/progress`
Lightweight progress payload for polling.

### `POST /api/v1/jobs/{id}/control`
Control job lifecycle.

Body:

```json
{ "action": "pause" }
```

Allowed actions:
- `pause`
- `resume`
- `cancel`

## Geocoding Job Creation

### `POST /api/v1/jobs/geocoding`
Create and enqueue geocoding work.

Body:

```json
{
  "filters": {
    "city": "Concord",
    "state": "CA"
  },
  "limit": 10000,
  "skipGeocoded": true,
  "providerId": "nominatim",
  "mode": "static"
}
```

## Admin Queue Health Endpoint

### `GET /api/v1/admin/jobs/redis-status`
Returns Redis connectivity, queue counts, and worker health snapshot.

## Related

- [Job Lifecycle & States](/developer/job-system/lifecycle-and-states/)
- [Queues & Workers](/developer/job-system/queues-and-workers/)
