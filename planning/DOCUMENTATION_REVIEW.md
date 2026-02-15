# Cocoa Canvas - Documentation Review & Recommendations

## Executive Summary

**Overall Assessment**: 80% consistent with 12 meaningful inconsistencies to address.

**Key Issues**:
1. Map feature timing contradicts (Phase 1 vs Phase 4)
2. Authentication complexity mismatch (Phase 1 vs full schema)
3. Job model naming/separation unclear
4. Survey/campaign features misaligned with phases
5. Organization/multi-tenancy scope unclear

**Effort to Fix**: 2-3 hours of edits to align all documents.

---

## Critical Inconsistencies

### 1. **MAP TIMING - CRITICAL CONFLICT** ⚠️

| Document | Says |
|----------|------|
| PROJECT_PLAN | "Core Goal: Interactive Map" in Phase 1-2 |
| MAP_DISPLAY_PLAN | "Phase 1: Enhance existing map-app" |
| PHASE_PLAN | "Phase 4 (MVP): Map is final feature" |

**Issue**: PROJECT_PLAN says map is a core Phase 1-2 feature, but PHASE_PLAN delays it to Phase 4 (MVP). You specifically requested Phase 4 was MVP.

**Recommendation**: 
- ❌ Rewrite PROJECT_PLAN to remove map from Phase 1-2  
- ✓ Clarify that PHASE_PLAN Phases 1-3 are data infrastructure, Phase 4 adds map + achieves MVP
- ✓ Update MAP_DISPLAY_PLAN "Phase 1" heading to "Phase 4 (MVP)"

---

### 2. **AUTHENTICATION FRAMEWORK - APPROACH MISMATCH**

| Document | Technology | Complexity |
|----------|------------|-----------|
| PROJECT_PLAN | "NextAuth or similar" | Medium (mentions OAuth) |
| AUTH_SECURITY_PLAN | "NextAuth.js v5" (detailed) | High (LDAP, MFA, OAuth) |
| PHASE_PLAN Phase 1 | "Local email/password auth" | Low (just bcrypt) |
| DATABASE_SCHEMA | Full User/Role/Permission/Session | High |

**Issue**: 
- AUTH_SECURITY_PLAN describes production-ready multi-auth system
- PHASE_PLAN shows minimal Phase 1 auth (just login/logout)
- DATABASE_SCHEMA has full User model (but PHASE_PLAN Phase 1 schema is simpler)

**Recommendation**:
- ✓ Keep AUTH_SECURITY_PLAN as the "full vision"
- ✓ PHASE_PLAN Phase 1 is correct (minimal auth)
- ⚠️ Add note to AUTH_SECURITY_PLAN: "Phase 1 starts with local auth, OAuth/MFA added in Phase 2+"
- ✓ Clarify DATABASE_SCHEMA.md that this is the "end-state schema," not Phase 1

---

### 3. **JOB MODEL NAMING INCONSISTENCY**

| Document | Model Names |
|----------|------------|
| PHASE_PLAN Phase 1 | `Job` (general queue) |
| PHASE_PLAN Phase 2 | `ImportJob` (voter imports) |
| DATABASE_SCHEMA | `Job` + `ImportJob` (separate) |
| API_PLAN | `/api/v1/imports/:jobId` |

**Issue**: 
- PHASE_PLAN Phase 1 has generic `Job` model for all job types
- PHASE_PLAN Phase 2 suddenly uses `ImportJob` instead
- DATABASE_SCHEMA has both (confusing)

**Recommendation**:
- Consolidate: Use single `ImportJob` from Phase 2 onwards
- Phase 1 `Job` can be renamed to `AsyncJob` or just simplified away (use ImportJob from start)
- Update DATABASE_SCHEMA to remove generic `Job`, keep `ImportJob` only
- Makes API clearer: `/api/v1/imports/:jobId` → single concept

