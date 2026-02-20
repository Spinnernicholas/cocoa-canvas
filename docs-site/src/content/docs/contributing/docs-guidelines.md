---
title: Docs Site Guidelines
description: Standards for writing and organizing docs in docs-site
---

# Docs Site Guidelines

## Structure

- Keep docs role-oriented:
  - `admin/` for operators
  - `developer/` for engineering concepts
  - `developer/api-reference/` for all API interaction details
  - `contributing/` for contribution process

## API Documentation Rule

- Do not duplicate endpoint payload/response details outside `developer/api-reference/`.
- Non-API pages may link to API docs but should not restate endpoint contracts.

## Writing Style

- Prefer concise, task-oriented sections.
- Use stable links (route style, not `.md` suffix links).
- Keep examples current with implementation.

## Maintenance

- When behavior changes in code, update related docs in the same PR.
- Remove references to deprecated/removed features.
- Mark historical pages clearly as historical.
