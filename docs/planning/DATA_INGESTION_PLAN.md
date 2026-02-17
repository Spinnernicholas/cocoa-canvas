# Cocoa Canvas - Data Ingestion Plan

## Overview

This is the complete data ingestion design showing all supported file types. See **PHASE_PLAN.md** for phased implementation:
- **Phase 2**: Import Contra Costa voter files (fixed-width format) only
- **Phase 3**: Add GeoJSON shape file import + geocoding
- **Phase 5+**: Add processed data + custom formats

Cocoa Canvas data ingestion prioritizes:

- **Non-destructive operation**: Audit all imports, support rollback
- **Validation**: Comprehensive data quality checks before import
- **Auditability**: Full history of all imports with error logs
- **Performance**: Efficient batch processing for large voter files
- **Web UI**: User-friendly import wizard (CLI in future)

---

## Data Types & Import Strategy

### Type 1: Raw County Voter Files

**Supported formats**: 
- Contra Costa County (primary)
- California standard voter file format (expandable to other CA counties)
- Custom county formats (with configurable parsers)

**Characteristics**:
- Large files (100K-2M+ voter records)
- Fixed-width or delimited formats
- Standardized fields (name, address, DOB, registration date, etc.)
- Updates may be incremental or full replacements
- Sensitive (PII included)

**Import Strategy**:
```
1. Upload or provide file path
2. Auto-detect format (Contra Costa, CA standard, etc.)
3. Preview first N rows for validation
4. Run field mapping validation
5. Batch insert (10K records at a time)
6. Create audit log with file hash and record count
7. Mark as "imported" in database
```

### Type 2: Processed Data Files (Custom Format)

**Purpose**: 
- Your internal data enrichment pipeline
- Results from external data services (demographics, property, etc.)
- Cleaned/deduplicated voter lists
- Canvassing results from other sources

**Characteristics**:
- CSV, JSON, or Parquet format
- Custom schema defined by your org
- Can include custom fields not in raw voter file
- Lower volume, more frequent updates
- Joins to existing voter records via voter ID or address

**Import Strategy**:
```
1. Upload CSV/JSON/custom file
2. Show schema detection (sample headers)
3. Map fields to voter record (voter_id, address, custom fields)
4. Choose merge strategy:
   - Update: merge with existing voter
   - Insert: add new records
   - Skip duplicates
5. Preview merge results (samples)
6. Execute import
7. Create audit log with changes
```

**Field Mapping**: User defines which columns map to which voter fields:
```
File Column          → Voter Field
voter_id            → voter_id (join key)
first_name          → first_name
score_engagement    → custom_field:engagement_score
volunteer_interest  → custom_field:volunteer_interest
```

### Type 3: GeoJSON Shape Files

**Supported geometries**:
- **Points**: Voter residences, locations, landmarks
- **Polygons**: Precincts, districts, neighborhoods, parcels
- **Lines**: District boundaries, transit routes

**Characteristics**:
- Can have hundreds to hundreds of thousands of features
- Custom properties on each feature
- Multiple independent files (precincts.geojson, parcels.geojson, etc.)
- Needs flexible field mapping
- May need coordinate system conversion

**Import Strategy**:
```
1. Upload GeoJSON file
2. Detect geometry type (point/polygon/line)
3. Show feature count and sample properties
4. Define field mapping:
   - Choose which property = feature name
   - Choose which property = precinct/district ID
   - Choose display fields
5. Choose spatial index (for fast geo queries)
6. Import into spatial table (with PostGIS or SQLite spatial)
7. Create audit log with geometry count
```

---

## Database Schema for Data Ingestion

