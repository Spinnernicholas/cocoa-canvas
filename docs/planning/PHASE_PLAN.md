# Cocoa Canvas - Phase Implementation Plan

## Overview

Cocoa Canvas is built in 4 phases, each deployable and functional independently. Each phase adds the **minimum database schema** required for its features, avoiding over-engineering.

**Core Principles**:
- Non-destructive operations (no hard deletes, audit everything)
- Incremental DB schema (Phase 1 != full schema in the master schema doc)
- Fully functional at each phase (not just scaffolding)
- Clear "Definition of Done" for each phase

---

## Phase 1: Foundation (Week 1-2)

### Goals
- Docker Compose project that runs standalone with SQLite
- User authentication (admin account via setup)
- Initial setup wizard (campaign/race info)
- Job queue foundation for imports

### Database Schema (Phase 1 + Phase 2)

See the master schema reference for the current person-centric voter model and import metadata:

- [Master Database Schema](../developer/DATABASE_SCHEMA_MASTER.md)
  /setup                  - Admin setup wizard
  /dashboard              - Main dashboard (after login)
  
Components:
  LoginForm               - Email/password form
  SetupWizard             - Multi-step form
  JobQueueStatus          - Shows running jobs
  CampaignInfoCard        - Current campaign details
```

### Configuration Files

```
.env.example:
  DATABASE_URL=file:./data/cocoa_canvas.db
  NEXTAUTH_SECRET=<generated>
  NEXTAUTH_URL=http://localhost:3000
  NODE_ENV=development
  
docker-compose.yml:
  services:
    web:
      build: .
      ports: ["3000:3000"]
      environment:
        DATABASE_URL: file:./data/cocoa_canvas.db
      volumes:
        - ./data:/app/data
    
    postgres:  # Optional, commented out for Phase 1
      image: postgres:15
      environment:
        POSTGRES_DB: cocoa_canvas
      ports: ["5432:5432"]
      volumes: [postgres_data:/var/lib/postgresql/data]
```

### Definition of Done (Phase 1)

```
✓ Docker: docker-compose up starts app on http://localhost:3000
✓ Auth: Can create admin user on first install
✓ Auth: Can login/logout with email/password
✓ Wizard: Can create campaign with name, dates, target area
✓ Dashboard: Shows campaign info and job queue
✓ Jobs: Job model tracks import jobs (can view status)
✓ Audit: Every login, campaign creation, job submission is logged
✓ Tested: Manual smoke tests of login, campaign creation flow
✓ Deployed: Can run in Docker with SQLite
```

### Deployment Notes (Phase 1)

```
Single command startup:
  docker-compose up
  
First time:
  1. App detects empty DB
  2. Runs migrations automatically
  3. Redirects to /setup
  4. Admin creates account
  5. Admin creates first campaign
  6. Ready for Phase 2: imports

Data persistence:
  SQLite: ./data/cocoa_canvas.db (mounted volume)
  Backups: Copy ./data/cocoa_canvas.db
```

---

## Phase 2: Voter Data (Week 3-4)

### Goals
- Import Contra Costa County voter file
- Search, filter, view voter records
- Export voter lists
- Audit all data access

### Features to Build

#### Voter Import
```
✓ File upload for .txt voter file
✓ Format detection (fixed-width for Contra Costa)
✓ Preview first N rows before importing
✓ Field mapping validation
✓ Batch insert into database
✓ Progress tracking during import
✓ Error logging (row-by-row failures)
✓ Can view and fix errors
✓ Rollback import if needed
```

#### Voter Search & Filter
```
✓ Search by:
  - First/last name
  - Address, city, zip
  - Voter ID
✓ Filter by:
  - Voter status (active, inactive, etc.)
  - Party affiliation
  - Precinct (if available)
