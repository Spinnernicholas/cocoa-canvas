# Cocoa Canvas - Database Schema

## Overview

This is the **end-state database schema** showing the complete Cocoa Canvas design. For **phased implementation**, see **PHASE_PLAN.md** which specifies which tables are added in each phase.

The schema is expressed in **Prisma** format, supporting both SQLite (development/small deployments) and PostgreSQL (production).

**Design Principles**:
- Non-destructive operations (audit everything, no hard deletes)
- Incremental schema growth (Phase 1: 6 tables → Phase 4: 12 tables)
- Audit trails for all sensitive data changes
- Flexible custom fields for extensibility
- GeoJSON support for spatial data
- Denormalization where needed for performance

**NOTE**: Do not implement all tables in Phase 1. See PHASE_PLAN.md for schema stratification by phase.

---

## Core Entity Relationships

```
Users & Auth (Phase 1)
├── User (email, password, sessions, audit)
└── Session (JWT tokens, session management)

Voter Data (Phase 2+)
├── Voter (name, address, registration info)
├── Household (Phase 4: groups voters at same address)
└── VoterNote (Phase 2: contact notes)

Campaigns & Canvassing (Phase 1+)
├── Campaign (campaign metadata)
└── Job Queue (async jobs for imports, geocoding)

Geography (Phase 3+)
├── GeoJsonFeature (precinct/parcel shapes)
└── Geocoding (batch address geocoding results)

Imports & Audit (Phase 1+)
├── ImportJob (Phase 2: voter file import tracking)
└── AuditLog (all sensitive operations)

Administrative (Phase 1+)
├── Setting (system configuration)
└── (Note: Organization/Team/RBAC deferred to Phase 5+)
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

// ============================================================================
// CONFIGURATION
// ============================================================================

datasource db {
  provider = "postgresql"  // Change to "sqlite" for local dev
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?   // null if OAuth
  emailVerified DateTime?
  image         String?

  // Multi-factor authentication
  mfaEnabled    Boolean   @default(false)
  mfaSecret     String?   @db.Text // Encrypted TOTP secret

  // Security tracking
  lastLogin     DateTime?
  loginAttempts Int       @default(0)
  lockedUntil   DateTime?
  isActive      Boolean   @default(true)

  // Organization context
  organizationId String?   // Multi-tenancy support (future)

  // Relations
  roles         Role[]
  permissions   Permission[]
  sessions      Session[]
  auditLogs     AuditLog[]
  teams         Team[]    @relation("TeamMembers")
  teamLeads     Team[]    @relation("TeamLead")
  assignments   Assignment[] @relation("CanvasserAssignments")
  createdImports ImportJob[]
  notes         VoterNote[] @relation("CreatedBy")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([email])
  @@index([organizationId])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model Role {
  id          String    @id @default(cuid())
  name        String    @unique // admin, manager, canvasser, viewer, auditor
  description String?

  // Relations
  permissions Permission[]
  users       User[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Permission {
  id          String    @id @default(cuid())

  // Resource-based permissions (voter, campaign, team, settings, audit)
  resource    String
  action      String    // read, create, update, delete, export, import

  // Role assignments
  roles       Role[]
  users       User[]    // For fine-grained user-level overrides

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([resource, action])
  @@index([resource])
}

// ============================================================================
// VOTER DATA
// ============================================================================

model Voter {
  id              String    @id @default(cuid())

  // Registration info
  voterId         String?   @unique  // County voter ID
  countyCode      String    // CC for Contra Costa, etc.
  firstName       String
  lastName        String
  middleName      String?
  suffix          String?   // Jr., Sr., III, etc.

  // Contact info (encrypted in application layer)
  address         String
  addressAlt      String?
  city            String
  state           String    @default("CA")
  zip             String
  phone           String?
  email           String?

  // Voter registration details
  registrationDate DateTime?
  status          String?   // active, inactive, removed, pending
  partyAffiliation String?  // D, R, I, G, L, N, U
  districtInfo    Json?     // { cd: "10", ad: "16", sb: "8", ... }

  // Spatial data
  latitude        Float?
  longitude       Float?
  precinct        String?   // Normalized precinct ID
  precintctRelation Precinct? @relation(fields: [precinct], references: [id])
  geocoded        Boolean   @default(false)
  geocodedAt      DateTime?

  // Household grouping
  householdId     String?
  household       Household? @relation(fields: [householdId], references: [id])

  // Custom/flexible fields (for data enrichment)
  customFields    Json?     // { engagement_score: 8, volunteer: true, ... }

  // Data tracking
  source          String?   // Import job that created/updated
  sourceVersion   Int       @default(1)
  lastUpdated     DateTime  @updatedAt

  // Relations
  canvassResponses CanvassResponse[]
  assignments     Assignment[]
  notes           VoterNote[]
  history         VoterHistory[]

  createdAt       DateTime  @default(now())

  @@unique([voterId, countyCode])
  @@index([lastName, firstName])
  @@index([address, city, zip])
  @@index([precinct])
  @@index([status])
  @@index([partyAffiliation])
  @@index([householdId])
  @@index([countyCode])
  @@fulltext([firstName, lastName, address]) // for postgres FTS
}

model Household {
  id              String    @id @default(cuid())
  address         String
  city            String
  zip             String

  // Derived from residents
  voterCount      Int       @default(0)
  maxVotingScore  Int?      // Highest voting frequency in household

  // Spatial
  latitude        Float?
  longitude       Float?
  geocoded        Boolean   @default(false)

  // Relations
  voters          Voter[]
  parcelId        String?
  parcel          GeoJsonFeature? @relation(fields: [parcelId], references: [id])

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([address, city, zip])
  @@index([parcelId])
}

model VoterHistory {
  id              String    @id @default(cuid())
  voterId         String
  voter           Voter     @relation(fields: [voterId], references: [id], onDelete: Cascade)

  // Election info
  electionDate    DateTime
  electionType    String    // general, primary, local, special
  voted           Boolean

  // Source: county voter file
  sourceFile      String?

  createdAt       DateTime  @default(now())

  @@unique([voterId, electionDate])
  @@index([voterId])
  @@index([electionDate])
}

model VoterNote {
  id              String    @id @default(cuid())
  voterId         String
  voter           Voter     @relation(fields: [voterId], references: [id], onDelete: Cascade)

  // Note content
  content         String    @db.Text
  type            String?   // followup, interested, not_interested, moved, etc.

  // Metadata
  createdById     String
  createdBy       User      @relation("CreatedBy", fields: [createdById], references: [id])
  campaignId      String?
  campaign        Campaign? @relation(fields: [campaignId], references: [id])

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([voterId])
  @@index([createdById])
  @@index([campaignId])
}

// ============================================================================
// CAMPAIGNS & CANVASSING
// ============================================================================

model Campaign {
  id              String    @id @default(cuid())
  name            String
  description     String?   @db.Text

  // Campaign scope
  status          String    @default("planning") // planning, active, paused, completed
  startDate       DateTime?
  endDate         DateTime?
  targetArea      String?   // Precinct, city, or geographic description

  // Target voters
  targetVoterCount Int?
  targetAreas     Json?     // GIS geometries or precinct IDs

  // Relations
  surveys         CampaignSurvey[]
  assignments     Assignment[]
  notes           VoterNote[]
  teams           Team[]    @relation("CampaignTeams")

  // Audit
  createdById     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status])
  @@index([startDate])
}

model CampaignSurvey {
  id              String    @id @default(cuid())
  campaignId      String
  campaign        Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  name            String
  description     String?   @db.Text

  // Survey structure
  questions       SurveyQuestion[]
  status          String    @default("draft") // draft, active, closed

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([campaignId])
}

model SurveyQuestion {
  id              String    @id @default(cuid())
  surveyId        String
  survey          CampaignSurvey @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  sequence        Int       // Order in survey
  question        String    @db.Text
  questionType    String    // text, multiple_choice, yes_no, rating, etc.
  required        Boolean   @default(true)

  // For multiple choice
  options         String[]  // ["Yes", "No", "Maybe"]

  // Relations
  responses       CampaignSurveyResponse[]

  createdAt       DateTime  @default(now())

  @@unique([surveyId, sequence])
  @@index([surveyId])
}

model CampaignSurveyResponse {
  id              String    @id @default(cuid())
  questionId      String
  question        SurveyQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  canvassResponseId String
  canvassResponse CanvassResponse @relation(fields: [canvassResponseId], references: [id], onDelete: Cascade)

  // Response value
  responseValue   String?   // Can be JSON for complex types

  createdAt       DateTime  @default(now())

  @@index([questionId])
  @@index([canvassResponseId])
}

model Assignment {
  id              String    @id @default(cuid())
  
  // Assignment target
  voterId         String
  voter           Voter     @relation(fields: [voterId], references: [id], onDelete: Cascade)

  // Assignment source
  campaignId      String
  campaign        Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  canvasserId     String
  canvasser       User      @relation("CanvasserAssignments", fields: [canvasserId], references: [id])

  // Status
  status          String    @default("assigned") // assigned, in_progress, completed, skipped
  completedAt     DateTime?

  // Metadata
  priority        Int       @default(0)
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([voterId, campaignId, canvasserId])
  @@index([campaignId])
  @@index([canvasserId])
  @@index([status])
  @@index([voterId])
}

model CanvassResponse {
  id              String    @id @default(cuid())
  
  // Assignment context
  assignmentId    String
  assignment      Assignment @relation(fields: [assignmentId], references: [id])
  voterId         String
  voter           Voter     @relation(fields: [voterId], references: [id], onDelete: Cascade)

  // Contact outcome
  contactOutcome  String    // contacted, not_home, refused, moved, invalid, etc.
  supportLevel    String?   // strong_support, lean_support, undecided, lean_oppose, strong_oppose

  // Survey
  surveyResponses CampaignSurveyResponse[]

  // Canvasser notes
  notes           String?   @db.Text
  followupNeeded  Boolean   @default(false)
  followupType    String?   // phone, email, visit, etc.

  // Metadata
  canvassedAt     DateTime  @default(now())
  duration        Int?      // seconds spent on interaction

  createdAt       DateTime  @default(now())

  @@index([voterId])
  @@index([assignmentId])
  @@index([canvassedAt])
}

// ============================================================================
// GEOGRAPHY & SPATIAL DATA
// ============================================================================

model Precinct {
  id              String    @id @default(cuid())
  
  // Identifiers
  name            String    // 01-12, Precinct 305, etc.
  countyCode      String    // CC for Contra Costa
  precinctNumber  String?
  
  // Metadata
  voterCount      Int?
  lastUpdated     DateTime?

  // Relations
  voters          Voter[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([countyCode, name])
  @@index([countyCode])
}

model GeoJsonFeature {
  id              String    @id @default(cuid())

  // Feature identification
  name            String    // Precinct 01, Parcel ABC123, etc.
  featureType     String    // precinct, parcel, neighborhood, district, boundary
  externalId      String?   // APN for parcels, official ID for precincts

  // Geometry
  geometry        String    @db.Text // GeoJSON geometry as JSON string
  geometryType    String    // Point, Polygon, MultiPolygon, LineString, etc.
  bounds          Json?     // { minLat, maxLat, minLon, maxLon } for spatial queries

  // Properties from source file
  properties      Json      // All @properties from GeoJSON

  // Relations
  importJobId     String
  importJob       ImportJob @relation(fields: [importJobId], references: [id], onDelete: Cascade)
  households      Household[]

  // Spatial indexing fields (denormalized for performance)
  centroidLat     Float?
  centroidLon     Float?

  createdAt       DateTime  @default(now())

  @@index([featureType])
  @@index([externalId])
  @@index([importJobId])
}

// ============================================================================
// DATA IMPORT & MANAGEMENT
// ============================================================================

model ImportJob {
  id              String    @id @default(cuid())

  // Metadata
  title           String
  dataType        String    // voter_file, processed_data, geojson
  county          String?   // Contra Costa, San Mateo, etc.
  fileName        String
  fileHash        String    @unique  // Prevent re-import
  fileSize        BigInt?

  // Import results
  status          String    // pending, processing, completed, failed, rolled_back
  recordsProcessed Int      @default(0)
  recordsInserted Int       @default(0)
  recordsUpdated  Int       @default(0)
  recordsSkipped  Int       @default(0)
  recordsFailed   Int       @default(0)

  // Error tracking
  errorLog        Json?     // [{ row, field, message }, ...]
  validationRules String?   // Name of validation profile used

  // Field mapping (for processed data)
  fieldMapping    Json?     // { file_column: voter_field, ... }

  // Relations
  userId          String
  user            ImportJob? @relation(fields: [userId], references: [id])
  geoJsonFeatures GeoJsonFeature[]

  // Audit
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  startedAt       DateTime?

  @@index([userId])
  @@index([status])
  @@index([dataType])
  @@index([createdAt])
}

model ImportMapping {
  id              String    @id @default(cuid())

  // Template info
  name            String    @unique // "Contra Costa Voter File", "Custom CSV", etc.
  description     String?
  dataType        String    // voter_file, csv, json, geojson
  source          String?   // "contra_costa", "custom_org", etc.
  version         Int       @default(1)

  // Field mapping configuration
  mapping         Json      // { headers: [...], fieldMappings: {...} }
  requiredFields  String[]  // Fields that must be present
  fieldTypes      Json?     // { first_name: "string", dob: "date" }
  defaultValues   Json?     // { state: "CA", status: "active" }

  // Validation rules
  validationRules Json?

  // Usage tracking
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([dataType])
}

// ============================================================================
// TEAMS & ORGANIZATION
// ============================================================================

model Team {
  id              String    @id @default(cuid())
  name            String
  description     String?

  // Leadership
  teamLeadId      String
  teamLead        User      @relation("TeamLead", fields: [teamLeadId], references: [id])

  // Members
  members         User[]    @relation("TeamMembers")

  // Campaign assignments
  campaigns       Campaign[] @relation("CampaignTeams")

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([teamLeadId])
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

model AuditLog {
  id              String    @id @default(cuid())

  // Actor
  userId          String
  user            User      @relation(fields: [userId], references: [id])

  // Action
  action          String    // viewed_voter, exported_data, edited_campaign, etc.
  resource        String    // resource type: voter, campaign, etc.
  resourceId      String    // ID of resource affected

  // Changes
  changes         Json?     // { field: { before, after }, ... }
  context         Json?     // Additional context

  // Request info
  ipAddress       String?
  userAgent       String?
  status          String?   // success, failure, partial

  // Timestamp for compliance
  createdAt       DateTime  @default(now())

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

model SystemSettings {
  id              String    @id @default(cuid())
  key             String    @unique
  value           String    @db.Text // JSON for complex values
  description     String?
  isSecret        Boolean   @default(false)

  updatedAt       DateTime  @updatedAt
  createdAt       DateTime  @default(now())

  @@index([key])
}
```

