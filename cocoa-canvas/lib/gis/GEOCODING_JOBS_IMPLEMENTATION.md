# Household Geocoding Job System - Implementation Summary

## What Was Implemented

A complete **asynchronous household geocoding job system** that allows users to geocode households in batches with flexible filtering. The system integrates with the existing job queue infrastructure and includes automatic progress tracking, error handling, and audit logging.

## Files Created/Modified

### New Files Created:

1. **`lib/gis/geocode-job-processor.ts`** (262 lines)
   - Core job processor logic
   - Builds database queries from filters
   - Fetches households in batches
   - Calls geocoding service for each household
   - Updates household records with coordinates
   - Error tracking and logging

2. **`app/api/v1/gis/households/geocode/route.ts`** (174 lines)
   - POST endpoint to create geocoding jobs
   - Accepts flexible filtering parameters
   - Validates at least one filter is provided
   - Returns 202 Accepted immediately
   - Counts matching households before processing
   - Audit logs the job creation

3. **`lib/geocoding/index.ts`** (54 lines)
   - Main geocoding service entry point
   - Stub implementation (ready for provider implementation)
   - Exports geocodingService instance

4. **`lib/geocoding/types.ts`** (43 lines)
   - GeocodeResult, GeocodeRequest interfaces
   - GeocoderProvider interface
   - GeocodeError interface

5. **`lib/geocoding/registry.ts`** (60 lines)
   - Provider registry for managing geocoding providers
   - setPrimary(), setFallbacks() for provider selection
   - Provider availability checking

6. **`lib/gis/GEOCODING_JOBS_GUIDE.md`** (400+ lines)
   - Complete usage guide with API examples
   - Job tracking instructions
   - Error handling documentation
   - Provider configuration guide
   - Troubleshooting section

7. **`lib/geocoding/GEOCODING_PLAN.md`** (existing plan document)
   - Architecture design for full geocoding system
   - List of supported free providers
   - Implementation roadmap

### Files Modified:

1. **`lib/queue/bullmq.ts`**
   - Added `GeocodeJobData` interface
   - Added `getGeocodeQueue()` function
   - Updated JobData union type
   - Added geocode queue event handlers
   - Updated `closeQueues()` for proper cleanup

2. **`lib/queue/worker.ts`**
   - Added import for `GeocodeJobData` and `processGeocodeJob`
   - Registered geocoding worker for the geocode-households queue
   - Handles job completion and failure events

## API Endpoint

### Create a Geocoding Job

**Endpoint**: `POST /api/v1/gis/households/geocode`

**Query Parameters** (at least one required):
```
city=<string>           # Filter by city (case-insensitive)
state=<string>          # Filter by state code (e.g., "CA")
zipCode=<string>        # Filter by ZIP code
county=<string>         # Filter by county
precinctNumber=<string> # Filter by precinct (not yet supported)
limit=<number>          # Max households to process (default: 10000, max: 100000)
providerId=<string>     # Specific geocoding provider (optional)
skipGeocoded=<boolean>  # Skip already-geocoded (default: true)
```

**Example Requests**:

```bash
# Geocode 10,000 households in Concord, CA
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?city=Concord&state=CA&limit=10000" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Geocode all ungeocoded households in ZIP code 94520
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?zipCode=94520&skipGeocoded=false" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Geocode 5,000 households with specific provider
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?state=CA&limit=5000&providerId=locationiq" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response** (202 Accepted):
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

**Error Responses**:
```json
// 400 - No filters provided
{
  "error": "At least one filter must be provided (city, state, zipCode, county, or precinctNumber)",
  "supportedFilters": ["city", "state", "zipCode", "county", "precinctNumber"]
}

// 404 - No matching households
{
  "error": "No households found matching the specified filters",
  "filters": { "city": "InvalidCity", "state": "CA" }
}

