# Cocoa Canvas - Map Display Plan

## Overview

Cocoa Canvas uses **Leaflet** for interactive mapping of voters, precincts, and canvassing data. The map is implemented in **Phase 4 (MVP)** as the capstone feature after voter data infrastructure (Phases 1-3) is complete.

**Design Philosophy**: Build on proven tech stack (existing map-app), leverage GeoJSON for spatial data, optimize for performance with dynamic data loading.

**NOTE**: This describes the final Phase 4 MVP map feature. Phases 1-3 build the data infrastructure required to power this map.

---

## Map Components & Layers

### Core Layers (Always Visible)

**Basemap**:
- OpenStreetMap (default, free, open source)
- Optional: Mapbox (for better styling, if hosting budget allows)
- Alt: Stamen Toner/Terrain for different viewing contexts

**Voter Points** (configurable):
- Household/voter locations
- Color-coded by status:
  - 🟢 Green: Contacted/favorable response
  - 🔵 Blue: Not yet contacted
  - 🟡 Yellow: Follow-up needed
  - 🔴 Red: Not receptive
  - ⚪ Gray: No data
- Size: Represents voting frequency or engagement score
- Hover: Show name, address, party, last contact date

### Optional Layers (Toggle Via Control)

**Precinct Boundaries**:
- Polygon overlays from GeoJSON import
- Click to view precinct stats (voter count, completion %)
- Highlight on hover

**Parcel Overlays** (High zoom only):
- Property boundaries (when zoomed to street level, zoom > 16)
- Shows assessed value or owner info if available
- Context for understanding voter location in geographic context

**Assignment Heat Maps**:
- Density visualization of canvasser assignments
- Help identify coverage gaps
- Color intensity = coverage density

**Campaign Target Areas**:
- Polygon overlays for campaign-specific focus areas
- Filter by campaign to highlight priority zones

**Geocoding Status**:
- Visual indicator of voters with/without coordinates
- Helps identify geocoding gaps before canvassing

---

## Interactive Features

### Voter Interaction

```
1. Click voter point
   → Show popup: name, address, party, voting history, notes
   → Option to view full profile
   → Quick actions: assign to canvasser, add note, view history

2. Hover voter point
   → Show tooltip: name, address, last contact

3. Select multiple voters (drag box or polygon select)
   → Highlight selection
   → Bulk actions: assign to team, tag, export list

4. Click household (if multiple voters)
   → Show resident list
   → Assign team members to go to same address
```

### Precinct & Geography Interaction

```
1. Click precinct
   → Show stats popup:
      - Total voters
      - Voters contacted
      - % completion
      - Team assignments
   → Option to filter map to precinct

2. Hover precinct
   → Highlight boundary
   → Show precinct name/ID

3. Zoom to precinct (shortcut)
   → Press Z, then click precinct
   → Auto-center and zoom to bounds
```

### Filter Panel

**Voter Filters** (same as existing map-app, extended):
```
□ Voting History
  [0 ====●====== 5+] elections

□ Party Affiliation
  ☑ Democrat
  ☑ Republican
  ☐ Independent
  ☐ Other

□ Contact Status
  ☑ Not contacted
  ☑ Contacted
  ☐ Refused
  ☐ Supporter

□ Assignment
  ☐ Unassigned (no team lead)
  ☑ Assigned to me
  ☑ Assigned to: [Select team...]

□ Precinct
  [Select precinct...]

□ Geographic Area
  [Zoom bounds / draw bounds]

□ Demographics (if available)
  ☑ Likely voters
  ☐ Low propensity voters
```

---

## Map Interactions for Canvassing

### Assignment Workflow

```
1. Select voters or precinct area
2. Click "Assign to team" button
3. Choose canvasser/team from dropdown
4. Set survey/script to use
5. Map highlights assignment (light blue shade)
6. Canvasser sees assignment on their view

Canvasser view:
  - Only sees assigned voters
  - Map shows which ones they've contacted
  - Route optimization (optional)
```

### Canvassing Progress Visualization

```
Real-time updates:
  - Blue pin → uncontacted
  - Changes to green → contacted when canvasser submits response
  - Opacity/shading shows time since last activity

Completion percentage:
  - By precinct
  - By team
  - By campaign

Heat maps (future):
  - Time spent per location
  - Geographic hotspots of engagement
```