✓ Pagination (100 per page)
✓ Sort by name, address
```

#### Voter Export
```
✓ Export search results as CSV
✓ Choose fields to include (name, address, phone, etc.)
✓ Audit log: who exported, when, how many records, which fields
✓ Exports contain data as-of timestamp
```

### Database Schema (Phase 1 + Phase 2)

Schema details are maintained in the master reference:

- [Master Database Schema](../developer/DATABASE_SCHEMA_MASTER.md)

### API Endpoints (Phase 2)

```
Import:
  POST   /api/v1/imports/start        - Begin import job
  POST   /api/v1/imports/:id/upload   - Upload file
  POST   /api/v1/imports/:id/validate - Check format
  POST   /api/v1/imports/:id/execute  - Execute import
  GET    /api/v1/imports/:id/progress - Poll progress
  GET    /api/v1/imports/:id/result   - Get results
  POST   /api/v1/imports/:id/rollback - Undo import

Voter Search:
  GET    /api/v1/voters              - List/search voters
  GET    /api/v1/voters/:id          - Get single voter
  
Voter Export:
  POST   /api/v1/voters/export       - Export search results
  GET    /api/v1/voters/export/:id   - Download CSV
  
Notes:
  POST   /api/v1/voters/:id/notes    - Add note to voter
```

### UI Components (Phase 2)

```
Pages:
  /voters                - Search/filter interface
  /voters/:id            - Voter detail view
  /imports               - Import management
  
Components:
  VoterSearchForm        - Name, address, filters
  VoterTable             - Results with pagination
  VoterDetailPanel       - Full voter info + notes
  ImportWizard           - Multi-step import
  ImportProgress         - Progress bar + logs
```

### Definition of Done (Phase 2)

```
✓ Can upload Contra Costa voter file (.txt)
✓ Preview shows first 50 rows before importing
✓ Import validation checks required fields
✓ Can execute import with progress tracking
✓ 150K+ voters import in < 5 minutes
✓ Can search voters by name, address
✓ Can filter by status, party
✓ Can export search results as CSV
✓ Can add notes to voter records
✓ All imports/exports audited
✓ Can view import history and error logs
✓ Can rollback import if needed
✓ Tests: Import with 10K voters, search, export
```

---

## Phase 3: Spatial Data & Geocoding (Week 5-6)

### Goals
- Import parcel GeoJSON files
- Calculate centroids for geocoding fallback
- Geocode voter addresses using APIs
- Link voters to precincts

### Features to Build

#### Parcel Import
```
✓ Upload GeoJSON file (precincts, parcels, etc.)
✓ Parse geometry and properties
✓ Auto-detect feature type (polygon, point, etc.)
✓ Calculate centroid for polygons
✓ Store properties as JSON
✓ Create spatial index
```

#### Geocoding
```
✓ Use Census geocoder (free, no API key)
✓ Fallback to parcel centroid for addresses without coordinates
✓ Batch geocoding (1000s at a time)
✓ Progress tracking
✓ Can re-geocode subset
```

### Database Schema (Phase 1 + 2 + 3)

Planned geospatial models are tracked in planning but are not in the current schema. Use the master schema as the source of truth:

- [Master Database Schema](../developer/DATABASE_SCHEMA_MASTER.md)

### API Endpoints (Phase 3)

```
GeoJSON Import:
  POST   /api/v1/geojson/import      - Upload GeoJSON file
  GET    /api/v1/geojson/import/:id  - Get import status
  
Geocoding:
  POST   /api/v1/geocoding/start     - Start geocoding job
  GET    /api/v1/geocoding/:id/progress
  GET    /api/v1/geocoding/:id/result
  
Geographic:
  GET    /api/v1/features            - List geographic features
  GET    /api/v1/features/:id        - Get feature details
```

### Definition of Done (Phase 3)

```
✓ Can import parcel GeoJSON (polygon, point, etc.)
✓ Centroid calculated for polygons
✓ Can geocode 150K voters in < 30 minutes
✓ Fallback to parcel centroid if API fails
✓ Voters linked to precincts
✓ Can view precinct boundaries on map (next phase)
✓ All geocoding tracked and auditable
✓ Can re-geocode subset of voters
✓ Tests: Import GeoJSON, geocode 10K voters
```

---

## Phase 4: MVP - Map & Household Linking (Week 7-8)

### Goals
- Link voters at same address into households
- Display voters on interactive map
- Show map to authenticated users
- Achieve MVP status

### Features to Build

#### Household Linking
```
✓ Group voters by address into households
✓ Non-destructive: track household grouping
✓ Bulk link unlinked voters
```

#### Map Display
```
✓ Display voter points on map (Leaflet)
✓ Color code by status (contacted, uncontacted)
✓ Filter by voting score, party, etc.
✓ Click voter to see details
✓ Click precinct to view stats
✓ Zoom-based layer display
```

### Database Schema (Final MVP)

Household and address grouping exist in the current schema. See the master schema for details:

- [Master Database Schema](../developer/DATABASE_SCHEMA_MASTER.md)

### API Endpoints (Phase 4)

```
Household:
  POST   /api/v1/households/link     - Link voters by address
  GET    /api/v1/households          - List households
  GET    /api/v1/households/:id      - Get household + residents
  
