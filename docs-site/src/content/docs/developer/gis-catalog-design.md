---
title: GIS Dataset Catalog Design
description: Architecture and implementation plan for the GIS dataset catalog system
---

# GIS Dataset Catalog Design

## Overview

The GIS Dataset Catalog provides a unified system for managing spatial and tabular datasets used in campaign operations. It supports parcels, voting precincts, demographics, and election results with flexible metadata and election-specific versioning.

## Core Concepts

### Dataset Types

1. **Parcel Datasets**: Property boundaries with assessment data
2. **Precinct Datasets**: Voting precinct geometries (election-specific)
3. **Demographic Datasets**: Census and demographic overlays
4. **Tabular Datasets**: Non-spatial data (election results, lookup tables)

### Key Features

- **Election Context**: Precinct boundaries can vary by election
- **Metadata Tracking**: Field mappings, data sources, update frequency
- **Spatial Integration**: Direct PostGIS table/view references
- **Flexible Schema**: JSON metadata for custom attributes

## Database Schema

### Core Models

```prisma
// Add to prisma/schema.prisma

// ============================================
// GIS Dataset Catalog
// ============================================

/// Core dataset registry - all GIS and tabular datasets
model GISDataset {
  id              String        @id @default(cuid())
  name            String        @unique
  description     String?       @db.Text
  datasetType     DatasetType
  
  // PostGIS Integration
  sourceTable     String?       // Table/view name in PostgreSQL
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
  
  // Metadata
  metadata        Json?         // Flexible storage for custom attributes
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  createdBy       String?
  lastSyncedAt    DateTime?
  
  // Relations
  parcelDataset       ParcelDataset?
  precinctDataset     PrecinctDataset?
  demographicDataset  DemographicDataset?
  
  @@map("gis_datasets")
}

enum DatasetType {
  PARCEL
  PRECINCT
  DEMOGRAPHIC
  TABULAR
  BOUNDARY     // County/city boundaries
  INFRASTRUCTURE  // Roads, utilities, etc.
  CUSTOM
}

enum GeometryType {
  POINT
  LINESTRING
  POLYGON
  MULTIPOINT
  MULTILINESTRING
  MULTIPOLYGON
  GEOMETRYCOLLECTION
}

/// Parcel-specific metadata and field mappings
model ParcelDataset {
  id              String      @id @default(cuid())
  datasetId       String      @unique
  dataset         GISDataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  // Field mappings (column names in source table)
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

/// Precinct-specific metadata - supports election-specific boundaries
model PrecinctDataset {
  id              String      @id @default(cuid())
  datasetId       String      @unique
  dataset         GISDataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  // Election context
  electionId      String?     // null = current/general precinct boundaries
  election        Election?   @relation(fields: [electionId], references: [id])
  
  // Field mappings
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
}

/// Demographic dataset metadata
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

/// Election definition
model Election {
  id              String      @id @default(cuid())
  name            String      @unique  // "2022 Primary Election - Contra Costa County"
  shortName       String?     // "2022 Primary"
  electionDate    DateTime
  electionType    ElectionType
  jurisdiction    String?     // "Contra Costa County", "California"
  
  description     String?     @db.Text
  isActive        Boolean     @default(true)
  
  // Relations
  precinctDatasets PrecinctDataset[]
  results          ElectionResult[]
  
  createdAt       DateTime    @default(now())
  
  @@index([electionDate])
  @@map("elections")
}

enum ElectionType {
  PRIMARY
  GENERAL
  SPECIAL
  RUNOFF
  RECALL
  LOCAL
}

/// Election results - links non-spatial data to precinct geometries
model ElectionResult {
  id                  String      @id @default(cuid())
  
  // Election context
  electionId          String
  election            Election    @relation(fields: [electionId], references: [id], onDelete: Cascade)
  
  // Precinct link
  precinctDatasetId   String
  precinctDataset     PrecinctDataset @relation(fields: [precinctDatasetId], references: [id])
  precinctIdentifier  String      // Actual precinct ID/number (e.g., "PCT-4201")
  
  // Contest details
  contestName         String      // "Mayor", "Proposition 1", "District 5 Council"
  contestType         String?     // "office", "ballot_measure"
  candidateName       String?     // null for Yes/No measures
  partyAffiliation    String?
  
  // Results
  voteCount           Int
  totalVotes          Int?        // Total votes cast in this precinct for this contest
  percentage          Float?      // Calculated: voteCount / totalVotes
  
  // Metadata
  isWinner            Boolean     @default(false)
  createdAt           DateTime    @default(now())
  
  @@unique([electionId, precinctIdentifier, contestName, candidateName])
  @@index([electionId, contestName])
  @@index([precinctDatasetId, precinctIdentifier])
  @@map("election_results")
}
```