```prisma
// Core voter data
model Voter {
  id              String    @id @default(cuid())
  
  // from raw county file
  voterId         String?   @unique  // County voter ID
  firstName       String
  lastName        String
  address         String
  addressAlt      String?
  city            String
  state           String   @default("CA")
  zip             String
  
  // Voter registration info
  registrationDate DateTime?
  status          String?   // active, inactive, removed
  party           String?   // party affiliation
  county          String    // Contra Costa, etc.
  precinct        String?
  district        String?
  
  // Spatial data (if geocoded)
  latitude        Float?
  longitude       Float?
  
  // Custom fields (from processed data imports)
  customFields    Json?     // { engagement_score: 8, volunteer: true, ... }
  
  // Relations
  assignments     Assignment[]
  canvassResponses CanvassResponse[]
  
  // Audit
  source          String?   // which import file
  sourceVersion   Int       @default(1)  // track updates
  lastUpdated     DateTime  @updatedAt
  createdAt       DateTime  @default(now())
  
  @@index([voterId])
  @@index([lastName, firstName])
  @@index([address, city, zip])
  @@index([precinct])
  @@index([county])
  @@fulltext([lastName, firstName, address])  // for search
}

model ImportJob {
  id              String    @id @default(cuid())
  
  // Job metadata
  title           String    // User-friendly name
  dataType        String    // voter_file, processed_data, geojson
  county          String?   // Contra Costa, San Mateo, etc.
  fileName        String
  fileHash        String    @unique  // Prevent re-import of same file
  
  // Import details
  status          String    // pending, processing, completed, failed, rolled_back
  recordsProcessed Int      @default(0)
  recordsInserted Int       @default(0)
  recordsUpdated  Int       @default(0)
  recordsSkipped  Int       @default(0)
  recordsFailed   Int       @default(0)
  
  // Errors
  errorLog        Json?     // { errors: [{ row, field, message }, ...] }
  validationRule  String?   // Validation profile used
  
  // Field mapping (for processed data)
  fieldMapping    Json?     // { file_column: voter_field, ... }
  
  // Relations
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  // Audit
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  
  @@index([userId])
  @@index([status])
  @@index([dataType])
}

model GeoJsonFeature {
  id              String    @id @default(cuid())
  
  // Feature data
  name            String    // Feature name (precinct 01, parcel ABC123, etc.)
  featureType     String    // precinct, parcel, neighborhood, district
  geometry        String    @db.Text  // GeoJSON geometry as JSON
  properties      Json      // All GeoJSON @properties
  
  // Spatial indexing (if using PostGIS)
  // spatialIndex   Geometry? @db.Geometry("Point", 4326)?
  
  // Related records
  precinct        String?   // Normalized precinct ID if available
  
  // Metadata
  importJobId     String
  importJob       ImportJob @relation(fields: [importJobId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime  @default(now())
  
  @@index([featureType])
  @@index([precinct])
  @@index([importJobId])
}

model ImportMapping {
  id              String    @id @default(cuid())
  
  // Template for reusable mappings
  name            String    // "Contra Costa Voter File", "Our Custom CSV", etc.
  dataType        String    // voter_file, csv, geojson
  source          String?   // "contra_costa", "custom_org", etc.
  
  // Mapping configuration
  mapping         Json      // { fileName: { headers: [...], fields: {...}, ... } }
  
  // Validation rules
  requiredFields  String[]  // Fields that must be present
  fieldTypes      Json?     // { first_name: "string", dob: "date", ... }
  defaultValues   Json?     // { state: "CA", status: "active" }
  
  // Usage
  createdBy       String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## Import Workflows

### Workflow 1: Raw County Voter File Import

```
┌─────────────────────────────────────────────────┐
│ 1. Upload File                                   │
│    - Web UI file picker or CLI path             │
│    - Calculate file hash (prevent duplicates)   │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. Format Detection                              │
│    - Check first 10 lines                       │
│    - Detect: Contra Costa? CA Standard? Other?  │
│    - Load appropriate parser                    │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Validation & Preview                          │
│    - Check required fields present              │
│    - Validate date formats, zips, etc.          │
│    - Show first 20 records for user review      │
│    - Report any errors or warnings              │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. User Confirmation                             │
│    - Review and approve import                  │
│    - Choose action:                             │
│      • Replace all voters (reset)               │
│      • Update existing (merge)                  │
│      • Append only (add new)                    │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. Batch Processing                              │
│    - Process 10K records at a time              │
│    - Normalize data (trim, uppercase, etc.)     │
│    - Validate each record                       │
│    - Insert/update with transaction             │
│    - Track progress + errors                    │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 6. Post-Import Tasks                             │
│    - Update full-text search index              │
│    - Geocode addresses (optional)               │
│    - Update district/precinct info              │
│    - Generate import summary report             │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 7. Audit Log                                     │
│    - Create audit log entry                     │
│    - Record: file hash, record count, user, ts  │
│    - Allow rollback if needed                   │
└─────────────────────────────────────────────────┘
```

### Workflow 2: Processed Data Import (with Field Mapping)

```
┌──────────────────────────────────────────────────┐
│ 1. Upload CSV/JSON File                          │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 2. Auto-Detect Schema                            │
│    - Read CSV headers or JSON keys              │
│    - Suggest field mapping based on names       │
│    - Ask user to confirm or customize           │
│    - Show: file_column → voter_field mapping    │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 3. Join Strategy                                 │
│    - How to match to existing voters?           │
│    - Options:                                   │
│      • voter_id (exact match)                   │
│      • address + name (fuzzy match)             │
│      • Custom join logic                        │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 4. Merge Preview                                 │
│    - Show sample rows with destination fields   │
│    - "Will update 500 records, insert 100 new"  │
│    - Display potential conflicts/overwrites     │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 5. Merge Execution                               │
│    - Update existing voter records              │
│    - Create new voters if join fails            │
│    - Store custom fields in jsonb column        │
│    - Track source of each field                 │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 6. Audit Log                                     │
│    - Log changes (before/after values)          │
│    - Record field mapping used                  │
└──────────────────────────────────────────────────┘
```

### Workflow 3: GeoJSON Shape File Import

```
┌──────────────────────────────────────────────────┐
│ 1. Upload GeoJSON File                           │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 2. Parse & Validate                              │
│    - Validate GeoJSON format                    │
│    - Check coordinate system (assume 4326)      │
│    - Count features by geometry type            │
│    - Show sample properties                     │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 3. Feature Type & Mapping                        │
│    - Detect: Points? Polygons? Lines?           │
│    - What is "name" field? (suggest: properties.name)
│    - What is "id" field?                        │
│    - What is "type"? (precinct, parcel, etc.)   │
│    - Auto-suggests based on property names      │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 4. Preview & Validation                          │
│    - Show map preview with features             │
│    - Display sample properties                  │
│    - Check for missing/duplicate IDs            │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 5. Import Execution                              │
│    - Insert features into GeoJsonFeature table  │
│    - Create spatial indexes (if PostGIS)        │
│    - Parse geometry for overlap detection       │
│    - Link to existing precincts if applicable   │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 6. Audit Log                                     │
│    - Record feature count, geometry type        │
│    - Enable rollback                            │
└──────────────────────────────────────────────────┘
```

---

## Field Mapping System

### Pre-built Mappings (Contra Costa Example)

```json
{
  "mappings": {
    "contra_costa_voter_file": {
      "dataType": "voter_file",
      "county": "Contra Costa",
      "format": "fixed-width",
      "encoding": "utf-8",
      "fields": {
        "0-8": "voter_id",
        "9-27": "last_name",
        "28-42": "first_name",
        "43-58": "middle_name",
        "59-62": "registration_date",
        "63-64": "status",
        "65-150": "address",
        "151-165": "city",
        "166-167": "state",
        "168-172": "zip",
        "173-174": "precinct",
        "175-185": "party_affiliation"
      },
      "validation": {
        "requiredFields": ["voter_id", "last_name", "first_name", "address", "city", "zip"],
        "dateFormats": ["YYYYMMDD"],
        "statusValues": ["active", "inactive", "removed"],
        "stateDefault": "CA"
      }
    }
  }
}
```

### User-Defined Mapping (for Custom Files)

```typescript
// API for creating custom mapping
POST /api/mappings
{
  "name": "Our Custom Voter Export",
  "dataType": "processed_data",
  "format": "csv",
  "mapping": {
    "voter_id": "id",
    "first_name": "fname",
    "last_name": "lname",
    "address": "street_address",
    "city": "city_name",
    "state": "state_code",
    "zip": "postal_code",
    "custom:engagement_score": "engagement_score",
    "custom:volunteer_interest": "volunteer_willing"
  },
  "requiredFields": ["voter_id", "first_name", "last_name"],
  "fieldTypes": {
    "engagement_score": "number",
    "volunteer_willing": "boolean"
  }
}
```

---

## Data Validation Rules

### By Data Type

#### Voter File Validation
```typescript
const voterValidation = {
  voter_id: { type: 'string', required: true, pattern: /^\d{1,10}$/ },
  first_name: { type: 'string', required: true, maxLength: 50 },
  last_name: { type: 'string', required: true, maxLength: 50 },
  address: { type: 'string', required: true, minLength: 5 },
  city: { type: 'string', required: true },
  state: { type: 'string', required: false, default: 'CA', pattern: /^[A-Z]{2}$/ },
  zip: { type: 'string', required: true, pattern: /^\d{5}(-\d{4})?$/ },
  registration_date: { type: 'date', required: false, format: 'YYYYMMDD' },
  status: { type: 'enum', values: ['active', 'inactive', 'removed'] },
  party: { type: 'enum', values: ['D', 'R', 'I', 'G', 'L', 'N'] }
};