**Proposed**: 
```prisma
// Phase 1 & beyond: Just ImportJob
model ImportJob {
  id        String @id @default(cuid())
  type      String // "voter_file", "geojson", "processed_data"
  status    String // "pending", "processing", "completed", "failed"
  // ... rest of fields
}
```

---

### 4. **VOTER MODEL FIELD PROGRESSION UNCLEAR**

| Document | Voter Fields | When? |
|----------|------------|-------|
| DATA_INGESTION_PLAN | 20+ fields (full model) | Phase 2? |
| PHASE_PLAN Phase 2 Schema | 15 fields (simpler) | Phase 2 |
| DATABASE_SCHEMA | 30+ fields (complete) | Full schema |

**Issue**: 
- Different docs show different field counts
- Unclear which fields are Phase 2 vs Phase 3 vs Phase 4

**Recommendation**:
- Document field progression by phase:
  - **Phase 2**: firstName, lastName, address, city, zip, partyAffiliation, status, voterId
  - **Phase 3**: Add latitude, longitude, geocoded, precinct, parcelId
  - **Phase 4**: Add householdId
- Create "Voter Model Evolution" section in PHASE_PLAN
- Keep DATABASE_SCHEMA as reference (end-state)

---

### 5. **RBAC TIMING UNCLEAR**

| Document | When RBAC? | Complexity |
|----------|-----------|-----------|
| PROJECT_PLAN | Not mentioned | - |
| AUTH_SECURITY_PLAN | Phase 1+ (5 roles: admin, manager, canvasser, viewer, auditor) | High |
| PHASE_PLAN Phase 1 | Just "admin account" | Low |
| DATABASE_SCHEMA | Full Role/Permission models | High |

**Issue**: 
- AUTH_SECURITY_PLAN suggests RBAC from the start
- PHASE_PLAN Phase 1 only has one admin
- Not clear when to introduce manager/canvasser/viewer roles

**Recommendation**:
- **Phase 1**: Single admin user (no RBAC needed yet)
- **Phase 2**: Add canvassers + manager role when imports happen
- **Phase 3+**: Add viewer/auditor roles for data analysis
- Update AUTH_SECURITY_PLAN with phase timeline
- Update DATABASE_SCHEMA: RBAC models optional until Phase 2

---

### 6. **CAMPAIGN & SURVEY FEATURES TIMING**

| Document | Campaign Info | Survey Template? |
|----------|--------------|-----------------|
| PHASE_PLAN Phase 1 | Setup wizard creates campaign | Mentions "survey template selection" |
| PHASE_PLAN Phase 2 | Voter import phase | No survey work mentioned |
| PHASE_PLAN Phase 4 | Mentions canvassing responses | Implies surveys exist |
| DATABASE_SCHEMA | CampaignSurvey, SurveyQuestion models | Full survey system |
| API_PLAN | Campaign API + survey endpoints | Assumes surveys exist |

**Issue**: 
- PHASE_PLAN Phase 1 mentions "survey template selection" but surveys aren't built
- No clear phase for when surveys are implemented
- DATABASE_SCHEMA shows survey system but PHASE_PLAN doesn't indicate when it's built

**Recommendation**:
- **Phase 1**: Create campaign with basic info (name, dates, area), NO surveys yet
- **Phase 2**: Add survey template selection + basic survey creation
- **Phase 4 (MVP)**: Canvassing with survey responses
- Remove "survey template selection" from PHASE_PLAN Phase 1 wizard
- Add survey creation to PHASE_PLAN Phase 2 or add Phase 2.5

---

### 7. **ORGANIZATION MODEL - SCOPE UNCLEAR**

| Document | Organization Model | When? |
|----------|------------------|-------|
| DATABASE_SCHEMA | Yes (for multi-tenancy) | Not specified |
| PHASE_PLAN Phase 1 | Yes (admin creates org in setup wizard) | Phase 1 |
| AUTH_SECURITY_PLAN | Mentions organizationId for future multi-tenancy | Not MVP |
| PROJECT_PLAN | "Built by and for the Cocoa County community" | Single org implied |

