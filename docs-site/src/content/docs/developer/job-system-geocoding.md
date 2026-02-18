---
title: Job System Verification & Architecture
description: Technical implementation details of the job system architecture
---

# Job System Implementation (Developer)

Technical documentation for the background job system architecture, including BullMQ, Redis, and Prisma integration.

## Quick Reference

### System Components

- **Prisma Job Model** - Persistent job tracking in PostgreSQL
- **BullMQ Queues** - Redis-backed job queues for background processing
- **Job Workers** - Async processors for each job type
- **Job Processor Functions** - Business logic for specific job types

### Job Types

| Type | Queue | Processor | Status Route |
|------|-------|-----------|--------------|
| `voter_import` | voter-import | processImportJob | `/api/v1/jobs/{id}` |
| `geocode_households` | geocode-households | processGeocodeJob | `/api/v1/jobs/{id}` |

## Household Geocoding Job

### Processor Location

```
lib/gis/geocode-job-processor.ts
```

### Job Data Structure

```typescript
interface GeocodeJobData {
  filters: {
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
    precinctNumber?: string;
  };
  limit?: number;
  providerId?: string;
  skipGeocoded?: boolean;
}
```

### API Endpoint

```
POST /api/v1/gis/households/geocode
```

Route: `app/api/v1/gis/households/geocode/route.ts`

### Job Lifecycle

1. **API receives request** → Validates filters and counts households
2. **Job created** → Prisma Job record with status `pending`
3. **202 response** → Returns jobId immediately
4. **Worker picks up job** → Marked as `processing`
5. **Processing loop**:
   - Fetch households in batches of 100
   - Call geocodingService.geocode() for each
   - Update household records with lat/long on success
   - Track errors in errorLog
   - Update progress every 50 households
6. **Completion** → Job marked as `completed` with final stats

### Batch Processing

- **Batch size**: 100 households per database query
- **Rate limiting**: 100ms delay between batches
- **Per-request timeout**: 5 seconds for geocoding API call
- **Fallback**: Automatically tries secondary providers on failure

### Error Handling

Errors don't stop the job - they're logged for review:

```typescript
interface GeocodeErrorLog {
  householdId: string;
  address: string;
  error: string;
  timestamp: string;
}
```

Errors stored in `Job.errorLog` as JSON string array.

### Database Schema

Geocoding updates these Household fields on success:

```prisma
model Household {
  // ... other fields ...
  
  // Set by geocoding job
  latitude: Float?
  longitude: Float?
  geocoded: Boolean @default(false)
  geocodedAt: DateTime?
  geocodingProvider: String?  // "nominatim", "locationiq", etc.
}
```

## Queue Integration

### BullMQ Configuration

```typescript
// lib/queue/bullmq.ts
export function getGeocodeQueue(): Queue<GeocodeJobData>
```

Queue settings:
- Name: `geocode-households`
- Attempts: 1 (no retries)
- Backoff: exponential, 2000ms delay
- removeOnComplete: true
- removeOnFail: false

### Worker Registration

```typescript
// lib/queue/worker.ts
const geocodeWorker = new Worker<GeocodeJobData>(
  'geocode-households',
  async (job) => { ... },
  { concurrency: 1 }
);
```

**Concurrency of 1** ensures only one geocoding job runs at a time, managing rate limits and system load.

## API Response Formats

### Create Job (202 Accepted)

```json
{
  "success": true,
  "jobId": "clm7k3p0h0000k2z1x2y3z4a5",
  "message": "Geocoding job created for 10000 households",
  "estimatedHouseholds": 10000,
  "limit": 10000,
  "processingStarted": true
}
```

### Get Job Status

```json
{
  "id": "clm7k3p0h0000k2z1x2y3z4a5",
  "type": "geocode_households",
  "status": "processing",
  "totalItems": 10000,
  "processedItems": 2500,
  "data": "{...geocode job data...}",
  "errorLog": null,
  "createdBy": {
    "id": "user123",
    "email": "admin@example.com",
    "name": "Admin User"
  },
  "createdAt": "2026-02-18T10:30:00Z",
  "startedAt": "2026-02-18T10:30:05Z",
  "completedAt": null
}
```

