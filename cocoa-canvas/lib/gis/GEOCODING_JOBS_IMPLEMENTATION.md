# Geocoding Jobs Implementation Notes (Current)

Implementation ownership for geocoding jobs:

- API trigger: `app/api/v1/jobs/geocoding/route.ts`
- Queue config: `lib/queue/bullmq.ts`
- Worker routing: `lib/queue/worker.ts`
- Processor: `lib/gis/geocode-job-processor.ts`
- Recovery: `lib/queue/recovery.ts`

## Endpoint Change

Active:

- `POST /api/v1/jobs/geocoding`

For complete docs, see:

- `docs-site/src/content/docs/developer/job-system/`
