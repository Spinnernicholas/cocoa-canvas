# Household Geocoding Job System - Usage Guide

## Overview

The household geocoding job system allows users to asynchronously geocode households in batches with flexible filtering. Jobs are tracked in the database and processed by background workers.

## API Endpoint

### Create a Geocoding Job

**Endpoint**: `POST /api/v1/gis/households/geocode`

**Query Parameters** (at least one filter required):
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `city` | string | No | Filter by city name (case-insensitive) |
| `state` | string | No | Filter by state code (e.g., "CA") |
| `zipCode` | string | No | Filter by ZIP code |
| `county` | string | No | Filter by county name |
| `precinctNumber` | string | No | Filter by precinct number |
| `limit` | number | No | Max households to geocode (default: 10000, max: 100000) |
| `providerId` | string | No | Specific geocoding provider (e.g., "nominatim", "locationiq") |
| `skipGeocoded` | boolean | No | Skip already-geocoded households (default: true) |

**Examples**:

```bash
# Geocode up to 10,000 ungeocoded households in Concord, CA
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?city=Concord&state=CA&limit=10000" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Geocode all households in ZIP code 94520
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?zipCode=94520&skipGeocoded=false" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Geocode 5,000 households in precinct 5001, use LocationIQ provider
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?precinctNumber=5001&providerId=locationiq&limit=5000" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response** (202 Accepted - Processing in background):
```json
{
  "success": true,
  "jobId": "clm7k3p0h0000k2z1x2y3z4a5",
  "message": "Geocoding job created for 10000 households",
  "filters": {
    "city": "Concord",
    "state": "CA",
    "zipCode": null,
    "county": null,
    "precinctNumber": null
  },
  "estimatedHouseholds": 10000,
  "limit": 10000,
  "processingStarted": true
}
```

**Error Responses**:

```json
// 400 Bad Request - No filters provided
{
  "error": "At least one filter must be provided (city, state, zipCode, county, or precinctNumber)",
  "supportedFilters": ["city", "state", "zipCode", "county", "precinctNumber"]
}

// 404 Not Found - No matching households
{
  "error": "No households found matching the specified filters",
  "filters": { "city": "InvalidCity", "state": "CA" }
}

// 401 Unauthorized
{
  "error": "Unauthorized"
}
```

## Job Tracking

Once a job is created, you can track its progress using the existing job endpoints:

**Get specific job status**:
```bash
curl "http://localhost:3000/api/v1/jobs/<jobId>" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response**:
```json
{
  "id": "clm7k3p0h0000k2z1x2y3z4a5",
  "type": "geocode_households",
  "status": "processing",
  "totalItems": 10000,
  "processedItems": 1250,
  "createdAt": "2025-02-18T10:30:00Z",
  "startedAt": "2025-02-18T10:30:05Z",
  "completedAt": null,
  "data": "{\"filters\":{\"city\":\"Concord\",\"state\":\"CA\"},\"limit\":10000,\"skipGeocoded\":true}",
  "errorLog": null,
  "createdBy": { "id": "user1", "email": "user@example.com", "name": "John Doe" }
}
```

## Job Processing

### Job Lifecycle

1. **Pending** → Job created, waiting to be processed
2. **Processing** → Worker is geocoding households
3. **Completed** → All households processed successfully
4. **Failed** → Critical error during processing

### How It Works

1. API receives request with filters and limit
2. Counts matching households (must find at least 1)
3. Creates Job record in database with status `pending`
4. Returns 202 Accepted immediately
5. Background worker picks up the job:
   - Fetches households in batches of 100
   - Calls geocoding service for each household
   - Updates household records with latitude/longitude
   - Tracks progress and errors
   - Completes job with final stats

### Processing Performance

- **Batch size**: 100 households per database query
- **Rate limiting**: 100ms delay between batches (respects geocoding API limits)
- **Timeout**: 5 seconds per household geocoding request
- **Fallback**: Automatically tries secondary providers if primary fails
- **Concurrency**: One geocoding job at a time (respects rate limits)

## Field Updates

When a household is successfully geocoded, these fields are updated:

```typescript
{
  latitude: number;              // From geocoding service
  longitude: number;             // From geocoding service
  geocoded: true;                // Marked as geocoded
  geocodedAt: DateTime;          // Timestamp of geocoding
  geocodingProvider: string;     // Provider used (e.g., "nominatim", "locationiq")
}
```

