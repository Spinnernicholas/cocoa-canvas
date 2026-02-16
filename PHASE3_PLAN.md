# Phase 3: Campaign Management & Canvassing (Weeks 5-6)

**Goal**: Campaign setup, voter targeting, canvassing workflow, and map visualization

---

## 📋 PHASE 3A: CAMPAIGN ENDPOINTS (3-4 hours)

### Campaign CRUD
- [ ] `GET /api/v1/campaigns`
  - [ ] List all campaigns with status
  - [ ] Filter by status (planning, active, paused, completed)
  - [ ] Pagination
  - [ ] Response: `{ campaigns: Campaign[], total: number }`

- [ ] `POST /api/v1/campaigns`
  - [ ] Create campaign (name, startDate, endDate, targetArea, description)
  - [ ] Validate dates
  - [ ] Audit log
  - [ ] Response: `{ campaign: Campaign }`

- [ ] `GET /api/v1/campaigns/:id`
  - [ ] Get single campaign with stats (total voters, contacted, pending)
  - [ ] Response: `{ campaign: Campaign, stats: CampaignStats }`

- [ ] `PUT /api/v1/campaigns/:id`
  - [ ] Update campaign details
  - [ ] Response: `{ campaign: Campaign }`

- [ ] `PATCH /api/v1/campaigns/:id/status`
  - [ ] Change status (planning → active, active → paused, etc.)
  - [ ] Response: `{ campaign: Campaign }`

### Tests for all endpoints

---

## 🎯 PHASE 3B: VOTER TARGETING (2-3 hours)

### Campaign Voter Assignment
- [ ] `POST /api/v1/campaigns/:id/voters`
  - [ ] Add voters to campaign
  - [ ] Accept voter IDs or filters (status, area)
  - [ ] Create assignment records
  - [ ] Response: `{ assigned: number }`

- [ ] `GET /api/v1/campaigns/:id/voters`
  - [ ] List voters assigned to campaign
  - [ ] Filter by contact status
  - [ ] Pagination
  - [ ] Response: `{ voters: CampaignVoter[], total: number, stats: { contacted, pending, etc } }`

- [ ] `DELETE /api/v1/campaigns/:id/voters/:voterId`
  - [ ] Remove voter from campaign
  - [ ] Response: `{ success: true }`

### Tests

---

## 🗺️ PHASE 3C: MAP DISPLAY (4-5 hours)

### Map Page (`/maps`)
- [ ] Create `app/maps/page.tsx`
  - [ ] Integrate Leaflet or Mapbox
  - [ ] Display map of target area
  - [ ] Show voter pins on map
  - [ ] Color code by contact status (contacted: green, pending: yellow, failed: red)
  - [ ] Campaign filter dropdown
  - [ ] Zoom/pan controls
  - [ ] Click voter pin → show details
  - [ ] Clustering for performance
  - [ ] Heatmap mode (optional)

### Map Endpoint
- [ ] `GET /api/v1/campaign/:id/map-data`
  - [ ] Return voter locations (lat/lng)
  - [ ] Include status for color coding
  - [ ] Include bounds for auto-zoom
  - [ ] Pagination for performance
  - [ ] Response: `{ voters: MapVoter[], bounds: Bounds }`

### Map Service Component
- [ ] Create `components/MapDisplay.tsx`
  - [ ] Leaflet map wrapper
  - [ ] Marker layer with filtering
  - [ ] Info popup on marker click
  - [ ] Zoom to campaign bounds
  - [ ] Color legend

### Tests

---

## ✅ PHASE 3D: CANVASSING WORKFLOW (3-4 hours)

### Knock List Page (`/knock-list`)
- [ ] Create `app/knock-list/page.tsx`
  - [ ] Campaign selector
  - [ ] List of voters to contact (pending only)
  - [ ] Quick actions (contacted, not home, refused, etc.)
  - [ ] Show next voter on click
  - [ ] Preserve order by address proximity
  - [ ] Progress bar (X of Y contacted)

### Voter Contact Quick Update
- [ ] Create `components/QuickContactForm.tsx`
  - [ ] Outcome dropdown (contacted, refused, not home, no answer, moved)
  - [ ] Notes textarea
  - [ ] Quick send (SMS/email) checkbox
  - [ ] Submit button → logs contact and moves to next voter