**Issue**: 
- Is this a multi-tenant SaaS (multiple orgs) or single-tenant (Cocoa County only)?
- PHASE_PLAN Phase 1 creates Organization but not used elsewhere
- AUTH_SECURITY_PLAN treats multi-tenancy as "future"

**Recommendation**:
- **For MVP (Phase 4)**: Single tenant (Cocoa County), remove Organization model
- **Future (Phase 5+)**: Add multi-tenancy with Organization model
- Simplify PHASE_PLAN Phase 1 setup wizard: just admin email/password, skip organization name
- Update DATABASE_SCHEMA to note Organization is optional/future

---

### 8. **TEAM MODEL - PURPOSE UNCLEAR**

| Document | Team Model | Used For? |
|----------|-----------|-----------|
| DATABASE_SCHEMA | Yes (Team with teamLead + members) | Organizing canvassers |
| PHASE_PLAN | Not mentioned in any phase | - |
| AUTH_SECURITY_PLAN | Not mentioned | - |
| API_PLAN | Not mentioned | - |

**Issue**: 
- Team model exists in schema but not planned in phases
- Not clear if teams are Phase 1, 2, or later

**Recommendation**:
- Either: Add Team management to PHASE_PLAN (suggest Phase 2)
- Or: Remove from DATABASE_SCHEMA for MVP (Phase 4), add in Phase 5
- For MVP: Simple 1:1 canvasser→voter assignment, no team concept
- Update all docs to clarify scope

---

### 9. **IMPORT MODEL SEPARATION CONFUSION**

Looking at PHASE_PLAN and DATABASE_SCHEMA, there are two different approaches to tracking imports:

**PHASE_PLAN Phase 1**: Generic `Job` model for all async work
```prisma
model Job {
  type  String // "import_voters", "geocode", etc.
}
```

**PHASE_PLAN Phase 2 onwards**: Specific `ImportJob` model
```prisma
model ImportJob {
  dataType String // "voter_file", "geojson"
}
```

**Recommendation**:
- Use `ImportJob` from Phase 1 for consistency
- Later phases add `GeocodingJob` if needed, not generic `Job`
- Single concept: all jobs are typed imports/operations

---

### 10. **API ENDPOINTS PHASE ALIGNMENT**

