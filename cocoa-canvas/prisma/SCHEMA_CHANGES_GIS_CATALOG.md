# Prisma Schema Changes for GIS Dataset Catalog

## Overview

This document outlines the required schema changes to support the GIS Dataset Catalog feature. The changes add support for managing spatial datasets (parcels, precincts, demographics), election-specific precinct boundaries, and election results.

## Implementation Status

**Phase 1: Foundation (Completed ✅)**
- ElectionType option group model
- DatasetType option group model
- CRUD API endpoints for both option groups
- Admin UI with categorized management interface
- Seed scripts with default values
- Startup integration for automatic seeding

**Phase 2: GIS Catalog (Pending)**
- GISDataset catalog registry
- Contest and ContestChoice models  
- ParcelDataset, PrecinctDataset, DemographicDataset metadata models
- ElectionResult tracking
- Import processors
- Catalog UI and API

## Analysis of Existing Schema

### Existing Models We'll Extend/Connect To:

- ✅ **Election** - Already exists, needs enhancement for catalog features
- ✅ **Precinct** - Already exists, but simplified (no geometry or election context)
- ✅ **Parcel** - Already exists with geometry field (JSON string)
- ✅ **Household** - Has geocoding support (latitude, longitude, geocodingProvider)
- ✅ **User** - For tracking dataset creators
- ✅ **Job** - For import/processing jobs

### What Needs to Be Added:

1. **GISDataset** - Core catalog registry for all spatial datasets
2. **ParcelDataset** - Field mappings for parcel datasets
3. **PrecinctDataset** - Links precinct geometries to specific elections
4. **DemographicDataset** - Census and demographic data metadata
5. **Contest** - Contests within elections (races, measures)
6. **ContestChoice** - Choices within contests (candidates, yes/no)
7. **ElectionResult** - Non-spatial election results linked to precinct geometries
8. **Enums** - GeometryType only (ElectionType and DatasetType are configurable option groups)

### What Has Been Implemented:

✅ **ElectionType** - Option group model for election types (Primary, General, Special, etc.)
✅ **DatasetType** - Option group model for dataset types (Parcel, Precinct, Demographic, etc.)
✅ **API Endpoints** - CRUD operations for both option groups
✅ **Seed Scripts** - Default values for election types and dataset types
✅ **Admin UI** - Management interface for both option groups

## Proposed Schema Additions

### 1. Add Enums

```prisma
// PostGIS geometry types (fixed values from PostGIS specification)
enum GeometryType {
  POINT
  LINESTRING
  POLYGON
  MULTIPOINT
  MULTILINESTRING
  MULTIPOLYGON
  GEOMETRYCOLLECTION
}
```

### 2. Option Groups (Already Implemented ✅)

Election Types and Dataset Types are **configurable option groups**, not enums. This allows users to customize these lists through the admin UI.

```prisma
// Election Types - Configurable option group
model ElectionType {
  id           String  @id @default(cuid())
  name         String  @unique // "Primary", "General", "Special", "Runoff", "Recall", "Local"
  description  String? @db.Text
  isActive     Boolean @default(true)
  displayOrder Int     @default(0)

  // Relations
  elections    Election[] // Elections using this type

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive])
  @@index([displayOrder])
  @@map("election_types")
}

// Dataset Types - Configurable option group
model DatasetType {
  id           String  @id @default(cuid())
  name         String  @unique // "Parcel", "Precinct", "Demographic", "Boundary", "Infrastructure", "Tabular", "Custom"
  description  String? @db.Text
  category     String? // "vector", "raster", "tabular", "other"
  isActive     Boolean @default(true)
  displayOrder Int     @default(0)

  // Relations
  datasets     GISDataset[] // Datasets using this type

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive])
  @@index([displayOrder])
  @@index([category])
  @@map("dataset_types")
}
```

**Default Values** (seeded on startup):
- **Election Types**: Primary, General, Special, Runoff, Recall, Local
- **Dataset Types**: Parcel, Precinct, Demographic, Boundary, Infrastructure, Tabular, Custom

**Management**:
- API: `/api/v1/admin/option-groups/election-types` and `/api/v1/admin/option-groups/dataset-types`
- UI: `/admin/option-groups` (Political & Campaign and Geographic & Spatial categories)

