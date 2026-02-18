---
title: Geocoding Households
description: Convert household addresses to geographic coordinates for mapping
---

# Geocoding Households

**Geocoding** converts street addresses into geographic coordinates (latitude and longitude). With geocoded households, you can:

- Visualize voter locations on maps
- Identify geographic clusters and coverage areas
- Assign canvassing routes by location
- Analyze geographic campaign performance
- Plan field operations efficiently

## Overview

The geocoding job system processes large numbers of household addresses asynchronously, converting them into coordinates that can be displayed on maps.

## Starting a Geocoding Job

### Using the Web UI

1. Navigate to **GIS Admin** → **Geocode Households**
2. Select filter criteria (see [Filtering](#filtering-options) below)
3. Review estimated household count
4. Click **Start Geocoding Job**
5. Receive Job ID and real-time progress tracking

### Using the API

```bash
curl -X POST "http://your-instance/api/v1/gis/households/geocode" \
  -H "Authorization: Bearer YOUR_TOKEN"
  -G \
  --data-urlencode 'city=Concord' \
  --data-urlencode 'state=CA' \
  --data-urlencode 'limit=10000'
```

**Response** (202 Accepted - processing in background):
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

Use the `jobId` to track progress.

## Filtering Options

At least **one filter is required**. Filters narrow down which households to geocode.

| Filter | Example | Notes |
|--------|---------|-------|
| **city** | `Concord` | Case-insensitive, partial matches work |
| **state** | `CA` | Two-letter state code |
| **zipCode** | `94520` | Exact match on ZIP code |
| **county** | `Contra Costa` | County name |
| **previouslyGeocoded** | `false` | Skip households already geocoded (default: `true`) |

### Filter Examples

```bash
# All ungeocoded households in Concord, CA
city=Concord&state=CA&skipGeocoded=true

# Specific ZIP code
zipCode=94520

# Multiple filters (all must match)
city=Concord&state=CA&limit=5000

# Include already geocoded (re-geocode all)
city=Oakland&state=CA&skipGeocoded=false
```

## Job Limits

- **Default limit**: 10,000 households per job
- **Maximum limit**: 100,000 households per job
- For larger datasets, create multiple jobs with different filters

## Monitoring Progress

### Via Web UI

**Jobs Page** shows:
- Current status (pending/processing/completed)
- Progress bar (X households processed)
- Processing speed (households/minute)
- Estimated time remaining
- Errors encountered

### Via API

```bash
# Check job status
curl "http://your-instance/api/v1/jobs/{jobId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response shows:
```json
{
  "id": "clm7k3p0h0000k2z1x2y3z4a5",
  "type": "geocode_households",
  "status": "processing",
  "totalItems": 10000,
  "processedItems": 2500,
  "startedAt": "2026-02-18T10:30:05Z",
  "createdAt": "2026-02-18T10:30:00Z",
  "completedAt": null
}
```

## Understanding Results

### Successful Geocoding

When a household is successfully geocoded:
- **Latitude** and **Longitude** fields are populated
- **Geocoded** field is set to `true`
- **GecodedAt** timestamp is recorded
- **GeocodingProvider** field stores the service used (e.g., "nominatim", "locationiq")
- Household appears on geographic maps

### Failed Addresses

If an address cannot be geocoded:
- Address remains unchanged
- Household is not marked as geocoded
- Error is logged with reason

**Common reasons for failure**:
- Missing or incomplete address
- Address doesn't exist
- Invalid street name or number
- Temporary service unavailable

You can retry failed addresses by creating a new job with `skipGeocoded=false`.

## Processing Details

### Performance

- **Batch size**: 100 households at a time
- **Processing speed**: Typically 100-500 households/minute
- **Example**: 10,000 households take 20-100 minutes
- **Rate limiting**: Automatic delays between API calls

### What Happens

1. **Validation** - Household addresses are validated
2. **Lookup** - Address is sent to geocoding service
3. **Matching** - Service returns coordinates
4. **Storage** - Coordinates saved to household record
5. **Progress** - UI updated every 50 households

### Providers

The system uses free geocoding services:
- **Nominatim** (OpenStreetMap) - Primary provider
- **LocationIQ** - High-volume tier (optional, requires API key)
- **Others** - Secondary fallbacks (OpenCage, Geoapify)

If one provider fails, the system automatically tries the next one.

## Common Tasks

### Geocode a New City

```bash
POST /api/v1/gis/households/geocode?city=DarcyCity&state=CA
```

### Re-geocode a Specific Area

Include previously geocoded households:

```bash
POST /api/v1/gis/households/geocode?city=Concord&state=CA&skipGeocoded=false
```

### Update All Ungeocoded Households

```bash
POST /api/v1/gis/households/geocode?state=CA&skipGeocoded=true&limit=50000
```

Create multiple jobs if exceeding 100,000 households.

### Monitor Multiple Jobs

```bash
# List all geocoding jobs
GET /api/v1/jobs?type=geocode_households&status=processing
```

## Troubleshooting

### Job Stuck in "Processing"

**Possible causes**:
- Large job is still running (check elapsed time)
- Redis connection issue
- Worker crashed

**Solutions**:
- Wait for job to complete (may take hours for 100k+ households)
- Check [application logs](/admin/troubleshooting/) for worker errors
- Restart the application if needed

### High Failure Rate

**Possible causes**:
- Incomplete address data in system
- Geocoding service rate-limited
- Network issues

**Solutions**:
- Check household addresses are complete (street, city, state, ZIP)
- Verify geocoding service is accessible
- Try again in a few minutes
- Create smaller jobs to reduce rate limiting

### Incorrect Coordinates

**Possible causes**:
- Similar street names in different cities
- Address ambiguity
- Service data accuracy

**Solutions**:
- Verify address data is correct in the system
- Use smaller geographic filters
- Try a different geocoding provider (contact support)

### Geocoding Won't Start

**Check**:
- At least one filter is provided
- Matching households exist
- You have permission to create jobs

**Error messages**:
- "No filters provided" → Add city, state, or ZIP code
- "No households found" → Check filters match your data

## Performance Optimization

### For Large Datasets

Instead of one 100,000 household job, create multiple smaller jobs:

```bash
# Job 1: Concord
POST /api/v1/gis/households/geocode?city=Concord&limit=10000

# Job 2: Oakland  
POST /api/v1/gis/households/geocode?city=Oakland&limit=10000

# Job 3: Remaining
POST /api/v1/gis/households/geocode?state=CA&city!=Concord&city!=Oakland&limit=50000
```

**Benefits**:
- Faster individual job completion
- Better progress visibility
- Easier to identify problematic areas
- Can run jobs at different times

### Best Practices

1. **Filter by location** - Use city/ZIP codes rather than state-wide jobs
2. **Start small** - Test with 1,000 households first
3. **Monitor during off-hours** - Schedule large jobs when system is less busy
4. **Check data quality** - Ensure addresses are complete before geocoding
5. **Verify results** - Sample output to ensure accuracy

## API Reference

### Endpoint

`POST /api/v1/gis/households/geocode`

### Query Parameters

| Parameter | Type | Required | Default | Max |
|-----------|------|----------|---------|-----|
| `city` | string | No | - | - |
| `state` | string | No | - | - |
| `zipCode` | string | No | - | - |
| `county` | string | No | - | - |
| `limit` | number | No | 10000 | 100000 |
| `skipGeocoded` | boolean | No | true | - |
| `providerId` | string | No | nominatim | - |

### Response

**202 Accepted** (job queued):
```json
{
  "success": true,
  "jobId": "string",
  "message": "string",
  "estimatedHouseholds": number,
  "limit": number,
  "processingStarted": true
}
```

**400 Bad Request** (validation error):
```json
{
  "error": "string",
  "supportedFilters": [
    "city",
    "state",
    "zipCode",
    "county",
    "precinctNumber"
  ]
}
```

**404 Not Found** (no matching households):
```json
{
  "error": "No households found matching the specified filters",
  "filters": {}
}
```

## See Also

- [Job System Overview](/admin/jobs/overview/) - General job system guide
- [Mapping Households](/campaign/mapping/) - Using geocoded data on maps
- [Importing Voter Data](/admin/voter-import/) - Get household addresses into system
- [API Documentation](/developer/api/geocoding/) - Technical API details