### Example Data Flow

**Parcels:**
```
PostGIS Table: contra_costa_parcels
Columns: id, apn, address, city, assessed_value, geom (MULTIPOLYGON)

GISDataset:
  name: "Contra Costa County Parcels 2024"
  datasetType: PARCEL
  sourceTable: "contra_costa_parcels"
  geometryColumn: "geom"
  geometryType: MULTIPOLYGON

ParcelDataset:
  apnField: "apn"
  addressField: "address"
  assessedValueField: "assessed_value"
```

**Precincts (Election-Specific):**
```
PostGIS Table: precincts_2022_primary
Columns: id, precinct_id, precinct_name, geom (MULTIPOLYGON)

Election:
  name: "2022 Primary Election - Contra Costa County"
  electionDate: 2022-06-07

GISDataset:
  name: "Precincts - 2022 Primary"
  datasetType: PRECINCT
  sourceTable: "precincts_2022_primary"

PrecinctDataset:
  electionId: <election_id>
  precinctIdField: "precinct_id"

PostGIS Table: precincts_2022_general (different boundaries!)
GISDataset: "Precincts - 2022 General"
PrecinctDataset: (different electionId)
```

**Election Results:**
```
ElectionResult records:
  electionId: <2022_primary>
  precinctDatasetId: <precincts_2022_primary_dataset>
  precinctIdentifier: "PCT-4201"
  contestName: "Mayor"
  candidateName: "Jane Smith"
  voteCount: 324
  totalVotes: 892
  percentage: 36.3
```

## UI Design

### Navigation Structure

```
Campaign Menu:
├── Dashboard
├── Map (main map view with layer controls)
├── People (voters)
├── Jobs
├── Settings
└── GIS Catalog (NEW)
    ├── Datasets (browse/manage)
    ├── Elections (manage election definitions)
    ├── Import (upload new datasets)
    └── Analytics (dataset usage, coverage stats)
```

### Page: GIS Catalog → Datasets

**Layout:**
- **Filters (Left Sidebar)**
  - Dataset Type: All / Parcel / Precinct / Demographic / Tabular
  - Category: All / Property / Political / Demographics
  - Tags: Multi-select
  - Active Status: Active / Inactive / All
  - Has Geometry: Yes / No / All

- **Dataset List (Main Area)**
  - Card-based grid or table view
  - Each card shows:
    - Dataset name + type badge
    - Description (truncated)
    - Record count
    - Last synced date
    - Tags
    - Quick actions: View, Edit, Download, Delete
  - Search bar at top
  - Sort: Name, Date Added, Record Count, Last Synced

- **Dataset Detail Panel (Right Sidebar or Modal)**
  When clicking a dataset:
  - Overview tab:
    - Name, description, type
    - Source table/view name
    - Geometry type, SRID
    - Record count, bounding box
    - Created date, last synced
    - Tags, category
  - Fields tab:
    - List of all fields in source table
    - For specialized types (Parcel/Precinct/Demo), show field mappings
  - Preview tab:
    - Map preview (first 100 features)
    - Attribute table preview (first 20 rows)
  - Metadata tab:
    - Source agency, URL
    - Update frequency
    - License info
    - Custom metadata JSON
  - Usage tab:
    - Which elections use this (for precincts)
    - Related voter matches (if any)
    - Download history

### Page: GIS Catalog → Elections

**Layout:**
- **Election List**
  - Timeline view or table
  - Each election shows:
    - Name, date, type
    - Jurisdiction
    - Number of precincts
    - Number of results loaded
    - Quick actions: View, Edit, Add Results

- **Election Detail**
  - Overview: Name, date, type, jurisdiction
  - Precincts: List of precinct datasets for this election
  - Results: Table of contests and candidates
    - Filter by contest
    - Show winners
    - Total votes per contest
  - Map View: Display precinct boundaries with result overlays
    - Color by winner
    - Choropleth by turnout or vote percentage

### Page: GIS Catalog → Import

**Import Workflow:**

1. **Choose Import Type**
   - Parcel Dataset
   - Precinct Dataset
   - Demographic Dataset
   - Election Results (CSV)
   - Generic Spatial Data

2. **Upload File**
   - Shapefile (zipped)
   - GeoJSON
   - GeoPackage (.gpkg)
   - CSV with WKT geometry column
   - CSV (for election results)

