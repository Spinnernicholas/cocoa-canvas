---
title: Job System
description: Manage background jobs for large-scale operations
---

# Job System

The **Job System** manages background processing of large-scale operations in Cocoa Canvas. Use jobs for tasks like importing voter files, geocoding addresses, or exporting data.

## Getting Started

### New to Jobs?

Start with the [Job System Overview](./overview.md) to understand:
- How jobs work
- Job states and lifecycle
- How to track progress
- API endpoints for jobs

### Common Tasks

**Geocoding Households**  
Convert addresses to map coordinates for millions of households at once.  
→ [Geocoding Households Guide](./geocoding-households.md)

**Importing Voter Files**  
Upload CSV files with voter registration data.  
→ [Voter Import Guide](/admin/voter-import/)

## Job Types

| Job Type | Purpose | Guide |
|----------|---------|-------|
| **Voter Import** | Import voter registration files | [Voter Import](/admin/voter-import/) |
| **Parcel Import** | Import property/parcel data | [Parcel Data](/admin/parcels/) |
| **Household Geocoding** | Convert addresses to coordinates | [Geocoding](/admin/jobs/geocoding-households/) |

## Quick Example

### Create a Geocoding Job

```bash
# Geocode 10,000 ungeocoded households in Oakland, CA
curl -X POST "http://your-instance/api/v1/gis/households/geocode" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -G \
  --data-urlencode 'city=Oakland' \
  --data-urlencode 'state=CA' \
  --data-urlencode 'limit=10000'
```

**Response:**
```json
{
  "success": true,
  "jobId": "clm7k3p0h0000k2z1x2y3z4a5",
  "message": "Geocoding job created for 10000 households",
  "processingStarted": true
}
```

### Track Progress

```bash
# Check job status
curl "http://your-instance/api/v1/jobs/clm7k3p0h0000k2z1x2y3z4a5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

- [Job System Overview](./overview.md) - Complete guide to jobs
- [Geocoding Households](./geocoding-households.md) - Bulk address geocoding
- [API Documentation](/developer/api/jobs/) - Technical reference