// Error handling
const errors = [];
if (!voter.first_name) errors.push('first_name is required');
if (voter.zip && !voterValidation.zip.pattern.test(voter.zip)) {
  errors.push(`Invalid zip code: ${voter.zip}`);
}
```

#### GeoJSON Validation
```typescript
const geoJsonValidation = {
  type: { required: true, value: 'Feature' }, // or 'FeatureCollection'
  geometry: { required: true, types: ['Point', 'Polygon', 'LineString'] },
  properties: { required: true, type: 'object' },
  coordinates: {
    valid_range: { latitude: [-90, 90], longitude: [-180, 180] }
  }
};
```

---

## Import Job Management

### Progress Tracking (for Large Imports)

```typescript
// Real-time updates via WebSocket or polling
GET /api/imports/:jobId/progress

{
  "id": "job-123",
  "status": "processing",
  "recordsProcessed": 50000,
  "recordsTotal": 500000,
  "percentComplete": 10,
  "eta": "2 minutes",
  "recordsInserted": 45000,
  "recordsUpdated": 5000,
  "recordsFailed": 0,
  "currentError": null
}
```

### Error Handling

```typescript
// Detailed error log for failed records
GET /api/imports/:jobId/errors

[
  {
    "rowNumber": 1234,
    "fields": {
      "voter_id": "123456",
      "first_name": "John"
    },
    "errors": [
      {
        "field": "zip",
        "message": "Invalid zip code format",
        "value": "INVALID"
      }
    ]
  }
]