---

## Key Design Decisions

### 1. Voter Information Storage

**Public vs PII**:
- All voter data stored encrypted at application layer
- `phone`, `email` encrypted as strings in database
- Decryption happens only for authorized users
- Audit log tracks PII access

**Fixed-width vs Flexible**:
- Standard fields for core voter data (name, address, status)
- `customFields` JSON column for enrichment data (engagement scores, volunteer interest, etc.)
- Allows flexibility without schema migration

### 2. Custom Fields Pattern

```prisma
// Instead of:
// - engagement_score DECIMAL
// - volunteer_interest BOOLEAN
// - predicted_turnout STRING
// - etc... (constantly new fields)

// Use:
customFields Json?  // { "engagement_score": 8, "volunteer": true, ... }
```

**Benefits**:
- No schema migration for new fields
- Works with both SQLite and PostgreSQL
- Can be validated and indexed at application level

### 3. Audit Trail

Every sensitive action logged:
- Voter record viewed (with PII access flagged)
- Data exported
- Campaign created/modified
- User role changed
- Failed login attempts
- etc.

Retention: 90 days by default (configurable).

### 4. Relationships: Voter → Household

Many voter records can live at the same address. Household groups them for:
- Assignment efficiency (send one canvasser to whole household)
- Analytics (household-level engagement scores)
- Duplicate detection

