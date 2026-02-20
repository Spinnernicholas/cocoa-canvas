---
title: Geocoding Job Flow
description: Canonical geocoding enqueue path and processing lifecycle
---

# Geocoding Job Flow

## API Contract

Endpoint and payload details are centralized in [Jobs API](/developer/api-reference/jobs/).

## Flow

1. Route validates auth and request payload.
2. Job row is created in Prisma with geocoding payload.
3. BullMQ job is enqueued with DB job ID.
4. Worker picks queue item and executes geocode processor.
5. Processor updates progress/errors and marks completion/failure.

## Monitoring

Monitoring endpoints and payloads are documented in [Jobs API](/developer/api-reference/jobs/).

## Canonical Path

Create geocoding work through the queue-backed Jobs API path.
