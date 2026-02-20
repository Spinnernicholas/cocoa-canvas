---
title: Code Contribution Workflow
description: Recommended workflow for contributing code changes
---

# Code Contribution Workflow

## 1. Pick Scope

- Choose one focused feature/fix.
- Confirm expected behavior from existing code and tests.

## 2. Implement

- Keep architecture patterns consistent.
- Follow project conventions in `copilot-instructions.md`.
- Avoid unrelated refactors.

## 3. Validate

- Run targeted tests first.
- Run broader checks when needed.
- Confirm no regressions in changed behavior.

## 4. Document

- Update user/admin/developer docs that are impacted.
- Put API interaction details only in `/developer/api` docs.

## 5. Submit

- Provide a clear summary of what changed and why.
- Note any tradeoffs, migration steps, or follow-up work.