Map:
  GET    /api/v1/map/voters          - Get voter points (GeoJSON)
  GET    /api/v1/map/precincts       - Get precinct boundaries (GeoJSON)
```

### UI Components (Phase 4)

```
Pages:
  /map                   - Full-screen map view
  
Components:
  MapContainer           - Leaflet map
  VoterMarker            - Styled voter point
  PrecinctLayer          - Precinct polygons
  MapLegend              - Color coding legend
  MapFilter              - Voting score, status filters
```

### Definition of Done (Phase 4 - MVP)

```
✓ Voters grouped into households by address
✓ Map displays voter points (150K+ points)
✓ Can filter by voting score, party, status
✓ Click voter shows details in popup
✓ Click precinct shows statistics
✓ Zoom-based layer rendering (precincts at zoom 12+)
✓ Clustering at zoom out (< 10K points visible)
✓ Can export voter list from map selection
✓ All map interactions audited
✓ Mobile-responsive (desktop primary, tablet secondary)
✓ Tests: Load 150K voters, pan/zoom, export selection
✓ Deployment: Runs in Docker with SQLite

MVP ACHIEVED:
  - Can import voter file
  - Can search and filter voters
  - Can view voters on map
  - Can export voter lists
  - Secure authentication
  - Full audit trail
  - Single-command deployment
```

---

## Implementation Timeline & Deliverables

### Phase 1: Foundation (2 weeks)
```
Week 1:
  - Docker setup, auth, session mgmt
  - Setup wizard UI
  
Week 2:
  - Job queue system
  - Admin dashboard
  - Deploy on docker-compose
  
Deliverable: 
  - Image: cocoa-canvas:phase1
  - Can login, create campaign
  - Runs in Docker with SQLite
```

### Phase 2: Voter Data (2 weeks)
```
Week 3:
  - Voter model, import parser
  - Import UI, file upload
  - Search/filter implementation
  
Week 4:
  - Export functionality
  - Notes/audit
  - Testing & refinement
  
Deliverable:
  - Image: cocoa-canvas:phase2
  - Can import 150K voters
  - Can search and export
```

### Phase 3: Spatial (2 weeks)
```
Week 5:
  - GeoJSON import
  - Centroid calculation
  - Geocoding service integration
  
Week 6:
  - Batch geocoding
  - Precinct linking
  - Testing
  
Deliverable:
  - Image: cocoa-canvas:phase3
  - Voters geocoded
  - Spatial data ready
```

### Phase 4: MVP Map (2 weeks)
```
Week 7:
  - Household linking
  - Map UI with Leaflet
  - Map filtering
  
Week 8:
  - Precinct overlays
  - Optimization (clustering)
  - Full testing & polish
  
Deliverable:
  - Image: cocoa-canvas:phase4 (MVP)
  - Fully functional voter management + map
  - Ready for production use
```

---

## Data Integrity & Non-Destructive Operations

### Key Principles

#### No Hard Deletes
```
- Voters never deleted
- Mark with status "removed" if needed
- Track all changes in audit log
- Can "restore" via audit trail
```

#### Import Tracking
```
Each import creates ImportJob with:
  - File hash (prevent re-import)
  - Original data snapshot
  - Processing log
  - Can rollback entire import
  
Voters track sourceImportJob
  - Know which import added/updated them
  - Can revert if import is rolled back