This allows you to:
- **Track provider performance** - Which service gave best results?
- **Re-geocode with different provider** - If results seemed inaccurate
- **Audit compliance** - Show which service was used for each household
- **Provider fallback analysis** - Which providers were needed as fallbacks?

## Error Handling

Errors are logged but don't stop the job. A household can fail to geocode if:

- No address available (missing required fields)
- Address not found by any geocoding service
- API timeout (rare, with automatic retries)
- Service temporarily unavailable (falls back to next provider)

Error logs are stored as JSON array in the Job record:

```json
[
  {
    "householdId": "hh123",
    "address": "999 Unknown St",
    "error": "No results from geocoding service",
    "timestamp": "2025-02-18T10:30:12Z"
  },
  {
    "householdId": "hh456",
    "address": "",
    "error": "No address available to geocode",
    "timestamp": "2025-02-18T10:30:15Z"
  }
]
```

## Geocoding Providers

The system can use any registered geocoding provider. By default:

- **Primary**: Nominatim (free, no auth required)
- **Fallback**: LocationIQ → OpenCage → Geoapify (if API keys configured)

To use a specific provider, pass the `providerId` parameter:

```bash
# Use LocationIQ specifically
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?city=Concord&providerId=locationiq" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## Audit Logging

All geocoding jobs are audited with action `HOUSEHOLDS_GEOCODE_QUEUED`. The audit log includes:

```json
{
  "action": "HOUSEHOLDS_GEOCODE_QUEUED",
  "resource": "household",
  "resourceId": "<jobId>",
  "details": {
    "filters": { "city": "Concord", "state": "CA" },
    "limit": 10000,
    "estimatedHouseholds": 10000,
    "providerId": null,
    "skipGeocoded": true
  }
}
```

## Rate Limiting Considerations

Different providers have different rate limits:

| Provider | Free Tier | Rate Limit |
|----------|-----------|-----------|
| Nominatim | Unlimited | 1 req/sec per IP |
| LocationIQ | 5,000/day | Varies with plan |
| OpenCage | 2,500/day | Varies with plan |
| Geoapify | 3,000/day | Varies with plan |

The system automatically:
- Queues jobs one at a time
- Adds 100ms delays between batches
- Uses fallback providers if one is rate-limited

For large jobs (20,000+ households), use multiple jobs or configure a higher-rate provider.

## Example: Creating Multiple Jobs

For a county with 100,000 ungeocoded households, create multiple jobs:

```bash
# Job 1: Concord (10,000 households)
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?city=Concord&state=CA&limit=10000" ...

# Job 2: Oakland (15,000 households)
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?city=Oakland&state=CA&limit=15000" ...

# Job 3: All ZIP codes 94xxx that aren't geocoded yet
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?state=CA&limit=30000&skipGeocoded=true" ...
```

Monitor all jobs via the jobs dashboard or API.

## Implementation Details

### Files Modified/Created:

1. **`lib/gis/geocode-job-processor.ts`** - Job processor logic
2. **`app/api/v1/gis/households/geocode/route.ts`** - API endpoint
3. **`lib/queue/bullmq.ts`** - Added geocoding queue
4. **`lib/queue/worker.ts`** - Added geocoding worker

### Job Data Structure:

```typescript
{
  type: "geocode_households",
  status: "pending|processing|completed|failed",
  totalItems: number,
  processedItems: number,
  data: JSON string {
    filters: { city?, state?, zipCode?, county?, precinctNumber? },
    limit: number,
    providerId?: string,
    skipGeocoded: boolean
  },
  errorLog?: JSON array of errors
}
```

## Troubleshooting

### Job stuck in "processing"
- Check Redis connection: `npm run docker:dev:logs | grep redis`
- Check worker logs: `npm run docker:dev:logs | grep "Geocode Job"`
- Restart workers: Stop and restart the application

### High failure rate
- Check if households have valid address fields
- Verify geocoding provider API keys are configured correctly
- Try using a different provider with `providerId` parameter

### Rate limit errors
- Increase delay between batches (modify `lib/gis/geocode-job-processor.ts`)
- Use multiple smaller jobs instead of one large job
- Configure a higher-tier geocoding provider

### Database query timeouts
- Reduce batch size for city filters (use precinct numbers instead)
- Run jobs during off-peak hours
- Add database indexes on city/state/zipCode (already done)
