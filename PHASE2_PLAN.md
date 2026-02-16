# Phase 2: Voter Management & Import (Weeks 3-4)

**Goal**: Voter database ingestion, search, and basic management

---

## 📋 PHASE 2A: VOTER DATA IMPORT (4-5 hours)

### Voter Import Endpoint
- [ ] `POST /api/v1/voters/import`
  - [ ] Accept CSV upload (email, phone, name, address, contact history)
  - [ ] Validate CSV format and required fields
  - [ ] Parse CSV and create batch job
  - [ ] Return job ID for progress tracking
  - [ ] Response: `{ jobId: string, status: "pending" }`

### CSV Parser Utility
- [ ] Create `lib/import/csvParser.ts`
  - [ ] Parse CSV headers
  - [ ] Validate required columns (email, phone, name)
  - [ ] Parse voter rows
  - [ ] Handle encoding issues
  - [ ] Return parsed voter objects
  - [ ] Tests

### Voter Import Job Handler
- [ ] Extend `lib/queue/runner.ts` to handle `import` job type
  - [ ] Create Voter records from parsed CSV
  - [ ] Track progress (X of Y voters created)
  - [ ] Handle duplicate emails (skip or update)
  - [ ] Log errors per voter
  - [ ] Update job progress as it processes
  - [ ] Mark complete when done

---

## 🔍 PHASE 2B: VOTER SEARCH & LISTING (3-4 hours)

### Voter List Endpoint
- [ ] `GET /api/v1/voters`
  - [ ] List all voters with pagination
  - [ ] Filter by email, phone, name (search)
  - [ ] Filter by contact status (never, attempted, contacted)
  - [ ] Sort by name, email, last contact date
  - [ ] Response: `{ voters: Voter[], total: number, page: number }`
  - [ ] Tests

### Voter Detail Endpoint
- [ ] `GET /api/v1/voters/:id`
  - [ ] Get single voter with full details
  - [ ] Include contact history
  - [ ] Response: `{ voter: Voter }`
  - [ ] Tests

### Voter Update Endpoint
- [ ] `PUT /api/v1/voters/:id`
  - [ ] Update voter name, email, phone, notes
  - [ ] Update contact status
  - [ ] Audit log changes
  - [ ] Response: `{ voter: Voter }`
  - [ ] Tests

---

## 🎨 PHASE 2C: VOTER MANAGEMENT PAGE (3-4 hours)

### Voters Page (`/voters`)
- [ ] Create `app/voters/page.tsx`
  - [ ] Display voter list in table format
  - [ ] Search bar (name, email, phone)
  - [ ] Filter dropdown (contact status)
  - [ ] Pagination controls
  - [ ] Import button → opens modal
  - [ ] Voter detail modal (click row)
  - [ ] Edit voter modal (button in detail)
  - [ ] Bulk actions (mark contacted, export, delete)

### Voter Import Modal
- [ ] Create `components/VoterImportModal.tsx`
  - [ ] CSV file drag-and-drop area
  - [ ] File preview before import
  - [ ] Start import button
  - [ ] Progress bar during import
  - [ ] Success message with voter count
  - [ ] Error messages for failed rows

### Voter Detail Modal
- [ ] Create `components/VoterDetailModal.tsx`
  - [ ] Display voter info (name, email, phone, address)
  - [ ] Show contact history (timeline)
  - [ ] Edit button → switches to edit mode
  - [ ] Add note button
  - [ ] Mark as contacted checkbox
  - [ ] Delete voter button

### Voter Search Component
- [ ] Create `components/VoterSearch.tsx`
  - [ ] Search input (debounced)
  - [ ] Filter dropdown
  - [ ] Sort dropdown
  - [ ] Clear filters button
  - [ ] Search results count

---

## 📞 PHASE 2D: CONTACT LOGGING (2-3 hours)

### Contact Log Endpoint
- [ ] `POST /api/v1/voters/:id/contact-log`
  - [ ] Log a contact attempt
  - [ ] Fields: contactType (call, email, door), notes, outcome
  - [ ] Update voter's lastContactDate and contactStatus
  - [ ] Audit log
  - [ ] Response: `{ contactLog: ContactLog }`
  - [ ] Tests

### Contact Log List
- [ ] `GET /api/v1/voters/:id/contact-logs`
  - [ ] Get all contact logs for voter
  - [ ] Pagination
  - [ ] Response: `{ logs: ContactLog[], total: number }`
  - [ ] Tests

---

## 🏪 PHASE 2E: BULK OPERATIONS (2-3 hours)

### Bulk Export Endpoint
- [ ] `POST /api/v1/voters/export`
  - [ ] Accept filters (status, campaign)
  - [ ] Create CSV export job
  - [ ] Return job ID
  - [ ] Response: `{ jobId: string }`

### Bulk Update Endpoint
- [ ] `PATCH /api/v1/voters/bulk`
  - [ ] Accept voter ID array and updates
  - [ ] Update multiple voters
  - [ ] Audit log all changes
  - [ ] Response: `{ updated: number }`

### Bulk Delete Endpoint
- [ ] `DELETE /api/v1/voters/bulk`
  - [ ] Accept voter ID array
  - [ ] Delete voters
  - [ ] Audit log deletions
  - [ ] Response: `{ deleted: number }`

---

## 🧪 PHASE 2F: TESTING (2-3 hours)

### Voter Import Tests
- [ ] `lib/import/csvParser.test.ts` — CSV parsing
- [ ] `app/api/v1/voters/import.test.ts` — Import endpoint

### Voter Endpoints Tests
- [ ] `app/api/v1/voters/list.test.ts` — List and search
- [ ] `app/api/v1/voters/[id].test.ts` — Detail, update
- [ ] `app/api/v1/voters/[id]/contact-logs.test.ts` — Contact logging

### Integration Tests
- [ ] Full import flow (upload → job → processing)
- [ ] Full search flow (import → search → detail)
- [ ] Contact logging flow

---

## 📊 DELIVERABLES AT END OF PHASE 2

### Pages Ready
- ✅ `/voters` — Voter list, search, import, management
- ✅ `/voters/[id]` — Voter detail page (optional)

### APIs Ready
- ✅ `POST /api/v1/voters/import`
- ✅ `GET /api/v1/voters`
- ✅ `GET /api/v1/voters/:id`
- ✅ `PUT /api/v1/voters/:id`
- ✅ `POST /api/v1/voters/:id/contact-log`
- ✅ `GET /api/v1/voters/:id/contact-logs`
- ✅ `POST /api/v1/voters/export`
- ✅ `PATCH /api/v1/voters/bulk`
- ✅ `DELETE /api/v1/voters/bulk`

### Database State
- Voter table populated with sample data
- ContactLog table with test contact history
- Import jobs completed successfully
- Audit log tracking all voter changes

---

## TIME ESTIMATE

- 🔌 Phase 2A (Import): **4-5 hours**
- 🔍 Phase 2B (Search): **3-4 hours**
- 🎨 Phase 2C (Voter page): **3-4 hours**
- 📞 Phase 2D (Contact log): **2-3 hours**
- 🏪 Phase 2E (Bulk ops): **2-3 hours**
- 🧪 Phase 2F (Testing): **2-3 hours**

**Total: ~18-24 hours (should fit in 2 weeks with other work)**

