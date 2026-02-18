---
title: Voter File Architecture (Person-Centric)
---

# Voter File Architecture (Person-Centric)

## Overview: From File to Database
This document explains how voter files map into the person-centric schema and how imports are deduplicated and tracked.

Schema definitions are centralized in:
- [Master Database Schema](DATABASE_SCHEMA_MASTER.md)

## Import File Specifications (High Level)
- Supports county voter files and simple CSV imports.
- Imports should provide an external identifier and source system name.
- Each import run tracks provenance (`importedFrom`, `importType`, `importFormat`, `importFile`).

## External IDs
External IDs uniquely identify records across imports and prevent duplicates.

| System | External ID Field | Example |
|--------|-------------------|---------|
| Contra Costa County | `VoterID` | `2160301` |
| Simple CSV | `RegistrationNumber` | `00003101` |

**How It Works**:
1. Extract `externalId` and `externalSource` from the source file.
2. Look up existing `Voter` by `@@unique([externalId, externalSource])`.
3. Update mutable voter fields if found, or create new `Person` + `Voter` if not.

## Schema Reference
Model definitions and fields live in the master schema:
- [Master Database Schema](DATABASE_SCHEMA_MASTER.md)

## Data Flow: File -> Database
1. Validate file format and detect external ID fields.
2. Normalize and map fields to `Person` and `Voter` records.
3. Normalize contact data into `Address`, `Phone`, and `Email` tables with `Location` types.
4. Normalize lookups into `Party`, `Precinct`, and `Election` as needed.
5. Persist import metadata for traceability.

## Query Examples (Conceptual)
- Find a voter by external ID and source.
- Retrieve a person with their voter profile and contact details.
- Filter voters by party or precinct.

## Import Checklist
- External IDs and sources are present.
- Contact records include primary flags when known.
- Party and precinct values are normalized.
- Import metadata is stored for auditing.

## Summary
Use `Person` as the canonical identity, store voter-specific data in `Voter`, and normalize contact and lookup data using the dedicated tables. Refer to the master schema for authoritative field definitions.