### 3. Core Dataset Registry

```prisma
/// Core dataset registry - all GIS and tabular datasets
/// NOTE: This is CATALOG data, NOT directly linked to app entities
/// App models (Parcel, Precinct) are populated by "syncing" from catalog
model GISDataset {
  id              String        @id @default(cuid())
  name            String        @unique
  description     String?       @db.Text
  
  // Link to configurable DatasetType option group
  datasetTypeId   String
  datasetType     DatasetType   @relation(fields: [datasetTypeId], references: [id])
  
  // PostGIS Integration
  // References dynamically created PostGIS tables (not in Prisma schema)
  sourceTable     String?       // e.g., "gis_abc123def456" (actual PostGIS table)
  geometryColumn  String?       @default("geom")
  geometryType    GeometryType?
  srid            Int           @default(4326) // WGS84 by default
  
  // Spatial extent (for quick map bounds)
  boundingBox     Json?         // {minX, minY, maxX, maxY}
  recordCount     Int?
  
  // Organization
  tags            String[]      // Searchable tags
  category        String?       // "Property", "Political", "Demographics"
  isActive        Boolean       @default(true)
  isPublic        Boolean       @default(false)
  
  // Sync tracking (has this been synced to app models?)
  syncedToApp     Boolean       @default(false)
  lastSyncedToAppAt DateTime?
  syncedRecordCount Int?        // How many records synced to app
  
  // Metadata (flexible storage for dataset-specific attributes)
  metadata        Json?
  
  // Tracking
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  createdById     String?
  createdBy       User?         @relation(fields: [createdById], references: [id])
  
  // Relations (one-to-one with type-specific metadata)
  parcelDataset       ParcelDataset?
  precinctDataset     PrecinctDataset?
  demographicDataset  DemographicDataset?
  
  // Relations to app models (optional tracking)
  parcelsSourced      Parcel[]    // Parcels that came from this dataset
  precinctsSourced    Precinct[]  // Precincts that came from this dataset
  
  @@map("gis_datasets")
  @@index([datasetTypeId])
  @@index([isActive])
  @@index([category])
  @@index([syncedToApp])
}
```

### 4. Type-Specific Metadata Models

#### Parcel Datasets

```prisma
/// Parcel-specific metadata and field mappings
/// Maps to columns in the dynamically-created PostGIS parcel table
model ParcelDataset {
  id              String      @id @default(cuid())
  datasetId       String      @unique
  dataset         GISDataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  // Field mappings (column names in source PostGIS table)
  apnField            String   @default("apn")        // Assessor Parcel Number
  addressField        String?  @default("address")
  cityField           String?  @default("city")
  zipField            String?  @default("zip")
  ownerField          String?  @default("owner")
  assessedValueField  String?  @default("assessed_value")
  landUseField        String?  @default("land_use")
  landUseCodeField    String?  @default("land_use_code")
  yearBuiltField      String?  @default("year_built")
  squareFeetField     String?  @default("square_feet")
  lotSizeField        String?  @default("lot_size")
  bedroomsField       String?  @default("bedrooms")
  bathroomsField      String?  @default("bathrooms")
  
  // Data source information
  sourceAgency    String?     // "Contra Costa County Assessor"
  sourceUrl       String?
  lastUpdated     DateTime?
  updateFrequency String?     // "quarterly", "annually"
  licenseInfo     String?     @db.Text
  
  @@map("parcel_datasets")
}
```

#### Precinct Datasets

```prisma
/// Precinct-specific metadata - supports election-specific boundaries
/// Different elections may have different precinct boundaries!
model PrecinctDataset {
  id              String      @id @default(cuid())
  datasetId       String      @unique
  dataset         GISDataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  // Election context (null = current/default precinct boundaries)
  electionId      String?
  election        Election?   @relation(fields: [electionId], references: [id])
  
  // Field mappings (column names in source PostGIS table)
  precinctIdField     String  @default("precinct_id")
  precinctNameField   String? @default("precinct_name")
  jurisdictionField   String? @default("jurisdiction")
  
  // Data source
  sourceAgency    String?     // "County Registrar of Voters"
  sourceUrl       String?
  effectiveDate   DateTime?   // When these boundaries took effect
  
  // Relations
  electionResults ElectionResult[]
  
  @@map("precinct_datasets")
  @@index([electionId])
}
```