### Auto-Advance Behavior
- [ ] After logging contact, auto-advance to next pending voter
- [ ] Show completion message when all contacted
- [ ] Option to export results

### Tests

---

## 📞 PHASE 3E: MESSAGING (2-3 hours)

### Bulk Messaging Endpoint
- [ ] `POST /api/v1/campaigns/:id/message`
  - [ ] Accept message template and recipients
  - [ ] Support SMS and email
  - [ ] Create messaging job
  - [ ] Return job ID
  - [ ] Response: `{ jobId: string }`

### Messaging Job Handler
- [ ] Extend job runner to handle `message` job type
  - [ ] Send SMS or email to each voter
  - [ ] Track delivery status
  - [ ] Log failures
  - [ ] Update progress

### Templates
- [ ] `lib/messaging/templates.ts`
  - [ ] Campaign launch message
  - [ ] Reminder message
  - [ ] Survey message
  - [ ] Customizable placeholders ({{name}}, {{date}}, etc.)

### Tests

---

## 📊 PHASE 3F: CAMPAIGN REPORTS (2-3 hours)

### Campaign Statistics Endpoint
- [ ] `GET /api/v1/campaigns/:id/stats`
  - [ ] Total voters, contacted, pending
  - [ ] Contact rate by date
  - [ ] Messages sent (SMS/email counts)
  - [ ] Response: `{ stats: CampaignStats }`

### Report Page (`/reports`)
- [ ] Create `app/reports/page.tsx`
  - [ ] Campaign selection
  - [ ] Date range filter
  - [ ] Display stats cards
  - [ ] Contact history chart (line graph)
  - [ ] Contact method breakdown (pie chart)
  - [ ] Export button (CSV)

### Report Component
- [ ] Create `components/CampaignReport.tsx`
  - [ ] Stats cards (total, contacted, pending, rate%)
  - [ ] Contact timeline chart
  - [ ] Export CSV button

### Tests

---

## 🧪 PHASE 3G: TESTING (2-3 hours)

### Campaign Endpoint Tests
- [ ] `app/api/v1/campaigns.test.ts`
- [ ] `app/api/v1/campaigns/[id].test.ts`
- [ ] `app/api/v1/campaigns/[id]/voters.test.ts`

### Map Tests
- [ ] `app/api/v1/campaigns/[id]/map-data.test.ts`

### Canvassing Tests
- [ ] Integration test: select campaign → view knock list → log contact

### Messaging Tests
- [ ] `app/api/v1/campaigns/[id]/message.test.ts`
- [ ] Job handler tests for messaging

---

## 📦 DELIVERABLES AT END OF PHASE 3

### Pages Ready
- ✅ `/campaigns` — Campaign list and management
- ✅ `/campaigns/[id]` — Campaign detail page
- ✅ `/maps` — Interactive map with voter locations
- ✅ `/knock-list` — Canvassing knock list
- ✅ `/reports` — Campaign statistics and reports

### APIs Ready
- ✅ Campaign CRUD endpoints
- ✅ Campaign voter targeting endpoints
- ✅ Map data endpoint
- ✅ Bulk messaging endpoint
- ✅ Campaign statistics endpoint

### Database State
- Campaign records with voter assignments
- Contact logs from canvassing
- Message delivery logs
- Campaign statistics

---

## TIME ESTIMATE

- 📋 Phase 3A (Campaign endpoints): **3-4 hours**
- 🎯 Phase 3B (Voter targeting): **2-3 hours**
- 🗺️ Phase 3C (Map display): **4-5 hours**
- ✅ Phase 3D (Canvassing): **3-4 hours**
- 📞 Phase 3E (Messaging): **2-3 hours**
- 📊 Phase 3F (Reports): **2-3 hours**
- 🧪 Phase 3G (Testing): **2-3 hours**

**Total: ~22-28 hours (3-4 weeks with other work)**

---

## 🚀 FUTURE PHASES (Phase 4+)

- **Phase 4**: Advanced mapping (heatmaps, clustering optimization)
- **Phase 5**: Analytics & ML (voter segmentation, predictive modeling)
- **Phase 6**: User management & permissions
- **Phase 7**: Multi-language support
- **Phase 8**: Mobile app
- **Phase 9**: API marketplace & webhooks
- **Phase 10**: Extended data sources (voter registration, social media)
