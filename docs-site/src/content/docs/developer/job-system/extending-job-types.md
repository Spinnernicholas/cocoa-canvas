---
title: Extending Job Types
description: Practical checklist for adding a new queue-backed job type
---

# Extending Job Types

Use this checklist when introducing a new job type.

## 1) Define DB-facing job contract

- Add/create jobs with a clear `type` value.
- Define expected `data` payload shape.
- Decide progress model (`processedItems` vs `outputStats`).

## 2) Add queue payload type and queue selection

- Extend payload types in `cocoa-canvas/lib/queue/bullmq.ts` as needed.
- Reuse an existing queue or add a dedicated queue when behavior differs materially.

## 3) Implement processor

- Put business logic in a dedicated processor module.
- Use runner helpers:
  - `startJob`
  - `updateJobProgress`
  - `addJobError`
  - `completeJob`
  - `failJob`

## 4) Register worker routing

- Add worker handling in `cocoa-canvas/lib/queue/worker.ts`.
- Respect central pool/type limits.

## 5) Add recovery mapping

- Add canonical type mapping and recovery handler in `cocoa-canvas/lib/queue/recovery.ts`.

## 6) Expose API trigger

- Add/extend the relevant API trigger route.
- Require auth with `validateProtectedRoute()` for protected operations.
- Return job ID and `202` for async work creation.

## 7) Add docs and tests

- Update this job-system docs section.
- Add integration/unit tests for route and processor behavior.