#### Demographic Datasets

```prisma
/// Demographic dataset metadata (Census, ACS, etc.)
model DemographicDataset {
  id              String      @id @default(cuid())
  datasetId       String      @unique
  dataset         GISDataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  // Data source details
  source          String      // "US Census 2020", "ACS 5-Year 2018-2022"
  year            Int         // Reference year
  geographyLevel  String      // "block", "block_group", "tract", "zip", "county"
  
  // Field mappings (common demographic fields)
  geoIdField          String? @default("geoid")
  populationField     String? @default("total_population")
  householdsField     String? @default("households")
  medianIncomeField   String? @default("median_income")
  medianAgeField      String? @default("median_age")
  
  // Race/ethnicity fields
  whiteField          String? @default("white_pop")
  blackField          String? @default("black_pop")
  asianField          String? @default("asian_pop")
  hispanicField       String? @default("hispanic_pop")
  
  // Housing fields
  ownerOccupiedField  String? @default("owner_occupied")
  renterOccupiedField String? @default("renter_occupied")
  medianHomeValueField String? @default("median_home_value")
  
  // Additional field mappings in JSON
  customFields    Json?       // Flexible storage for additional mappings
  
  @@map("demographic_datasets")
}
```

### 5. Election Structure (Contests & Choices)

```prisma
/// Contest within an election (office, ballot measure, etc.)
/// Contests can have different geographic boundaries than their parent election
model Contest {
  id              String      @id @default(cuid())
  
  // Which election
  electionId      String
  election        Election    @relation(fields: [electionId], references: [id], onDelete: Cascade)
  
  // Contest details
  name            String      // "Governor", "Mayor", "Proposition 1", "District 5 Council"
  contestType     String      // "office", "ballot_measure", "judicial"
  district        String?     // "Statewide", "Oakland", "District 5", etc.
  
  // Geographic scope (can differ from election)
  // For statewide: null (uses election boundaries)
  // For city/district: can link to specific geometry dataset
  districtDatasetId String?
  districtDataset   GISDataset? @relation(fields: [districtDatasetId], references: [id])
  
  // Metadata
  description     String?     @db.Text
  seatName        String?     // "Seat A", "Position 3" for multi-seat races
  isPartisan      Boolean     @default(true)
  votingMethod    String?     // "plurality", "ranked_choice", "top_two"
  
  // Relations
  choices         ContestChoice[]
  results         ElectionResult[]
  
  createdAt       DateTime    @default(now())
  
  @@unique([electionId, name, district])
  @@index([electionId])
  @@index([contestType])
  @@map("contests")
}

/// Choice in a contest (candidate or ballot option)
model ContestChoice {
  id              String      @id @default(cuid())
  
  // Which contest
  contestId       String
  contest         Contest     @relation(fields: [contestId], references: [id], onDelete: Cascade)
  
  // Choice details
  name            String      // "Gavin Newsom", "Yes", "No"
  choiceType      String      @default("candidate") // "candidate", "yes", "no"
  partyAffiliation String?    // "Democratic", "Republican", null for non-partisan
  
  // Display order
  displayOrder    Int?
  
  // Metadata
  isIncumbent     Boolean     @default(false)
  isWinner        Boolean     @default(false) // Overall winner
  
  // Relations
  results         ElectionResult[]
  
  createdAt       DateTime    @default(now())
  
  @@unique([contestId, name])
  @@index([contestId])
  @@map("contest_choices")
}

/// Election results - vote counts by precinct, contest, and choice
model ElectionResult {
  id                  String      @id @default(cuid())
  
  // Which contest and choice
  contestId           String
  contest             Contest     @relation(fields: [contestId], references: [id], onDelete: Cascade)
  
  choiceId            String
  choice              ContestChoice @relation(fields: [choiceId], references: [id], onDelete: Cascade)
  
  // Precinct link (to dataset containing geometry)
  precinctDatasetId   String
  precinctDataset     PrecinctDataset @relation(fields: [precinctDatasetId], references: [id])
  precinctIdentifier  String      // Actual precinct ID/number (e.g., "PCT-4201")
  
  // Results
  voteCount           Int
  totalVotes          Int?        // Total votes cast in this precinct for this contest
  percentage          Float?      // Calculated: voteCount / totalVotes
  
  // Metadata
  createdAt           DateTime    @default(now())
  
  @@unique([contestId, choiceId, precinctIdentifier])
  @@index([contestId])
  @@index([choiceId])
  @@index([precinctDatasetId, precinctIdentifier])
  @@map("election_results")
}
```