| API Endpoints | Phase Mentioned | Actually Implemented? |
|---------------|-----------------|----------------------|
| /auth/* | - | Phase 1 ✓ |
| /voters (GET, search) | Phase 2 | Phase 2 ✓ |
| /voters/:id/export | Phase 2 | Phase 2 ✓ |
| /campaigns/* | Phase 1? Phase 2? | Unclear |
| /assignments/* | Phase 4+ | Phase 4 ✓ |
| /map/voters | Phase 4 | Phase 4 ✓ |
| /imports/* | Phase 2 | Phase 2 ✓ |
| /geocoding/* | Phase 3 | Phase 3 ✓ |
| /admin/* | Not specified | Phase 3+ |

**Issue**: 
- API_PLAN doesn't indicate which endpoints are Phase 1, 2, 3, 4
- Campaign endpoints unclear (are they Phase 1 setup or Phase 2+?)

**Recommendation**:
- Add phase annotations to API_PLAN for each endpoint group
- Clear path: Phase 1 needs only /auth/*, Phase 2 adds /voters + /imports, etc.

---

### 11. **SETUP WIZARD SCOPE**

| Document | Phase 1 Setup Wizard Does | Reality |
|----------|--------------------------|---------|
| PHASE_PLAN | Create admin, org name, campaign, survey template | Too much for Phase 1 |
| DATABASE_SCHEMA | - | Campaign model exists in Phase 1 |
| API_PLAN | POST /setup/campaign | Implies campaign setup exists |

**Issue**: 
- "Survey template selection" in Phase 1 wizard but surveys don't exist yet
- Wizard should be minimal for Phase 1

**Recommendation**:
- **Phase 1 wizard flow** (SIMPLIFY):
  1. Create admin account (email, password, name)
  2. Enter campaign name + dates
  3. Done → ready for Phase 2 import
  
- Remove survey template selection from Phase 1
- Remove organization name (default to "Cocoa County")

---

### 12. **DATE/TIMELINE CONFLICTS**

| Document | Timeline |
|----------|----------|
| PHASE_PLAN | 8 weeks total (2 weeks per phase) |
| PROJECT_PLAN | "3-8 weeks" (Phase 1-3) |
| MAP_DISPLAY_PLAN | "3 phases of UI work" (unspecified timing) |

**Issue**: Slightly different timelines, but generally aligned. Minor inconsistency.

**Recommendation**: 
- Standardize on PHASE_PLAN: 8 weeks (2 weeks per phase)
- Update PROJECT_PLAN "3-8 weeks" → "8 weeks (2 weeks per phase)"

---

## Minor Inconsistencies (Can Be Tolerated)

### 1. Terminology Variance
- "canvassing" vs "survey" usage interchangeable in some docs
- "voter file" vs "voter data file" 
- "precinct" vs "district" (should clarify difference)

**Effect**: Low - clear from context

### 2. Voter ID Field Naming
- DATA_INGESTION_PLAN: `voterId` 
- DATABASE_SCHEMA: `voterId`
- API_PLAN: `voter_id` (in JSON)

**Effect**: Low - standard JSON snake_case vs DB camelCase

### 3. Optional Fields Inconsistency
- Some docs show `phone` as optional
- Some as required
- Reality: Should be optional (Phase 2)

**Effect**: Medium - affects import validation

---

## Recommendations Summary

### Priority 1: CRITICAL (Must Fix Before Phase 1 Start)

1. **Map timing**: Clarify that map is Phase 4 (MVP), not Phase 1-2
   - Hours: 0.5h
   - Impact: Clarity on scope

2. **Job model consolidation**: Use `ImportJob` consistently from Phase 1
   - Hours: 1h
   - Impact: Simpler code, clearer concepts

3. **Setup wizard simplification**: Remove surveys from Phase 1 wizard
   - Hours: 0.5h
   - Impact: Phase 1 scope clear

4. **Database schema stratification**: Mark which tables are Phase 1 vs 2 vs 3 vs 4
   - Hours: 1h
   - Impact: Clear implementation path

### Priority 2: IMPORTANT (Before Phase 2 Start)

5. **Voter model evolution**: Document field additions by phase
   - Hours: 1h
   - Impact: Clear what goes where

6. **RBAC timing**: Clarify when roles are introduced
   - Hours: 0.5h
   - Impact: Auth implementation path

7. **Campaign/Survey timing**: When is survey creation built?
   - Hours: 0.5h
   - Impact: Phase 2 scope

8. **API phase annotations**: Mark endpoints by phase
   - Hours: 1h
   - Impact: Clear API implementation order

### Priority 3: NICE-TO-HAVE (Before Phase 3 Start)

9. **Organization model decision**: Single-tenant or multi-tenant?
   - Hours: 0.5h
   - Impact: Schema clarity

10. **Team model decision**: Include or defer?
    - Hours: 0.5h
    - Impact: Schema clarity

11. **Minor terminology cleanup**: Standardize terms
    - Hours: 1h
    - Impact: Document consistency

---

## Specific File Changes Recommended

### PROJECT_PLAN.md
- [ ] Remove "Interactive Map (Phase 1-2)" from goals
- [ ] Clarify map is Phase 4 (MVP)
- [ ] Update timeline from "3-8 weeks" to "8 weeks"

### AUTH_SECURITY_PLAN.md
- [ ] Add section: "Implementation Timeline by Phase"
  - Phase 1: Local auth only
  - Phase 2: Add OAuth (optional)
  - Phase 3: Add MFA (optional)
  - Phase 5+: LDAP

### PHASE_PLAN.md (Most Changes)
- [ ] Phase 1: Remove "survey template selection" from setup wizard
- [ ] Phase 1: Remove `Organization` model (simplify to single-tenant)
- [ ] Phase 1: Consolidate `Job` → use `ImportJob` only
- [ ] Phase 2: Add "Survey Creation" as new feature section
- [ ] Add "Voter Model Evolution" showing field additions per phase
- [ ] Clarify RBAC timeline (Phase 1: admin only, Phase 2: add roles)
- [ ] Add "Schema Stratification" showing which tables per phase

### DATABASE_SCHEMA.md
- [ ] Add comment above each model: "Available in Phase X"
- [ ] Remove Organization model (or mark as Phase 5+)
- [ ] Remove Team model (or mark as Phase 5+)
- [ ] Consolidate Job models (remove generic Job, keep ImportJob)
- [ ] Add note: "This is end-state schema. See PHASE_PLAN for incremental phases."

### API_PLAN.md
- [ ] Add phase markers to each endpoint section
  - Example: "### POST /auth/login (Phase 1)"
  - Example: "### GET /voters (Phase 2)"
- [ ] Add summary table: "API Endpoints by Phase"

### MAP_DISPLAY_PLAN.md
- [ ] Change "Phase 1" section header to "Phase 4 (MVP)"
- [ ] Add note: "Map is final MVP feature, built after voter data infrastructure in Phases 1-3"

### DATA_INGESTION_PLAN.md
- [ ] Add note: "Detailed design for all import types. Phase 2 starts with voter files only."
- [ ] Clarify: "Phase 3 adds GeoJSON, Phase 2 is voter files"

---

## Questions for Clarification

Before implementing, confirm these decisions:

1. **Single-tenant or Multi-tenant?**
   - Recommendation: Single (Cocoa County) for MVP, multi-tenant Phase 5+
   - Affects: Organization model, setup wizard, database structure

2. **Teams in MVP?**
   - Recommendation: No teams, just canvasser→voter assignment for Phase 4, add teams Phase 5+
   - Affects: DATABASE_SCHEMA, Phase 1 features

3. **Surveys in Phase 1 or 2?**
   - Recommendation: Phase 2 (simplified) + Phase 4 (full with responses)
   - Affects: Setup wizard, campaign features

4. **RBAC complexity?**
   - Recommendation: Phase 1 = admin only, Phase 2+ add roles
   - Affects: Auth implementation, API protection

5. **Job model name?**
   - Recommendation: Always "ImportJob" (not generic "Job")
   - Affects: DATABASE_SCHEMA, API_PLAN, PHASE_PLAN

---

## Consolidated Recommendations

### Go With These 5 Changes:

1. **Consolidate Job model**: Use `ImportJob` from Phase 1
2. **Simplify Phase 1 setup wizard**: Remove surveys, organizations
3. **Move map to Phase 4**: Update PROJECT_PLAN
4. **Add phase annotations everywhere**: Mark all features/models/endpoints by phase
5. **Single-tenant for MVP**: Remove multi-org support from Phase 1-4

### Updated Scope:

| Phase | Duration | DB Tables | MVP? |
|-------|----------|-----------|------|
| 1 | 2 weeks | 7 (User, Session, Campaign, ImportJob, AuditLog) | No |
| 2 | 2 weeks | +3 (Voter, VoterNote, ImportJob tracking) | No |
| 3 | 2 weeks | +2 (GeoJsonFeature, GeocodingJob) | No |
| 4 (MVP) | 2 weeks | +1 (Household) | **Yes** |

---

## Conclusion

The planning documents are **75-80% consistent** with clear strategic direction. The inconsistencies are reconcilable with targeted edits to:

1. Clarify feature timing (especially map)
2. Simplify Phase 1 scope
3. Add phase annotations throughout
4. Consolidate job model naming
5. Decide on single vs multi-tenant

**Recommended fix time**: 2-3 hours of edits
**Recommended timing**: Do before starting Phase 1 implementation

Once these are addressed, all documents will be tightly aligned and ready for execution.