3. **Map Fields** (Dynamic based on type)
   - For Parcels: Map APN, Address, Assessed Value, etc.
   - For Precincts: Map Precinct ID, select Election
   - For Demographics: Map GeoID, population fields
   - Show detected columns, allow drag-and-drop mapping

4. **Configure Dataset**
   - Name, description
   - Tags, category
   - Source information
   - SRID (auto-detect or specify)

5. **Preview & Validate**
   - Show sample records
   - Validate geometry
   - Check for duplicates
   - Estimate import time

6. **Import** (Background Job)
   - Create PostGIS table
   - Create spatial index
   - Create GISDataset record
   - Create type-specific metadata record
   - Show progress in Jobs page

### Map Integration

**Layer Control Panel** (on main Map page):
```
Layers:
├── Base Layers
│   ├── ○ Streets
│   ├── ● Satellite
│   └── ○ Terrain
├── Voter Data
│   ├── ☑ Households (clustered)
│   └── ☐ Canvass Routes
└── GIS Datasets
    ├── ☑ Parcels - Contra Costa 2024
    │   └── Style: Outline only, colored by land use
    ├── ☐ Precincts - 2022 General
    │   └── Style: Colored by winner (Mayor race)
    ├── ☐ Census Block Groups
    │   └── Style: Choropleth by median income
    └── ☐ City Boundaries
```

**Layer Styling Options:**
- Simple (outline only, fill color)
- Categorized (by attribute value)
- Graduated (choropleth by numeric field)
- Rule-based (custom expressions)

**Interaction:**
- Click feature → Show popup with attributes
- For parcels: Show owner, assessed value, address
- For precincts: Show election results summary
- For demographics: Show population stats
- Link to related voters (if parcel address matches)

## API Endpoints

### Dataset Management

```typescript
// List datasets
GET /api/v1/gis/datasets
Query params: type, category, tags[], isActive, search, limit, offset

// Get dataset details
GET /api/v1/gis/datasets/:id

// Create dataset
POST /api/v1/gis/datasets
Body: {
  name, description, datasetType, sourceTable,
  geometryColumn, geometryType, srid, tags, category,
  metadata, typeSpecificData (parcel/precinct/demo fields)
}

// Update dataset
PUT /api/v1/gis/datasets/:id

// Delete dataset
DELETE /api/v1/gis/datasets/:id

// Get dataset features (GeoJSON)
GET /api/v1/gis/datasets/:id/features
Query params: bbox, limit, offset, properties (field filter)

// Get dataset statistics
GET /api/v1/gis/datasets/:id/stats
Returns: recordCount, boundingBox, geometryTypes, attributeSummary

// Sync dataset (recalculate stats)
POST /api/v1/gis/datasets/:id/sync
```

### Elections

```typescript
// List elections
GET /api/v1/gis/elections
Query params: year, type, search, limit, offset

// Get election details
GET /api/v1/gis/elections/:id

// Create election
POST /api/v1/gis/elections

// Get election results
GET /api/v1/gis/elections/:id/results
Query params: precinctId, contestName

// Import election results
POST /api/v1/gis/elections/:id/results/import
Body: FormData with CSV file
```

### Import

```typescript
// Upload and validate file
POST /api/v1/gis/import/validate
Body: FormData with file
Returns: { fields, sampleRecords, geometryType, recordCount, srid }

// Start import job
POST /api/v1/gis/import/execute
Body: {
  fileId, datasetType, name, description,
  fieldMappings, srid, tags, category,
  typeSpecificConfig
}
Returns: { jobId }
```

## Implementation Phases

### Phase 1: Core Catalog (Week 1-2)
- [ ] Add Prisma schema models
- [ ] Create migration
- [ ] Build dataset list API
- [ ] Build dataset detail API
- [ ] Create basic catalog UI (list + detail)
- [ ] Test with manually created datasets

### Phase 2: Parcel Integration (Week 2-3)
- [ ] Implement parcel dataset creation
- [ ] Build field mapping interface
- [ ] Create parcel detail view
- [ ] Integrate with map (display parcels)
- [ ] Add parcel-to-voter geocoding job

### Phase 3: Election/Precinct System (Week 3-4)
- [ ] Implement election management
- [ ] Build precinct dataset creation
- [ ] Create election results import
- [ ] Build election results UI
- [ ] Add precinct map visualization with results

### Phase 4: Import System (Week 4-5)
- [ ] Build shapefile import processor
- [ ] Add GeoJSON import
- [ ] Create import wizard UI
- [ ] Implement background import jobs
- [ ] Add validation and error handling

### Phase 5: Demographics & Analytics (Week 5-6)
- [ ] Implement demographic dataset support
- [ ] Add demographic overlays to map
- [ ] Build analytics dashboard
- [ ] Create voter-to-demographic matching
- [ ] Add export functionality