### Route Mapping (Future)

```
Auto-generate effective routes:
  - Start point: canvasser location or home
  - Visit assigned voters in efficient order
  - Show walking/driving distance
  - Mobile app shows turn-by-turn (if built later)
```

---

## Technical Architecture

### Data Structure

```
Map receives GeoJSON FeatureCollection:

{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-121.97, 37.97]
      },
      "properties": {
        // Voter/household data
        "household_id": 12345,
        "address": "123 Main St",
        "city": "Pleasanton",
        
        // Contact info (if user has permission)
        "voters": [
          {
            "voter_id": "V123456",
            "name": "John Doe",
            "party": "D"
          }
        ],
        
        // Status fields
        "contact_status": "not_contacted",
        "voting_score": 4,
        "assigned_to": "team-1",
        "assigned_precinct": "03-12",
        
        // Metadata
        "last_contact": "2025-02-10T14:30:00Z",
        "geocoded": true
      }
    }
  ]
}
```

### Performance Optimization

```
1. Viewport-based loading
   - Load only voters in visible bounds
   - Debounce updates (200ms)
   - Progressive loading as user pans/zooms

2. Data clustering (high zoom out)
   - At zoom < 13: cluster points into groups
   - Show cluster count
   - Shows aggregated stats: total voters, avg voting score
   - Click cluster to zoom in

3. Layer management
   - Disable precinct layers at zoom < 12 (too many details)
   - Disable parcel layers at zoom < 16 (memory intensive)
   - Load only visible precincts

4. Caching
   - Cache GeoJSON by bounds/zoom
   - Cache user filter preferences
   - Cache assignment data

5. Limits
   - Max 20K points displayed (configurable)
   - If exceeds: show warning, prompt to filter
   - Or auto-zoom to reduce extent
```

### API Endpoints for Map Data

```
GET /api/map/voters
  ?bounds=north,south,east,west
  ?filters=votingScore,party,status,assignment
  ?zoom=13

GET /api/map/precincts
  ?bounds=...
  ?campaign_id=...

GET /api/map/parcels
  ?bounds=...
  (only return if zoom > 16)

GET /api/map/assignments
  ?user_id=...
  ?team_id=...
  ?status=pending,completed

GET /api/map/household/:id
  -> Full household profile with all residents
```

---

## UI Components Breakdown

### Map Container (`MapContainer.tsx`)
- Leaflet map instance
- Layer management
- Zoom/pan controls
- Attribution

### Filter Panel (`FilterPanel.tsx`)
- Voter filters (voting history, party, status, precinct)
- Geographic filters (bounds, draw polygon)
- Filter controls (apply, reset, save preset)

### Popup Component (`VoterPopup.tsx`)
- Quick preview on click
- Show/hide personal details based on user role
- Quick action buttons (assign, note, view profile)

### Heat Map Layer (`HeatMapLayer.tsx`)
- Density visualization
- Temperature color scheme
- Toggleable

### Cluster Marker (`ClusterMarker.tsx`)
- Group markers at low zoom
- Show aggregate count
- Click to zoom

### Assignment Panel (`AssignmentPanel.tsx`)
- Sidebar showing assignments
- Progress indicators
- Team list with availability
- Drag-and-drop assignment (optional)

### Route View (`RouteView.tsx`) [Future]
- Show optimized route
- Distance & time estimates
- Turn-by-turn navigation

---

## Map Keyboard Shortcuts

```
? = Show help / keyboard shortcuts
H = Highlight search results
Z = Zoom to precinct (then click)
A = Toggle assignment info overlay
F = Toggle filter panel
C = Clear selection
E = Export selected voters
< = Zoom out
> = Zoom in
```

---

## Mobile Responsive (Future)

```
Desktop (1200px+):
  - Full map on left (75%)
  - Filter panel on right (25%)
  - Popups on click
  - Keyboard shortcuts enabled

Tablet (768px - 1199px):
  - Full map
  - Filter panel toggleable (bottom drawer)
  - Larger touch targets

Mobile (< 768px):
  - Full screen map
  - Bottom drawer for filters/popups
  - Touch gestures for zoom/pan
  - "View List" option for voters
  - Dedicated canvassing app (future)
```