### Error Response (400)

```json
{
  "error": "At least one filter must be provided...",
  "supportedFilters": ["city", "state", "zipCode", "county", "precinctNumber"]
}
```

## Geocoding Service

### Current Status

The geocoding service is a stub/placeholder in:

```
lib/geocoding/index.ts
lib/geocoding/types.ts
lib/geocoding/registry.ts
```

See [GEOCODING_PLAN.md](../../lib/geocoding/GEOCODING_PLAN.md) for full implementation roadmap including 6+ free provider integrations.

### Expected Interface

```typescript
class GeocodingService {
  async geocode(
    request: GeocodeRequest,
    options?: {
      providerId?: string;
      useFallback?: boolean;
      timeout?: number;
    }
  ): Promise<GeocodeResult | null>
}

interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  confidence?: number;
  source?: string; // Which provider
}
```

## Audit Logging

Action: `HOUSEHOLDS_GEOCODE_QUEUED`

Details logged:
```json
{
  "city": "Concord",
  "state": "CA",
  "zipCode": null,
  "county": null,
  "precinctNumber": null,
  "limit": "10000",
  "estimatedHouseholds": "10000",
  "providerId": "default",
  "skipGeocoded": "true"
}
```

## Files

### Core Implementation
- `lib/gis/geocode-job-processor.ts` - Job processor logic (262 lines)
- `app/api/v1/gis/households/geocode/route.ts` - API endpoint (174 lines)
- `lib/queue/bullmq.ts` - Queue configuration (updated)
- `lib/queue/worker.ts` - Worker registration (updated)

### Geocoding Infrastructure (Stub)
- `lib/geocoding/index.ts` - Service entry point
- `lib/geocoding/types.ts` - Type definitions
- `lib/geocoding/registry.ts` - Provider registry

### Documentation
- User guide: `docs-site/src/content/docs/admin/jobs/geocoding-households.md`
- Job system overview: `docs-site/src/content/docs/admin/jobs/overview.md`
- Architecture plan: `lib/geocoding/GEOCODING_PLAN.md`
- Implementation notes: `lib/gis/GEOCODING_JOBS_GUIDE.md`

## Testing

### Unit Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processGeocodeJob } from '@/lib/gis/geocode-job-processor';
import * as runner from '@/lib/queue/runner';

describe('processGeocodeJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes and geocodes households', async () => {
    // Mock Prisma queries
    // Mock geocoding service
    // Call processGeocodeJob
    // Verify households updated
  });

  it('logs errors for failed addresses', async () => {
    // Test error handling
  });
});
```

### Integration Test Pattern

```typescript
// POST /api/v1/gis/households/geocode with auth
// Verify 202 response with jobId
// Poll job status endpoint
// Verify households have coordinates
```

## Performance Considerations

### Batch Size Rationale

- **100 households/query**: Balances database load with query frequency
- **Smaller batches**: More frequent updates but higher DB load
- **Larger batches**: Fewer queries but stale progress data

### Rate Limiting

- **100ms delay**: Respects external API rate limits
- **5s timeout**: Prevents hanging requests
- **Fallback providers**: Distributes load across multiple services

### Scaling

For production use with high volume:
- Can increase batch size to 500+ if DB performance allows
- Can reduce delay if using higher-tier geocoding provider
- Should implement provider-specific rate limits
- Consider caching coordinates to avoid redundant lookups

## Troubleshooting

### Job Stuck in Processing

Check:
1. Redis connection: `redis-cli ping`
2. Worker logs: `npm run docker:dev:logs | grep geocode`
3. Database: `SELECT * FROM "Job" WHERE id = '...'`

### Incorrect Coordinates

- Verify household address data is complete
- Check geocoding service is responding correctly
- Compare results against manual validation

### Memory Issues

If processing very large jobs:
- Reduce batch size in processor
- Check for memory leaks in geocoding service
- Monitor Docker container memory usage

## See Also

- [Household Geocoding User Guide](/admin/jobs/geocoding-households/)
- [Job System Overview](/admin/jobs/overview/)
- [Geocoding Architecture Plan](/lib/geocoding/GEOCODING_PLAN.md)