### 6. Enhance Existing Election Model

```prisma
// Add to existing Election model:

model Election {
  id              String      @id @default(cuid())
  
  // EXISTING FIELDS (keep as-is)
  electionDate    DateTime @unique // The actual election date
  electionAbbr    String?  @unique
  electionDesc    String?
  electionType    String?     // Legacy field - keep for backward compatibility
  jurisdictionCode String?
  
  // NEW FIELDS FOR CATALOG
  name            String?     // "November 8, 2022 General Election"
  shortName       String?     // "2022 General"
  
  // Link to configurable ElectionType option group
  electionTypeId  String?
  electionTypeRef ElectionType? @relation(fields: [electionTypeId], references: [id])
  
  jurisdiction    String?     // "California", "Contra Costa County", "Oakland"
  districtLevel   String?     // "statewide", "county", "city", "district"
  description     String?     @db.Text
  isActive        Boolean     @default(true)
  
  // EXISTING RELATIONS
  voteHistory     VoteHistory[]
  
  // NEW RELATIONS
  contests         Contest[]          // Races/measures on this election date
  precinctDatasets PrecinctDataset[]  // Precinct boundaries for this election
  
  createdAt       DateTime    @default(now())
  
  @@index([electionDate])
  @@index([jurisdiction])
  @@map("elections")
}
```

## Integration Points

### Two-Tier Architecture: Catalog vs Application Data

**CRITICAL DESIGN DECISION**: Maintain clear separation between catalog and app data.

#### Tier 1: Catalog (Import Archive)
- **GISDataset** + dynamic PostGIS tables = raw imported data
- Read-only, versioned, immutable
- Multiple datasets can coexist ("Contra Costa Parcels 2023", "2024", etc.)
- NOT directly linked to Household, Person, etc.
- Purpose: Import, preview, validate, analyze

#### Tier 2: Application Data (Operational)
- **Parcel**, **Precinct** models = active working data
- Mutable, linked to other entities
- Single "current" dataset in production use
- Populated by "syncing" from catalog

#### Sync Workflow:

```
1. Import Shapefile → Create GISDataset + PostGIS table (Catalog)
2. Preview/Validate → User reviews in catalog UI
3. User Action: "Sync to App" → Background job copies data
4. Copy/Transform → Catalog records → Parcel/Precinct models
5. Link/Geocode → Now can link to Households, assign to Voters
```

### Tracking Syncs (Add to Models):

```prisma
// Add to existing Parcel model:
model Parcel {
  // ... existing fields ...
  
  // NEW: Track which catalog dataset this came from
  sourceDatasetId String?
  sourceDataset   GISDataset? @relation(fields: [sourceDatasetId], references: [id])
  syncedAt        DateTime?   // When it was copied from catalog
  
  // ... rest of model ...
}

// Add to existing Precinct model:
model Precinct {
  // ... existing fields ...
  
  // NEW: Track which catalog dataset this came from
  sourceDatasetId String?
  sourceDataset   GISDataset? @relation(fields: [sourceDatasetId], references: [id])
  syncedAt        DateTime?
  
  // ... rest of model ...
}
```

### How Catalog Integrates with Existing Models:

1. **GISDataset → User**: Tracks who created/imported each dataset
2. **GISDataset ← Parcel**: (Optional) Tracks which catalog dataset populated app parcels
3. **GISDataset ← Precinct**: (Optional) Tracks which catalog dataset populated app precincts
4. **PrecinctDataset → Election**: Links precinct datasets to specific elections
5. **ElectionResult → Contest → Election**: Links vote totals through contest hierarchy
6. **ElectionResult → PrecinctDataset**: Links results to precinct geometries (catalog, not app Precinct model)
7. **Job.type**: Add new types: `"import_parcel"`, `"import_precinct"`, `"import_demographic"`, `"sync_parcels_to_app"`, `"sync_precincts_to_app"`

### Benefits of This Architecture:

✅ **No Breaking Changes**: Existing Parcel/Household links unaffected  
✅ **Multiple Versions**: Import 2024 parcels while 2023 still in use  
✅ **Preview First**: Review data quality before it affects app  
✅ **Audit Trail**: Know exactly which import populated app data  
✅ **Rollback**: Keep old catalog datasets, can re-sync if needed  
✅ **Incremental Updates**: Sync only changed parcels  
✅ **Data Validation**: Validate in catalog before promoting to app

## Sync Workflow Example

### Step 1: Import Parcel Dataset (Create Catalog Entry)

```typescript
// Get the Parcel dataset type from option groups
const parcelType = await prisma.datasetType.findUnique({
  where: { name: "Parcel" }
});

// Import job creates catalog entry + PostGIS table
const dataset = await prisma.gISDataset.create({
  data: {
    name: "Contra Costa County Parcels 2024",
    datasetTypeId: parcelType.id,
    sourceTable: "gis_abc123",  // PostGIS table with 98,432 parcels
    geometryType: "MULTIPOLYGON",
    recordCount: 98432,
    syncedToApp: false,  // Not yet in app
    parcelDataset: {
      create: {
        apnField: "apn",
        addressField: "site_addr",
        assessedValueField: "total_value"
      }
    }
  }
});

// User can now preview in catalog UI
// View on map, browse attributes, validate data quality
```

### Step 2: Sync to Application (Background Job)

```typescript
// User clicks "Sync to App" button
const job = await createJob("sync_parcels_to_app", userId, { 
  datasetId: dataset.id,
  strategy: "replace" // or "merge", "update"
});

// Background processor:
async function syncParcelsToApp(datasetId: string) {
  const dataset = await prisma.gISDataset.findUnique({
    where: { id: datasetId },
    include: { parcelDataset: true }
  });
  
  // Query catalog PostGIS table
  const catalogParcels = await prisma.$queryRawUnsafe(`
    SELECT 
      ${dataset.parcelDataset.apnField} as apn,
      ${dataset.parcelDataset.addressField} as address,
      ${dataset.parcelDataset.assessedValueField} as assessed_value,
      ST_AsGeoJSON(geom) as geometry,
      ST_Y(ST_Centroid(geom)) as lat,
      ST_X(ST_Centroid(geom)) as lon
    FROM ${dataset.sourceTable}
  `);
  
  // Copy into app Parcel model
  for (const cp of catalogParcels) {
    await prisma.parcel.upsert({
      where: { apn_externalSource: { apn: cp.apn, externalSource: "catalog" } },
      create: {
        apn: cp.apn,
        fullAddress: cp.address,
        geometry: cp.geometry,
        centroidLatitude: cp.lat,
        centroidLongitude: cp.lon,
        externalSource: "catalog",
        sourceDatasetId: datasetId,  // NEW FIELD: Track origin
        syncedAt: new Date()          // NEW FIELD: When synced
      },
      update: {
        fullAddress: cp.address,
        geometry: cp.geometry,
        sourceDatasetId: datasetId,
        syncedAt: new Date()
      }
    });
  }
  
  // Update dataset sync status
  await prisma.gISDataset.update({
    where: { id: datasetId },
    data: {
      syncedToApp: true,
      lastSyncedToAppAt: new Date(),
      syncedRecordCount: catalogParcels.length
    }
  });
}

// Now Parcels are in app and can be linked to Households
```

### Step 3: Link to Households (Spatial Join)

```typescript
// Separate job: match households to parcels
const households = await prisma.household.findMany({
  where: { parcelId: null, latitude: { not: null } }
});

for (const hh of households) {
  // Find parcel containing this household point
  const [parcel] = await prisma.$queryRaw`
    SELECT id FROM parcels
    WHERE ST_Contains(
      ST_GeomFromGeoJSON(geometry),
      ST_SetSRID(ST_MakePoint(${hh.longitude}, ${hh.latitude}), 4326)
    )
    LIMIT 1
  `;
  
  if (parcel) {
    await prisma.household.update({
      where: { id: hh.id },
      data: { parcelId: parcel.id }
    });
  }
}
```

## Database Changes Summary

### New Tables (via Prisma Migration):
- `gis_datasets`
- `parcel_datasets`
- `contests`
- `contest_choices`
- `precinct_datasets`
- `demographic_datasets`
- `election_results`