```

#### Audit Logging
```
Every action logged:
  - Login/logout
  - Create campaign
  - Submit import
  - View voter record
  - Export data
  - Modify voter

With context:
  - User ID & name
  - Timestamp
  - IP address
  - What changed (before/after values)
```

### Backup Strategy

```
SQLite Phase 1-4:
  - ./data/cocoa_canvas.db (mounted volume)
  - Manual backups: cp data/cocoa_canvas.db backups/cocoa_canvas.db.<date>
  - Retention: Keep last 30 days

PostgreSQL (if upgraded):
  - pg_dump cocoa_canvas > backup.sql
  - Automated weekly backups
  - Point-in-time recovery possible
```

---

## Branching & Deployment Strategy

### Git Branches

```
main
  - Production-ready code
  - Tagged with phases (v1.0, v2.0, etc.)
  
develop
  - Integration branch
  - All PRs merged here first
  
phase/1, phase/2, phase/3, phase/4
  - Feature branches for each phase
  - Merge to develop when phase done
```

### Docker Tagging

```
cocoa-canvas:latest          - Current main
cocoa-canvas:phase1          - Phase 1 stable
cocoa-canvas:phase2          - Phase 2 stable
cocoa-canvas:dev             - Current develop
cocoa-canvas:v1.0            - Release tags
```

### Release Checklist (Per Phase)

```
Before Phase X Release:
  ✓ All features from phase implemented
  ✓ Database schema finalized
  ✓ API endpoints tested
  ✓ UI tested on desktop+tablet
  ✓ No known data loss issues
  ✓ Import/export audit logging verified
  ✓ Docker image builds cleanly
  ✓ Single-command startup works
  ✓ Documentation updated
  ✓ Tag release: git tag v<phase>.0
```

---

## Getting Started: Phase 1

```bash
# Initialize Phase 1 project
mkdir cocoa-canvas-app
cd cocoa-canvas-app

# Copy planning docs
cp ../cocoa-canvas/*.md ./docs/

# Create Next.js app
npx create-next-app@latest . --typescript --tailwind

# Create directory structure
mkdir -p prisma lib/db lib/auth lib/job app/api app/components

# Set up Prisma with SQLite
npm install @prisma/client
npx prisma init

# Update schema.prisma using the master schema reference
# See docs/developer/DATABASE_SCHEMA_MASTER.md
# Configure DATABASE_URL in .env.local

# Run migrations
npx prisma migrate dev --name init

# Start development
npm run dev
```

---

## Success Metrics (Per Phase)

### Phase 1
- [ ] Application starts with: docker-compose up
- [ ] Admin can create account
- [ ] Admin can create campaign
- [ ] Jobs run and complete
- [ ] All actions logged to audit table

### Phase 2
- [ ] Import 150K voters in < 5 minutes
- [ ] Search finds voters < 500ms (150K records)
- [ ] Export 10K voters as CSV < 10 seconds
- [ ] All data access audited
- [ ] No data loss during import/export

### Phase 3
- [ ] Geocode 150K voters in < 30 minutes
- [ ] 90%+ match rate to Census geocoder
- [ ] Fallback to parcel centroid works
- [ ] Precincts linked correctly
- [ ] Spatial queries performant

### Phase 4 (MVP)
- [ ] Map loads 150K voter points in < 3 seconds
- [ ] Pan/zoom responsive (< 500ms updates)
- [ ] Clustering works at zoom < 10
- [ ] Can search/filter while on map
- [ ] Mobile works on tablets (responsive)
- [ ] No data loss or corruption
- [ ] Audit trail complete for all map operations

---

## Summary

| Phase | Duration | Key Feature | MVP? | Docker? |
|-------|----------|-------------|------|---------|
| 1 | 2 weeks | Auth + Setup | No | ✓ |
| 2 | 2 weeks | Import + Search | No | ✓ |
| 3 | 2 weeks | Geocoding | No | ✓ |
| 4 | 2 weeks | Map + Households | ✓ MVP | ✓ |

Each phase incrementally builds on the previous one. At each phase boundary, you have a working, deployable application.

**Total: 8 weeks to MVP**

Next steps: Start Phase 1 implementation with Docker setup + auth system.