// Options:
// 1. Skip failed records and continue
// 2. Halt import and report all errors
// 3. Mark records for manual review
```

### Rollback Capability

```typescript
// Undo an import job
POST /api/imports/:jobId/rollback

// Conditions:
// - Must be Admin user
// - Import must have completed
// - Cannot rollback if newer imports depend on it
// - Creates new InvalidationEvent record
// - Restores previous version of records

{
  "status": "rolled_back",
  "recordsReverted": 50000,
  "timestamp": "2025-02-15T10:30:00Z",
  "reason": "Data validation discovered errors"
}
```

---

## Web UI for Data Ingestion

### Import Wizard (Multi-step)

```
Step 1: Choose Import Type
  ☐ County Voter File
  ☐ Processed Data (CSV/JSON)
  ☐ GeoJSON Shape File

Step 2: Upload & Format Detection
  [Drag file here or choose]
  Detected format: Contra Costa Voter File (2024)

Step 3: Field Mapping (if needed)
  File Column        → Voter Field
  [id]              → voter_id
  [fname]           → first_name
  [lname]           → last_name
  [address_line_1]  → address
  [city_name]       → city
  [zip_code]        → zip
  [score]           → custom:engagement_score
  
  [+ Add custom field mapping]

Step 4: Preview & Validation
  ✓ 150,000 valid records ready
  ⚠ 5 records have warnings (see details)
  
  What to do with existing data?
  ☑ Replace all voters
  ○ Merge (update existing, add new)
  ○ Append only (skip existing)

Step 5: Confirm & Import
  [← Back] [Cancel] [Import →]
  
  [Shows progress bar while importing]

Step 6: Results
  ✓ Import completed successfully
  - 150,000 records imported
  - 50,000 updated
  - 100,000 new
  
  [View error log] [Rollback import]
```

### CLI for Automated Imports

```bash
# Import from command line (for automated pipelines)