---

## Styling & Visual Design

### Color Scheme

```
Contact Status:
  🟢 #22c55e - Contacted/favorable
  🔵 #3b82f6 - Not yet contacted
  🟡 #eab308 - Follow-up needed
  🔴 #ef4444 - Not receptive
  ⚪ #d1d5db - No data/unknown

Party:
  🔵 #0066cc - Democrat
  🔴 #cc0000 - Republican
  ⚫ #666666 - Independent/other

Precincts:
  Light blue transparent fill
  Dark blue borders
  Hover: medium blue

Assignments:
  Light green wash = assigned to current user
  Light yellow wash = assigned to team
  Light red wash = overdue
```

### Marker Styles

```
Default: 12px circle, semi-transparent
Hover: 16px circle, more opaque
Selected: 18px circle + blue glow
Contacted: Checkmark overlay
Uncontacted: Plain circle

Cluster: Larger circle with count badge
Assignment highlight: Circle with outline color matching team
```

---

## Integration with Canvassing & Campaigns

### Campaign View
```
POST /api/map/campaign/:id/view
→ Returns:
   - Voters in campaign target area
   - Precincts highlighted
   - Assignment status by team
   - Progress pie charts overlaid
```

### Canvasser Mobile View
```
/app/canvass/map
  - Shows assigned voters only
  - Filter: contacted/uncontacted
  - "Navigate" button → turn-by-turn routing
  - Submit survey directly from popup
  - Offline capable (Service Worker + IndexedDB)
```

### Team Lead Dashboard
```
/app/dashboard/map
  - Shows all team member assignments
  - Real-time location dots (if enabled)
  - Completion progress heatmap
  - Performance metrics by precinct
```

---

## Data Privacy & Permissions

**Voter PII on Map**:
- Admin: See all details (name, address, phone, email)
- Manager: See assigned voters + team assignments
- Canvasser: See only assigned voters, name + address only
- Viewer: No access to map / aggregated data only

**Hover Tooltip**: Shows only what user has permission to see
- Canvasser: "John D. at 123 Main St"
- Manager: Full name + address + assignment

**Export from Map**: Audit logged, requires confirmation for large selections

---

## Performance & Deployment Notes

### Development Setup
```
- Local Leaflet from npm
- Develop with test GeoJSON files
- Hot reload supported
```

### Production Deployment
```
- CDN for basemap tiles (OpenStreetMap)
- GeoJSON served from API with caching headers
- Mapbox API key if using Mapbox tiles (optional upgrade)
```

### Testing Strategy
```
- Test with 50K+ voter points
- Test with 500 precincts
- Test cluster performance at zoom out
- Mobile touch testing on tablet/phone
- Accessibility: keyboard nav, screen reader support
```

---

## Implementation Timeline (See PHASE_PLAN.md)

### Phase 4 (MVP): Map Implementation (Week 7-8)

**Week 7**:
- [ ] Household linking by address
- [ ] MapContainer with voter point clustering
- [ ] Precinct polygon overlay
- [ ] Filter panel (voting score, party, status)
- [ ] Marker styling (color-coded by contact status)

**Week 8**:
- [ ] Map search integration
- [ ] Precinct click stats
- [ ] Performance optimization (clustering at zoom < 10)
- [ ] Mobile responsive (tablets)
- [ ] Testing & polish

### Phase 5+ (Future): Advanced Features
```
□ Route optimization for canvassers
□ Heat map visualization of progress
□ Geographic analytics (completion by precinct)
□ Mobile app (dedicated canvasser app)
□ Offline capability for canvassers
□ Real-time updates (WebSocket)
□ Assignment heat maps on map display
```

---

## Summary

The map is a **geographic workbench** for voter organization staff:
- **Admins**: Full visibility, data management
- **Managers**: Team assignments, progress monitoring
- **Canvassers**: Clean, focused view of assigned voters and routes
- **Transparency**: Every interaction is logged for accountability

Leaflet provides the foundation; GeoJSON provides flexibility; performance optimization ensures scalability to 100K+ voters.