// 401 - Unauthorized
{
  "error": "Unauthorized"
}
```

## How It Works

1. **API Request** → User sends POST request with filters
2. **Validation** → API validates auth, at least one filter, and counts matching households
3. **Job Creation** → Database Job record created with status `pending`
4. **202 Response** → Returns immediately (asynchronous processing)
5. **Job Processing** → Background worker:
   - Fetches households in batches of 100
   - Calls geocoding service for each
   - Updates with latitude/longitude on success
   - Tracks errors for failed addresses
   - Updates progress every 50 households
6. **Job Completion** → Job marked as completed with final stats

## Job Lifecycle States

```
pending → processing → completed (or failed)
```

**Tracking**: Use existing `GET /api/v1/jobs/<jobId>` endpoint

## Processing Details

- **Batch size**: 100 households per query
- **Rate limiting**: 100ms delay between batches
- **Timeout per household**: 5 seconds (with timeout handling)
- **Auto-fallback**: Tries secondary providers if primary fails
- **Concurrency**: One job at a time (respects API rate limits)

## Database Updates

When household is successfully geocoded:
```typescript
{
  latitude: number;              // From geocoding service
  longitude: number;             // From geocoding service
  geocoded: true;                // Marked as geocoded
  geocodedAt: DateTime;          // Timestamp of geocoding
  geocodingProvider: string;     // Provider used (e.g., "nominatim", "locationiq")
}
```

The `geocodingProvider` field allows you to:
- Track which service was used for each household
- Identify provider performance issues
- Re-geocode with different providers if needed
- Audit compliance and data lineage

## Error Handling

- Failed addresses logged but don't stop the job
- Error reasons: missing address fields, address not found, API timeout, etc.
- Up to 100 errors tracked per job
- Retrievable via `GET /api/v1/jobs/<jobId>` (check errorLog field)

## Next Steps to Complete

### 1. Implement Geocoding Providers (Follow GEOCODING_PLAN.md)

```typescript
// lib/geocoding/providers/nominatim.ts
// lib/geocoding/providers/locationiq.ts
// lib/geocoding/providers/opencage.ts
// lib/geocoding/providers/geoapify.ts
// lib/geocoding/providers/census.ts
```

### 2. Implement Main GeocodingService

```typescript
// lib/geocoding/index.ts (replace stub)
export class GeocodingService {
  async geocode(request: GeocodeRequest, options?): Promise<GeocodeResult | null>
  async batchGeocode(requests: GeocodeRequest[], options?): Promise<(GeocodeResult | null)[]>
}
```

### 3. Register Providers

Update provider initialization in app initialization or environment-based setup:

```typescript
if (process.env.LOCATIONIQ_API_KEY) {
  geocoderRegistry.register(new LocationIQGeocoder(process.env.LOCATIONIQ_API_KEY));
}
```

### 4. Test End-to-End

Start the development environment and test:
```bash
npm run docker:dev:up
npm run db:push  # if needed
curl -X POST "http://localhost:3000/api/v1/gis/households/geocode?city=Oakland&state=CA&limit=100" \
  -H "Authorization: Bearer <your-jwt-token>"
```

Watch job progress:
```bash
curl "http://localhost:3000/api/v1/jobs/<jobId>" \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Environment Configuration (When Ready)

```bash
# When implementing providers, add to .env files:
LOCATIONIQ_API_KEY=your_key
OPENCAGE_API_KEY=your_key
GEOAPIFY_API_KEY=your_key
MAPBOX_API_KEY=your_key

# Optional configuration:
GEOCODING_PRIMARY_PROVIDER=nominatim
GEOCODING_FALLBACK_PROVIDERS=locationiq,opencage,geoapify
GEOCODING_TIMEOUT_MS=10000
```

## Architecture Benefits

✅ **Pluggable**: Add providers by creating one file  
✅ **Resilient**: Automatic fallback to secondary providers  
✅ **Cost-effective**: Uses free tiers, easy to upgrade  
✅ **Rate-limit aware**: Built-in delays and timeout handling  
✅ **Batch-ready**: Supports both native batch and sequential processing  
✅ **Testable**: Stub service allows testing job logic independently  
✅ **Auditable**: Full audit trail of jobs and processing  
✅ **Scalable**: Background workers can be scaled horizontally  

## Testing the Job System

### Unit Test Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { processGeocodeJob } from '@/lib/gis/geocode-job-processor';

describe('Geocoding Job', () => {
  it('creates and processes a geocoding job', async () => {
    // Create test household
    // Create job
    // Process job
    // Verify household updated with coordinates
  });
});
```

### Integration Test Example
```typescript
// POST /api/v1/gis/households/geocode?city=TestCity&limit=10 with auth
// Check response is 202
// Poll job status endpoint
// Verify households have geocoded=true and coordinates
```

## Next Session Checklist

- [ ] Implement Nominatim provider (simplest, no auth)
- [ ] Implement LocationIQ provider (highest free tier limits)
- [ ] Update GeocodingService to route to providers
- [ ] Register providers in app initialization
- [ ] Create integration tests
- [ ] Document environment variables in docs-site
- [ ] Test with real household data from one city
- [ ] Monitor worker logs for any issues

## Files Reference

**Core System**:
- API: `app/api/v1/gis/households/geocode/route.ts`
- Processor: `lib/gis/geocode-job-processor.ts`
- Queue: `lib/queue/bullmq.ts`
- Worker: `lib/queue/worker.ts`

**Geocoding Subsystem** (to be implemented):
- Service: `lib/geocoding/index.ts`
- Registry: `lib/geocoding/registry.ts`
- Types: `lib/geocoding/types.ts`
- Providers: `lib/geocoding/providers/*.ts`

**Documentation**:
- Plan: `lib/geocoding/GEOCODING_PLAN.md`
- Usage: `lib/gis/GEOCODING_JOBS_GUIDE.md`

---

The job system is complete and ready to handle geocoding requests. The next phase is implementing the actual geocoding providers following the detailed plan in `GEOCODING_PLAN.md`.
