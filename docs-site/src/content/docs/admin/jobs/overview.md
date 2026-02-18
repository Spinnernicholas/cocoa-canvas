---
title: Job System Overview
description: Background job processing for large-scale operations like geocoding and data imports
---

# Job System Overview

The Cocoa Canvas **Job System** manages background processing of long-running operations that would be impractical to complete synchronously. Jobs run asynchronously, allowing the UI to remain responsive while data is being processed.

## What Jobs Are Available

### Data Import Jobs
- **Voter File Upload** - Import voter records from CSV
- **Parcel Data Import** - Upload parcel/property boundary data
- See [voter import guide](/admin/voter-import/) for details

### Geographic Processing Jobs
- **Household Geocoding** - Convert addresses to coordinates
- See [geocoding guide](/admin/jobs/geocoding-households/) for details

## How Jobs Work

### Job Lifecycle

Every job goes through these states:

```
pending → processing → completed
                    ↓
                  failed
```

| State | Meaning |
|-------|---------|
| **pending** | Job created, waiting to start |
| **processing** | Worker is actively processing the job |
| **completed** | Job finished successfully |
| **failed** | Job encountered an error and stopped |

### Creating a Job

When you trigger an operation (like uploading a voter file or starting geocoding):

1. **Validation** - The system validates your request
2. **Job Creation** - A Job record is created in the database
3. **Immediate Response** - You get back a Job ID (`202 Accepted`)
4. **Background Processing** - A background worker processes the job asynchronously

You **don't need to wait** for the job to complete - the system returns immediately.

### Tracking Progress

Use the **Job ID** to monitor progress:

```bash
# Get job status (requires authentication)
curl "http://your-instance/api/v1/jobs/{jobId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response shows:
- Current status (pending/processing/completed/failed)
- Progress (items processed / total items)
- Errors (if any failed)
- Timestamps (created, started, completed)

### Web UI

In the Cocoa Canvas UI, visit **Jobs** page to see:
- All recent jobs
- Current status and progress
- Error messages
- Estimated time remaining

## API Endpoints

### Get Job Status
```
GET /api/v1/jobs/{jobId}
```

Returns job details including status, progress, and error log.

### List All Jobs
```
GET /api/v1/jobs
```

Optional query parameters:
- `status=pending|processing|completed|failed`
- `type=import_voters|geocode_households|parcel_import`
- `limit=50` (default)
- `offset=0` (for pagination)

### Example

```bash
# Get failed jobs
curl "http://localhost:3000/api/v1/jobs?status=failed&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Handling

If a job fails during processing:

1. **Partial Results** - Some items may have been processed before failure
2. **Error Log** - Specific error messages are saved with the job
3. **Retry** - You can create a new job to retry the operation

Check the job's error log to see:
- Why items failed
- Which specific records had problems
- Error messages for debugging

## Rate Limiting

Jobs are designed to be respectful of system resources:

- **One at a time** - Only one job of each type processes simultaneously
- **Batched processing** - Large jobs are broken into batches
- **Rate limiting** - External API calls are throttled
- **Progress updates** - Status updates as you go

For example, geocoding a large household set will:
- Process in batches of 100 households
- Add delays between API calls to prevent rate limiting
- Update progress every 50 households

## Performance Notes

Processing speed depends on:
- **Job size** - More items take longer
- **System load** - Other jobs running may slow things down
- **External APIs** - Geocoding uses external services with rate limits
- **Network** - Large file uploads depend on bandwidth

## Monitoring

**In Production**, you can monitor jobs via:

- Web UI - Jobs page shows real-time progress
- API polling - Call `/api/v1/jobs/{jobId}` every 5-10 seconds
- Logs - Application logs show job start/completion

## Examples by Job Type

### Geocoding Households
See [Geocoding Households](/admin/jobs/geocoding-households/) for:
- How to create geocoding jobs
- Filtering options
- Understanding results
- Troubleshooting

### Importing Voter Data
See [Voter Import](/admin/voter-import/) for:
- Supported file formats
- Upload process
- Monitoring imports
- Handling errors

## Frequently Asked Questions

**Q: Can I cancel a running job?**  
A: Not directly. If a job is taking too long, jobs will timeout automatically and be marked as failed (typically after 24 hours).

**Q: What happens if the server restarts during a job?**  
A: Jobs are resilient to restarts. If processing was interrupted, the job may resume from batches already completed, or you can create a new job to retry.

**Q: How long do jobs stay in the system?**  
A: Completed jobs are kept indefinitely for auditing. Failed jobs are kept for troubleshooting. Jobs older than 30 days can be archived.

**Q: Can multiple jobs run at the same time?**  
A: Yes, different job types can run simultaneously, but only one job of each type at a time (to manage resource usage).

**Q: What's the maximum job size?**  
A: Most jobs are limited to 100,000 items per job. Create multiple jobs for larger datasets.

## Next Steps

- [Geocoding Households](/admin/jobs/geocoding-households/) - Bulk geocode addresses
- [Voter Import](/admin/voter-import/) - Upload voter files
- [Job API Reference](/developer/api/jobs/) - Technical API details