### 5. Import Job Tracking

Every data import creates an `ImportJob` record:
- File hash prevents duplicate imports
- Error log captures problematic rows
- Allows rollback if needed
- Audit trail of who imported what, when

### 6. GeoJSON Flexibility

`GeoJsonFeature` supports:
- Points (voter locations)
- Polygons (precincts, parcels, districts)
- LineStrings (boundaries, routes)
- Any GeoJSON properties stored as JSON
- Supports future geometry types without schema change

---

## Indexes & Performance

### Critical Indexes
```
Voter:
  - (lastName, firstName)      [search]
  - (address, city, zip)       [address lookup, duplicate detection]
  - precinct                   [geographic filtering]
  - partyAffiliation           [demographic analysis]
  - status                     [active voter filtering]
  - householdId                [household grouping]

Assignment:
  - (voterId, campaignId, canvasserId) [unique constraint]
  - campaignId                 [campaign filtering]
  - canvasserId                [canvasser assignment list]
  - status                     [progress tracking]

CanvassResponse:
  - voterId                    [voter history]
  - canvassedAt                [time-range queries]

AuditLog:
  - userId                     [user activity]
  - action                     [activity type]
  - createdAt                  [time-range queries]
```

### Full-Text Search (PostgreSQL only)
```
Voter: Full-text index on (firstName, lastName, address)
Allows: "John Smith 123 Main" searches efficiently
SQLite: Use LIKE or FTS virtual table for similar functionality
```