## Technical Considerations

### PostGIS Integration

**Creating PostGIS Tables via Import:**
```typescript
// In import processor
await prisma.$executeRawUnsafe(`
  CREATE TABLE ${tableName} (
    id SERIAL PRIMARY KEY,
    ${fieldDefinitions},
    geom geometry(${geometryType}, ${srid}),
    created_at TIMESTAMP DEFAULT NOW()
  )
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX ${tableName}_geom_idx ON ${tableName} USING GIST (geom)
`);
```

**Querying Features:**
```typescript
// Get features in bounding box
const features = await prisma.$queryRawUnsafe(`
  SELECT 
    id,
    ${fields.join(', ')},
    ST_AsGeoJSON(geom) as geometry
  FROM ${sourceTable}
  WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, $5)
  LIMIT $6 OFFSET $7
`, minX, minY, maxX, maxY, srid, limit, offset);
```

### pg_featureserv Integration

Instead of building custom GeoJSON endpoints, consider using [pg_featureserv](https://github.com/CrunchyData/pg_featureserv):

- Auto-exposes PostGIS tables as REST APIs
- OGC Features API compliant
- Supports filtering, pagination, bounding boxes
- No code needed - just deploy and configure

**Setup:**
```bash
docker run -p 9000:9000 \
  -e DATABASE_URL=$DATABASE_URL \
  pramsey/pg_featureserv
```

**Usage:**
```typescript
// In your frontend, fetch features
const response = await fetch(
  `http://localhost:9000/collections/${sourceTable}/items?bbox=${bbox}&limit=100`
);
const geojson = await response.json();
```

### Map Tile Serving

For better performance with large datasets, use [pg_tileserv](https://github.com/CrunchyData/pg_tileserv):

- Serves vector tiles (MVT) from PostGIS
- Works with Leaflet via vector tile plugins
- Handles millions of features efficiently

### Security Considerations

- **Table Name Validation**: Sanitize all table/column names to prevent SQL injection
- **Row-Level Security**: Consider PostgreSQL RLS for multi-tenant deployments
- **Role-Based Access**: Limit dataset visibility by user role
- **Rate Limiting**: Protect feature query endpoints
- **SRID Validation**: Only allow common SRID values (4326, 3857, etc.)

## Example Usage Scenarios

### Scenario 1: Targeting Voters in Specific Parcels

1. Import parcel dataset with land use codes
2. Query: "All residential parcels with assessed value > $500k"
3. Geocode voters to parcels (spatial join)
4. Create voter list: "Homeowners in high-value properties"
5. Use for targeted outreach

### Scenario 2: Analyzing Election Results by Demographics

1. Import 2022 precinct boundaries
2. Import 2022 election results
3. Import Census demographic data (tract level)
4. Spatial join: precincts → demographics
5. Visualize: "Precincts where Candidate X won + median income"
6. Analysis: Identify demographic patterns in voting

### Scenario 3: Creating Canvass Areas from Precincts

1. Load precinct geometries for target election
2. Filter: "Precincts with <60% turnout in last election"
3. Dissolve precinct boundaries into larger canvass zones
4. Assign canvassers to zones
5. Track door-knocking progress by precinct/zone

## Migration Path

Since you already have a Voter database, consider:

1. **Spatial Enhancement**: Add geometry column to Household
   ```sql
   ALTER TABLE households ADD COLUMN geom geometry(Point, 4326);
   UPDATE households SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
   WHERE longitude IS NOT NULL AND latitude IS NOT NULL;
   CREATE INDEX households_geom_idx ON households USING GIST (geom);
   ```

2. **Precinct Assignment**: Link voters to precincts via spatial join
   ```typescript
   // Find precinct for each household
   const precinctAssignments = await prisma.$queryRaw`
     UPDATE households h
     SET precinct_id = p.precinct_id
     FROM precincts_2024_general p
     WHERE ST_Contains(p.geom, h.geom)
   `;
   ```

3. **Gradual Rollout**: Start with one dataset type, expand after validation

---

## Summary

This design provides:
- ✅ Flexible catalog for multiple GIS dataset types
- ✅ Election-specific precinct boundaries
- ✅ Non-spatial data integration (election results)
- ✅ Rich metadata and field mappings
- ✅ Scalable architecture with PostGIS + pg_featureserv
- ✅ Clear implementation phases

**Next Steps:**
1. Review and approve schema design
2. Create Prisma migration
3. Build Phase 1 (Core Catalog)
4. Test with sample parcel data