### Modified Tables:
- `elections` - Add new fields for catalog integration
- `parcels` - Add `sourceDatasetId`, `syncedAt` to track catalog origin
- `precincts` - Add `sourceDatasetId`, `syncedAt` to track catalog origin

### New Enums:
- `GeometryType`

### New Option Group Models (Already Implemented ✅):
- `ElectionType` - Configurable election types
- `DatasetType` - Configurable dataset types

### Dynamic PostGIS Tables (Created by Import Jobs):
- NOT in Prisma schema
- Created via raw SQL: `CREATE TABLE gis_abc123...`
- Tracked in `gis_datasets.sourceTable` field
- Examples: `gis_contra_costa_parcels_2024`, `gis_precincts_2022_primary`

## Migration Strategy

### Phase 1: Core Catalog
```bash
# Create migration
cd cocoa-canvas
npm run db:migrate -- --name add_gis_catalog

# This will:
# - Add new models: GISDataset, ParcelDataset, PrecinctDataset, etc.
# - Add new enums
# - Enhance Election model
# - Create indexes
```

### Phase 2: Data Population
```bash
# After migration, optionally create catalog entries for existing data:
# - Create GISDataset entry referencing existing Parcel table
# - Create Election catalog entries for historical elections
```

### Phase 3: Import System
```bash
# Implement import processors that:
# - Accept shapefiles, GeoJSON, GeoPackage
# - Create dynamic PostGIS tables
# - Create Data Structure

### Election with Multiple Contests (Different Geographies)

```typescript
// Get the General election type from option groups
const generalType = await prisma.electionType.findUnique({
  where: { name: "General" }
});

// November 8, 2022 General Election
const election = await prisma.election.create({
  data: {
    name: "November 8, 2022 General Election",
    shortName: "2022 General",
    electionDate: new Date("2022-11-08"),
    electionTypeId: generalType.id,
    jurisdiction: "California",
    districtLevel: "statewide",
    contests: {
      create: [
        {
          // Statewide race
          name: "Governor",
          contestType: "office",
          district: "Statewide",
          isPartisan: true,
          choices: {
            create: [
              { name: "Gavin Newsom", partyAffiliation: "Democratic" },
              { name: "Brian Dahle", partyAffiliation: "Republican" }
            ]
          }
        },
        {
          // Statewide ballot measure
          name: "Proposition 1 - Reproductive Freedom",
          contestType: "ballot_measure",
          district: "Statewide",
          isPartisan: false,
          choices: {
            create: [
              { name: "Yes", choiceType: "yes" },
              { name: "No", choiceType: "no" }
            ]
          }
        },
        {
          // City-specific race (different geography!)
          name: "Mayor",
          contestType: "office",
          district: "Oakland",
          // districtDatasetId: <oakland_boundary_dataset_id>,
          isPartisan: false,
          votingMethod: "ranked_choice",
          choices: {
            create: [
              { name: "Sheng Thao" },
              { name: "Loren Taylor" },
              { name: "Treva Reid" }
            ]
          }
        }
      ]
    }
  }
});
```

### Importing Election Results

```typescript
// Import results CSV: precinct_id, contest_name, choice_name, vote_count
const results = [
  { precinctId: "PCT-4201", contest: "Governor", choice: "Gavin Newsom", votes: 324 },
  { precinctId: "PCT-4201", contest: "Governor", choice: "Brian Dahle", votes: 156 },
  { precinctId: "PCT-4201", contest: "Mayor", choice: "Sheng Thao", votes: 198 },
  // ...
];

for (const row of results) {
  const contest = await prisma.contest.findFirst({
    where: { electionId, name: row.contest }
  });
  
  const choice = await prisma.contestChoice.findFirst({
    where: { contestId: contest.id, name: row.choice }
  });
  
  await prisma.electionResult.create({
    data: {
      contestId: contest.id,
      choiceId: choice.id,
      precinctDatasetId: precinctDatasetId,
      precinctIdentifier: row.precinctId,
      voteCount: row.votes
    }
  });
}
```

### Querying Results by Geography

```typescript
// Get Governor race results for Oakland precincts
const oaklandPrecinctIds = await getPrecinctIdsInCity("Oakland"); // Spatial query

