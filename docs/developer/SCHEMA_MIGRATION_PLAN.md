# Schema Migration Plan (Legacy to Person-Centric)

**Date**: February 16, 2026
**Purpose**: Provide data-migration guidance from legacy voter-centric data to the current person-centric schema.

## Status
The current Prisma schema is already person-centric. This plan focuses on migrating legacy data into the current model.

## Source of Truth
- [Master Database Schema](DATABASE_SCHEMA_MASTER.md)
- `prisma/schema.prisma`

## Migration Overview
### Legacy Model (Pre-Migration)
- Voter-centric records with embedded personal and contact fields
- No normalized Party or Precinct tables
- No household grouping

### Current Model (Post-Migration)
- `Person` is the canonical identity
- `Voter` specializes `Person`
- Contact info normalized into `Address`, `Phone`, `Email` with `Location` types
- Party, Precinct, and Election are lookup tables
- Household and Building group address data

## Recommended Migration Steps
1. **Back up** current database and `prisma/schema.prisma`.
2. **Create lookup data** for `Party`, `Precinct`, and `Location` (seeded values).
3. **Create `Person` records** from legacy voter rows.
4. **Create `Voter` records** linked to `Person` with import metadata.
5. **Move contact fields** into `Address`, `Phone`, and `Email` tables.
6. **Normalize dedupe IDs** using `externalId` and `externalSource`.
7. **Validate** counts and spot-check sampled records.

## Field Mapping Notes
- Legacy name and demographic fields map to `Person`.
- Legacy voter registration and import metadata map to `Voter`.
- Legacy address/phone/email fields map to `Address`, `Phone`, `Email` with proper `Location` entries.

## Validation Checklist
- Person count matches legacy voter count (or expected dedupe reductions).
- Each `Voter` has a `personId` and optional `partyId` / `precinctId`.
- Contact tables have primary flags where expected.
- `externalId` and `externalSource` pairs are unique.

## References
- [Master Database Schema](DATABASE_SCHEMA_MASTER.md)
- [Voter File Architecture](VOTER_FILE_ARCHITECTURE.md)