cocoa-canvas import voter-file \
  --file /path/to/voters.txt \
  --format contra-costa \
  --action merge \
  --output-json

# Output:
# {
#   "status": "completed",
#   "recordsProcessed": 150000,
#   "recordsInserted": 100000,
#   "recordsUpdated": 50000,
#   "recordsFailed": 0
# }

# Or use from Python
python -m cocoa_canvas import \
  --type voter_file \
  --format contra_costa \
  --file voters.txt
```

---

## Data Sources & Expansion

### County-Specific Parsers

**Contra Costa** (primary):
- Provider: Contra Costa County Registrar
- Format: Fixed-width text file
- Fields: voter_id, name, address, DOB, party, status, etc.
- Frequency: Updated quarterly
- Parser location: `lib/parsers/contra_costa.ts`

**Other California Counties** (template):
```typescript
// lib/parsers/[county_name].ts
export class CountyParser {
  static format = 'fixed-width'; // or 'csv', 'json'
  static encoding = 'utf-8';
  static fields = { /* field definitions */ };
  
  static parse(fileContent: Buffer): Voter[] {
    // County-specific parsing logic
  }
}
```

**Out-of-state** (future):
- TX, FL, NY voter files (market expansion)
- Each needs specific parser

### External Data Services

Future integrations for data enrichment:

```typescript
// Examples (not yet implemented)
- Propensity scores (political modeling)
- Demographics (census data)
- Property records (tax assessor)
- Volunteer history (if you have external source)

// Pattern:
POST /api/imports/enrich
{
  "service": "demographics_service",
  "voterFieldToMatch": "address",
  "externalFieldToAdd": "income_level"
}
```

---

## Performance Considerations

### Batch Sizes & Memory Management

```typescript
// Optimize for different server sizes

// Small deployment (SQLite)
BATCH_SIZE = 1000
CHUNK_PROCESSING = true
MAX_CONCURRENT_CHUNKS = 1

// Medium deployment (PostgreSQL)
BATCH_SIZE = 10000
CHUNK_PROCESSING = true
MAX_CONCURRENT_CHUNKS = 4

// Large deployment
BATCH_SIZE = 50000
CHUNK_PROCESSING = true
MAX_CONCURRENT_CHUNKS = 8
```

### Index Building

```typescript
// After large imports, rebuild indexes for speed
POST /api/admin/maintenance/rebuild-indexes

// Rebuilds:
// - Full-text search index (last_name, first_name, address)
// - Precinct indexes
// - Spatial indexes (if using PostGIS)
// - Custom field indexes

// Takes: 5-30 minutes depending on record count
// Shows progress bar
```

---

## Getting Started

### Phase 1: Contra Costa Voter File

```bash
# 1. Set up parser for Contra Costa format
lib/parsers/contra_costa.ts

# 2. Create import API endpoints
app/api/imports/start
app/api/imports/[jobId]/progress
app/api/imports/[jobId]/complete

# 3. Build import wizard UI
components/ImportWizard.tsx
components/FieldMappingStep.tsx
components/PreviewStep.tsx

# 4. Wire up database schema
prisma/schema.prisma (ImportJob, GeoJsonFeature, ImportMapping)

# 5. Manual testing with sample file
```

### Phase 2: Custom Data Import

```bash
# 1. Generic CSV/JSON parser
lib/parsers/generic_csv.ts
lib/parsers/generic_json.ts

# 2. Field mapping UI
components/FieldMappingEditor.tsx

# 3. Join strategy selection
components/JoinStrategySelector.tsx

# 4. Test with exported voter list
```

### Phase 3: GeoJSON Imports

```bash
# 1. GeoJSON parser + validation
lib/parsers/geojson.ts

# 2. Feature type detection
lib/geojson/featureDetector.ts

# 3. Map preview (Mapbox or Leaflet)
components/GeoJsonPreview.tsx

# 4. Test with precinct and parcel files
```

---

## Reference

- [GeoJSON Spec](https://tools.ietf.org/html/rfc7946)
- [PostGIS Geometry Types](https://postgis.net/docs/using_postgis_dbmanagement.html)
- [Contra Costa Voter File Format](https://www.contracostacvdb.org/) (if publicly available)
- [California Voter Data Standards](https://www.sos.ca.gov/)