const results = await prisma.electionResult.findMany({
  where: {
    contest: {
      name: "Governor",
      electionId: electionId
    },
    precinctIdentifier: { in: oaklandPrecinctIds }
  },
  include: {
    choice: true,
    contest: true
  }
});
```

## Example GISDataset + type-specific metadata records
# - Process in background via Job system
```

## Example Usage

### Creating a Parcel Dataset Catalog Entry

```typescript
// Get the Parcel dataset type from option groups
const parcelType = await prisma.datasetType.findUnique({
  where: { name: "Parcel" }
});

// After importing Contra Costa parcels into PostGIS table "gis_abc123"
const dataset = await prisma.gISDataset.create({
  data: {
    name: "Contra Costa County Parcels 2024",
    description: "Property parcels with assessment data",
    datasetTypeId: parcelType.id,
    sourceTable: "gis_abc123",
    geometryColumn: "geom",
    geometryType: "MULTIPOLYGON",
    srid: 4326,
    recordCount: 98432,
    boundingBox: { minX: -122.5, minY: 37.8, maxX: -121.9, maxY: 38.2 },
    tags: ["parcels", "property", "contra-costa"],
    category: "Property",
    isActive: true,
    createdById: userId,
    parcelDataset: {
      create: {
        apnField: "apn",
        addressField: "site_addr",
        assessedValueField: "total_value",
        landUseField: "land_use_desc",
        sourceAgency: "Contra Costa County Assessor",
        sourceUrl: "https://ccmap.us/",
        updateFrequency: "quarterly"
      }
    }
  }
});
```

### Querying Features from a Dataset

```typescript
// Get dataset metadata
const dataset = await prisma.gISDataset.findUnique({
  where: { id: datasetId },
  include: { parcelDataset: true }
});

// Query the PostGIS table for features in bounding box
const features = await prisma.$queryRawUnsafe(`
  SELECT 
    id,
    ${dataset.parcelDataset.apnField} as apn,
    ${dataset.parcelDataset.addressField} as address,
    ${dataset.parcelDataset.assessedValueField} as assessed_value,
    ST_AsGeoJSON(${dataset.geometryColumn}) as geometry
  FROM ${dataset.sourceTable}
  WHERE ${dataset.geometryColumn} && ST_MakeEnvelope($1, $2, $3, $4, $5)
  LIMIT 100
`, bbox.minX, bbox.minY, bbox.maxX, bbox.maxY, dataset.srid);
```

## Security Considerations

1. **Table Name Sanitization**: Always validate `sourceTable` before using in queries
2. **User Permissions**: Check `createdById` / role before allowing dataset deletion
3. **Rate Limiting**: Limit feature query endpoints
4. **Audit Logging**: Log all dataset create/delete operations via AuditLog

## Next Steps

1. ✅ Review this proposal
2. ✅ Implement ElectionType and DatasetType as option groups (completed)
3. ✅ Create API endpoints for option groups (completed)
4. ✅ Create admin UI for managing option groups (completed)
5. ✅ Add seed scripts for default values (completed)
6. [ ] Create Prisma migration for GIS catalog models (GISDataset, Contest, etc.)
7. [ ] Test migration on dev database
8. [ ] Implement import processors
9. [ ] Build catalog API endpoints
10. [ ] Create catalog UI

## Questions to Resolve

1. ✅ **Catalog vs App Data**: RESOLVED - Maintain clear separation. Catalog is import archive, app models (Parcel/Precinct) are working data. Sync via background job.
2. ✅ **Precinct/Parcel Linking**: RESOLVED - Add `sourceDatasetId` and `syncedAt` fields to track origin.
3. ✅ **Election/Dataset Types**: RESOLVED - Implemented as configurable option groups (models) rather than enums for flexibility.
4. **Dataset Deletion**: When deleting a GISDataset, should we also DROP the PostGIS table, or keep for audit?
5. **Sync Strategies**: Support "replace", "merge", "update" modes? Or just "replace" for v1?
6. **Validation Rules**: What validation before allowing sync? (e.g., require minimum field mappings)

---

**Generated:** 2026-02-18  
**Updated:** 2026-02-18 (Updated with implemented option groups)  
**Status:** Partially Implemented - ElectionType and DatasetType option groups complete, GIS catalog models pending