### Spatial Indexes (PostgreSQL with PostGIS)
```
GeoJsonFeature:
  - Spatial index on geometry (if using PostGIS)
  - Enables: "find all features within bounds" queries
SQLite:
  - Denormalized centroidLat/Lon + bounding box for spatial filtering
  - Simple R-tree index on coordinates
```

---

## SQLite vs PostgreSQL Differences

### Performance Implications

| Feature | SQLite | PostgreSQL |
|---------|--------|-----------|
| Max connection | 1 (concurrent writes limited) | 100+ |
| Full-text search | Basic (FTS5) | Advanced (tsearch2) |
| Spatial queries | Approximate (no real GIS) | Native (PostGIS) |
| JSON queries | Basic path access | Advanced operators |
| Concurrent writes | ⚠️ Serialized | ✓ MVCC |
| Typical deployment | Single user, local dev | Multi-user, production |

### Schema Adjustments

```prisma
// For PostgreSQL:
geometry String @db.Text      // Can upgrade to actual Geometry type
fulltext index on (firstName, lastName)

// For SQLite:
geometry String                // Store as WKT or GeoJSON
// Use application-level indexing for full-text search
```

---

## Schema Migration Strategy (Per PHASE_PLAN.md)

### Phase 1: Foundation (6 tables - Single-Tenant MVP)
```
- User, Session (authentication only - no Role/Permission)
- Campaign (basic campaign info, single-tenant)
- Job (generic async job queue - import, geocoding, etc.)
- AuditLog (audit trail for all operations)
- Setting (system configuration)
(NOTE: Organization removed - single-tenant for Phase 1-4 MVP)
```

