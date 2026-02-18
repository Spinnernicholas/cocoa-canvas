---
title: "Phase 3: Campaign Management & Map Visualization"
---

# Phase 3: Campaign Management & Map Visualization

**Goal**: Single campaign setup and household map visualization with parcel data integration

**Note**: Single campaign per deployment. All people/contacts are part of "the" campaign.

---

## 📋 PHASE 3A: CAMPAIGN ENDPOINTS & DASHBOARD (1-2 hours)

### Campaign Dashboard Page
- [ ] Create `app/campaign/page.tsx`
  - [ ] Display campaign overview and statistics
  - [ ] Link to map view (`/campaign/map`)
  - [ ] Show campaign details (name, dates, target area)
  - [ ] Quick stats: total households, people counts
  - [ ] Recent activity/contact logs
  - [ ] Link from main dashboard to campaign page

### Campaign Configuration (Single Campaign)
- [ ] `GET /api/v1/campaign`
  - [ ] Get the single campaign with stats
  - [ ] Response: `{ campaign: Campaign, stats: CampaignStats }`
  - [ ] Stats: total households, people counts (voters, volunteers, donors)

- [ ] `PUT /api/v1/campaign`
  - [ ] Update campaign details (name, startDate, endDate, targetArea, election name, election date, description)
  - [ ] Validate dates
  - [ ] Audit log
  - [ ] Response: `{ campaign: Campaign }`

---

## 📦 PHASE 3B: PARCEL DATA LOADING (1-2 hours)

**Purpose**: Load parcel/property data with GIS geometry to enhance household geocoding accuracy and enable advanced mapping.

