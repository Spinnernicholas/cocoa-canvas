---
title: Option Groups (Admin)
---

# Option Groups (Admin)

## Purpose
Option groups are admin-managed reference lists used throughout the app. They keep shared values consistent across people, voters, and contact data.

Current option groups:
- Political Parties
- Location Types

## Access
- Admin UI: `/admin/option-groups`

## Political Parties
Used for voter party affiliation.

Fields:
- Name (required)
- Abbreviation (optional)
- Description (optional)
- Color (optional)

Actions:
- Add new party
- Edit existing party
- Delete party

Notes:
- Deleting a party removes it from the options list. Existing records using that party may need cleanup.
- Use consistent abbreviations to match import data sources.

## Location Types
Used to label contact info types (addresses, phones, emails).

Fields:
- Name (required)
- Category (optional)
- Description (optional)

Common categories:
- address
- phone
- email
- digital

Actions:
- Add new location type
- Edit existing location type
- Delete location type

Notes:
- Location types are used by contact records. Deleting a location type may orphan related records.
- Prefer stable names like "Home", "Work", and "Cell" to keep imports consistent.

## API Endpoints
All endpoints require authentication.

Political parties:
- `GET /api/v1/admin/option-groups/parties`
- `POST /api/v1/admin/option-groups/parties`
- `PUT /api/v1/admin/option-groups/parties/{id}`
- `DELETE /api/v1/admin/option-groups/parties/{id}`

Location types:
- `GET /api/v1/admin/option-groups/locations`
- `POST /api/v1/admin/option-groups/locations`
- `PUT /api/v1/admin/option-groups/locations/{id}`
- `DELETE /api/v1/admin/option-groups/locations/{id}`

## Audit Logging
Option group changes are recorded in audit logs:
- `PARTY_LIST`, `PARTY_CREATE`, `PARTY_UPDATE`, `PARTY_DELETE`
- `LOCATION_LIST`, `LOCATION_CREATE`, `LOCATION_UPDATE`, `LOCATION_DELETE`