### Phase 2: Voter Data (+3 tables = 9 total)
```
ADD:
- Voter (core voter records)
- VoterNote (contact notes)
- ImportJob (voter file import tracking)
MODIFY:
- Job: may be specialized or ImportJob used alongside
```

### Phase 3: Geographic Data (+2 tables = 11 total)
```
ADD:
- GeoJsonFeature (precinct, parcel shapes)
- GeocodingJob (batch geocoding progress tracking)
MODIFY:
- Voter: add latitude, longitude, geocoded, precinct
```

### Phase 4: MVP - Households & Map (+1 table = 12 total)
```
ADD:
- Household (group voters by address for mapping efficiency)
MODIFY:
- Voter: add householdId
```

### NOT in MVP (Phase 5+)
```
- Role, Permission (RBAC - simple admin-only in Phase 1)
- VoterHistory (election participation - defer)
- Campaign Surveys (defer full survey system)
- Team (defer team management)
- Precinct (as separate model - use GeoJsonFeature polygon)
- CampaignSurvey, SurveyQuestion (defer)
- CanvassResponse (defer full response system)
```

---

## Backup & Recovery

### Database Exports
```bash
# PostgreSQL
pg_dump -U postgres cocoa_canvas > backup.sql

# SQLite
sqlite3 cocoa_canvas.db ".backup backup.db"
```

### Sensitive Data in Backups
- Backup contains encrypted PII (safe as-is)
- Encryption keys stored separately (NOT in backup)
- Backups are immutable (write-once storage)

### Rollback Capability
- `ImportJob` status = "rolled_back" allows undo
- Deleted records kept in soft-delete style initially (future)

---

## Getting Started

### Initialize Schema

```bash
# 1. Copy schema above to prisma/schema.prisma

# 2. Configure database
cp .env.example .env.local
# Edit DATABASE_URL to point to your database

# 3. Create database (SQLite auto-creates, PostgreSQL needs manual setup)
psql -c "CREATE DATABASE cocoa_canvas;"

# 4. Run migrations
npx prisma migrate dev --name init

# 5. Generate client
npx prisma generate

# 6. Open studio (optional, for manual data viewing)
npx prisma studio
```

### Testing Schema

```bash
# Seed with test data
npx prisma db seed

# Run tests
npm run test:db
```

---

## Notes

- **Single-tenant MVP**: Phase 1-4 assumes single Cocoa County organization. Multi-tenancy (organizationId) deferred to Phase 5+
- **Admin-only auth in Phase 1**: RBAC (Role/Permission models) not implemented until Phase 2+
- **Soft deletes**: Not implemented yet (future: add `deletedAt` field if needed)
- **Versioning**: `sourceVersion` on Voter allows tracking data updates from imports
- **Extensibility**: JSON columns (`customFields`, `properties`) allow flexibility without schema changes
- **Compliance**: Audit logging enables GDPR, CCPA, and state privacy law compliance
- **See PHASE_PLAN.md** for which models/fields to implement in each phase

---

## References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostGIS Geometry Types](https://postgis.net/docs/reference.html)
- [SQLite Full-Text Search](https://www.sqlite.org/fts5.html)