### Parcel Model
- [x] Database schema: `model Parcel` with:
  - [x] Address fields (streetNumber, streetName, city, state, zipCode)
  - [x] GIS geometry (stored as GeoJSON)
  - [x] Centroid (latitude/longitude, auto-calculated from geometry if not provided)
  - [x] External references (APN - Assessor's Parcel Number, externalId, externalSource)
  - [x] Import tracking (importedFrom, importedAt)
  - [x] Relations to Household[] for linking households to parcels
- [x] Indexes on: fullAddress, zipCode, city
- [x] Unique constraint on: apn + externalSource

### Parcel Import Endpoint
- [ ] `POST /api/v1/gis/parcels/import`
  - [ ] Accept parcel data file (GeoJSON or CSV with geometry)
  - [ ] Parse GeoJSON FeatureCollection or CSV with WKT geometry
  - [ ] Extract/calculate centroid from geometry:
    - [ ] If geometry has centroid property, use it
    - [ ] Otherwise, calculate from geometry bounds or polygon center
  - [ ] Match parcels to households by address (fullAddress, APN, etc.)
  - [ ] Link matched households to parcel records via parcelId FK
  - [ ] Update household coordinates from parcel centroid if household has no coordinates
  - [ ] Track import source and timestamp
  - [ ] Return: `{ imported: number, linked: number, errors: array }`

### Centroid Calculation Service
- [ ] Create `lib/gis/centroid.ts`
  - [ ] Function to calculate centroid from GeoJSON geometry (Polygon, MultiPolygon, etc.)
  - [ ] Function to calculate bounding box center from coordinates
  - [ ] Handle various geometry types (Point, Polygon, MultiPolygon, etc.)
  - [ ] Return `{ latitude: number, longitude: number }`
  - [ ] Tests for various geometry types

### Parcel-Household Linking Service
- [ ] Create `lib/gis/parcel-linking.ts`
  - [ ] Match parcel to household by:
    - [ ] Full address string match (normalized)
    - [ ] APN match (if parcel and household both have APN)
    - [ ] Fallback: fuzzy address matching (street name + number + zip)
  - [ ] Update household.parcelId on match
  - [ ] Update household coordinates from parcel centroid (if household coords missing)
  - [ ] Log linkage results and failures
  - [ ] Return match statistics

### Tests
- [ ] Parse GeoJSON FeatureCollection correctly
- [ ] Calculate centroid from various geometry types (Polygon, MultiPolygon, etc.)
- [ ] Match parcels to households by address
- [ ] Match parcels to households by APN
- [ ] Update household coordinates from parcel centroid
- [ ] Return 400 if file format invalid
- [ ] Handle missing geometry gracefully
- [ ] Performance: Test with 1000+ parcels

---

## 🌐 PHASE 3C: GIS ENDPOINTS (2-3 hours)

**Purpose**: Efficient geographic and administrative filtering of households for Leaflet map rendering and targeted outreach.

### Households Query Endpoint
- [ ] `GET /api/v1/gis/households`
  - [ ] Query households with flexible filtering
  - [ ] Request params:
    - [ ] **Geographic Bounds**: `minLat`, `maxLat`, `minLng`, `maxLng` (map viewport - optional, for map)
    - [ ] **Administrative Filters**:
      - [ ] `city` (optional: filter by city)
      - [ ] `state` (optional: filter by state, default "CA")
      - [ ] `zipCode` (optional: filter by zip code)
      - [ ] `precinctNumber` (optional: filter by voting precinct number)
    - [ ] **Category Filters**:
      - [ ] `hasVoter` (optional: true/false - household has registered voters)
      - [ ] `hasVolunteer` (optional: true/false - household has volunteers)
      - [ ] `hasDonor` (optional: true/false - household has donors)
    - [ ] `limit` (optional: default 1000, max 10000 - for performance)
    - [ ] `offset` (optional: default 0)
  - [ ] Returns only households with valid coordinates (`latitude IS NOT NULL AND longitude IS NOT NULL`)
  - [ ] Response: `{ households: [{ id, fullAddress, city, state, zipCode, latitude, longitude, personCount, members: [{ id, firstName, lastName }] }], total: number, limit: number, offset: number }`
  - [ ] Efficient: Use spatial indexes + field indexes (city, zipCode, precinctNumber)

### Households Statistics Endpoint
- [ ] `GET /api/v1/gis/households/stats`
  - [ ] Get aggregate statistics with same filtering as above
  - [ ] Response: `{ total: number, byCategory: { hasVoter: X, hasVolunteer: Y, hasDonor: Z }, geographicStats: { byCity: {}, byZip: {}, byPrecinct: {} } }`
  - [ ] Useful for dashboard overview and filter counts

### Single Household Endpoint
- [ ] `GET /api/v1/gis/households/:householdId`
  - [ ] Get single household's location and all members with full details
  - [ ] Response: `{ household: { id, fullAddress, city, state, zipCode, latitude, longitude, members: [{ id, firstName, lastName, voter: {...}, volunteer: {...}, donor: {...} }] } }`
  - [ ] Useful for click-to-detail on map and household view modal

### Tests
- [ ] Bounds query returns only households within bounds
- [ ] City/state/zip filters work correctly
- [ ] Precinct number filter works correctly
- [ ] Category filters (hasVoter, hasVolunteer, hasDonor) match correctly
- [ ] Combined filters work (e.g., city + hasVoter)
- [ ] Return 400 if bounds params invalid
- [ ] Return empty array if no households match filters
- [ ] Pagination works with large result sets
- [ ] Max safety check: enforces limit <= 10000
- [ ] Performance: Test with 1000+ households matching filters

---

## 🗺️ PHASE 3D: MAP DISPLAY (4-5 hours)

### Map Page (`/campaign/map`)
- [ ] Create `app/campaign/map/page.tsx`
  - [ ] Integrate Leaflet
  - [ ] On load: Query map bounds and initialize with households near center of target area
  - [ ] Display map of target area (from campaign.targetArea)
  - [ ] Show household pins on map using GIS endpoints
  - [ ] Filter by geography: city, zip code, precinct number
  - [ ] Filter by household type (has_voter, has_volunteer, has_donor)
  - [ ] Zoom/pan controls
  - [ ] Click household pin → show household detail modal
  - [ ] Performance: Query `/api/v1/gis/households` with bounds on map pan/zoom
  - [ ] Safety: Enforce max 10,000 households returned per query
  - [ ] Display count of households returned (actual count, not total)
  - [ ] Show household member count on marker

### Map Leaflet Integration
- [ ] Initialize Leaflet with campaign target area bounds
- [ ] Add tile layer (OpenStreetMap or similar)
- [ ] Add circle markers for each household
  - [ ] Marker size based on household member count
  - [ ] Marker color based on maxStatus (most urgent contact status in household)
- [ ] Bind popups showing address and household member summary
- [ ] Auto-update markers on map movement (debounced)
- [ ] Zoom level indicator for performance tuning
- [ ] Handle empty results (no households match filters)

### Map Display Features & Filters
- [ ] **Location Filters**:
  - [ ] City selector (auto-populated from data in current bounds)
  - [ ] Zip code selector/multi-select (auto-populated from data in current bounds)
  - [ ] Precinct number selector (auto-populated from data in current bounds)
- [ ] **Household Type Filters**: Has Voter, Has Volunteer, Has Donor (checkbox group)
- [ ] Reset/Clear All Filters button
- [ ] Show household member preview (names of all household members) in map popup
- [ ] Quick-action buttons on marker click (view household detail)
- [ ] Household detail modal (on click or button):
  - [ ] Show all household members and their roles (voter, volunteer, donor)
  - [ ] Quick view buttons for each member

### Tests
- [ ] Map loads with households in initial bounds
- [ ] Bounds query filters households correctly when panning/zooming
- [ ] Location filters (city, zip, precinct) update markers
- [ ] Household type filters (has_voter, etc.) update markers
- [ ] Combined filters work (e.g., "San Francisco" + "has_voter")
- [ ] Click marker shows correct household details with all members
- [ ] Performance acceptable with 10,000 household markers
- [ ] Max 10,000 features enforced (does not query beyond limit)

---

## 📦 DELIVERABLES AT END OF PHASE 3

### Pages Ready
- ✅ `/campaign` — Campaign detail and status management
- ✅ `/campaign/map` — Interactive map with household locations

### APIs Ready
- ✅ Campaign get/update endpoints
- ✅ Parcel import and processing endpoints
- ✅ GIS households query endpoints (bounds, filters, pagination)
- ✅ GIS household detail endpoints

### Database State
- Campaign metadata (name, dates, status, target area)
- Parcel records with GIS geometry and calculated centroids
- Household-to-parcel linkages (enhanced geocoding)
- Household coordinates updated from parcel centroids

### Core Capabilities
- Geographic querying of households by bounds, city, zip code, precinct
- Household-level filtering by contact status and member types
- Parcel data import with automatic centroid calculation
- Leaflet map display with household markers and filtering

---

## TIME ESTIMATE

- 📋 Phase 3A (Campaign endpoints): **1-2 hours**
- 📦 Phase 3B (Parcel data loading): **1-2 hours**
- 🌐 Phase 3C (GIS endpoints): **2-3 hours**
- 🗺️ Phase 3D (Map display): **4-5 hours**

**Total: ~8-12 hours (1 week)**

---

## 🚀 FUTURE PHASES (Phase 4+)

- **Phase 4**: Canvassing workflow and knock lists
- **Phase 5**: Messaging and bulk communications
- **Phase 6**: Campaign reporting and analytics
- **Phase 7**: Advanced mapping (heatmaps, clustering optimization)
- **Phase 8**: Analytics & ML (household segmentation, predictive modeling)
- **Phase 9**: User management & permissions
- **Phase 10**: Extended data sources and integrations
