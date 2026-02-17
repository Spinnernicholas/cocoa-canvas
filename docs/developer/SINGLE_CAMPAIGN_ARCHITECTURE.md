# Single Campaign Per Deployment Architecture

**Effective Date**: February 16, 2026  
**Migration**: `20260216072927_simplify_to_single_campaign`

---

## Overview

Cocoa Canvas operates on a **single-campaign-per-deployment** model:

- **One political race per instance** - Each deployment manages exactly ONE political campaign (e.g., "Mayor 2026 Election", "State Senate District 15")
- **Multiple races = Multiple deployments** - Organizations running multiple races deploy multiple instances of the app, each with its own database
- **Simplified architecture** - No multi-campaign UI/API complexity, no campaign selection/switching
- **Easier scaling** - Each instance is independent and can be deployed, updated, and scaled separately

---

## Data Model

### Campaign Table (Singular)

The `Campaign` table stores metadata about the ONE political race this deployment manages:

```typescript
Campaign {
  id: String (PK)
  name: String              // e.g., "Jane Smith for Mayor - San Francisco 2026"
  description?: String
  startDate: DateTime       // Campaign launch date
  endDate: DateTime         // Election day or campaign end
  status: String            // planning, active, paused, completed
  targetArea?: String       // Jurisdiction (e.g., "San Francisco County")
  color: String             // Brand color (default: #6B4423 cocoa)
  logoUrl?: String          // Campaign logo/branding
  createdAt, updatedAt: DateTime
}
```

**Key Design**:
- **Only ONE record** exists per deployment (enforced at app level, not DB level)
- Voters are implicitly assigned to this campaign
- No campaign selection/switching in the UI
- No CampaignVoter junction table (all voters = THE campaign)

### Voter Table (Simplified)

The `Voter` table no longer has campaign references:

```typescript
Voter {
  id: String (PK)
  name: String
  email?: String (unique)
  phone?: String (unique)
  address?: String
  notes?: String
  
  // All voters belong to THE campaign (no campaign_id field)
  contactStatus: String     // pending, attempted, contacted, refused, unreachable, moved
  lastContactDate?: DateTime
  lastContactMethod?: String
  
  contactLogs: ContactLog[]
  
  importedFrom?: String     // Source tracking
  registrationDate?: DateTime
  votingPreference?: String // Future use
  
  createdAt, updatedAt: DateTime
}
```

### ContactLog Table (Unchanged)

```typescript
ContactLog {
  id: String (PK)
  voterId: String (FK)
  contactType: String       // call, email, door, sms
  outcome?: String          // contacted, refused, not_home, no_answer, moved, invalid
  notes?: String
  followUpNeeded: Boolean
  followUpDate?: DateTime
  createdAt, updatedAt: DateTime
}
```

---

## Removed Models

### CampaignVoter Junction Table ❌ REMOVED

**Why**: With only one campaign per deployment, explicit campaign-voter relationships are unnecessary. All voters implicitly belong to THE campaign.

**Old Code**:
```typescript
// BEFORE (multi-campaign model)
const voters = await prisma.campaignVoter.findMany({
  where: { campaignId: selectedCampaignId },
});
```

**New Code**:
```typescript
// AFTER (single-campaign model)
const voters = await prisma.voter.findMany();
```

---

## API Endpoints

### Voter Management (No campaign selection)

All voter endpoints implicitly work with THE campaign (no `campaignId` parameter):

```
GET    /api/v1/voters              // List all voters for THE campaign
POST   /api/v1/voters              // Create voter for THE campaign
GET    /api/v1/voters/[id]         // Get voter details
PUT    /api/v1/voters/[id]         // Update voter
DELETE /api/v1/voters/[id]         // Remove voter
POST   /api/v1/voters/import      // Bulk import for THE campaign
POST   /api/v1/voters/[id]/contact-log
GET    /api/v1/voters/[id]/contact-log
```

**No campaign endpoints needed**:
- ❌ `GET /api/v1/campaigns` - Single campaign, no list needed
- ❌ `POST /api/v1/campaigns` - Campaign created during setup/config
- ❌ `PUT /api/v1/campaigns/[id]` - Campaign config via admin panel or env vars

### Campaign Configuration

Campaign info accessed via:
1. **Admin Setup**: Initial campaign created during first-run setup
2. **Settings API**: Campaign metadata stored/retrieved via settings
3. **Environment Variables**: Campaign name, dates, area can be set via env vars

---

## User Interface

### No Campaign Navigation

**Removed**:
- ❌ Campaign selector dropdown
- ❌ Campaign switcher menu
- ❌ Campaign list page
- ❌ Campaign creation workflow

**Simplified**:
- Dashboard shows THE campaign banner (name, status, dates)
- All pages automatically work within THE campaign context
- No "Which campaign?" questions in the UI

### Pages

```
/setup              - Initial setup (create THE campaign)
/login              - User login
/dashboard          - THE campaign overview
/voters             - Voter list for THE campaign
/voters/[id]        - Individual voter details
```

---

## Configuration

### Campaign Setup Options

#### Option 1: Environment Variables (Simple)
```bash
CAMPAIGN_NAME="Jane Smith for Mayor - San Francisco 2026"
CAMPAIGN_START_DATE="2025-01-01"
CAMPAIGN_END_DATE="2026-11-03"
CAMPAIGN_TARGET_AREA="San Francisco County"
CAMPAIGN_COLOR="#8B5A3C"
```

#### Option 2: Admin Panel (Phase 3)
- Setup wizard during initial deployment
- Campaign details configurable via `/admin/campaign` page
- Campaign info stored in `Campaign` table

#### Option 3: Database Seed (Testing)
```typescript
await prisma.campaign.create({
  data: {
    name: "Test Campaign",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2026-11-03"),
    targetArea: "Test County",
    status: "planning",
  }
});
```

---

## Multi-Deployment Use Cases

### Scenario 1: City With Multiple Races

An organization running campaigns for Mayor, City Council (3 races), and Measure "A":

```
┌─────────────────────────────────────────┐
│ Cocoa Canvas Instance 1                 │
│ Campaign: "Jane Smith for Mayor 2026"   │
│ Database: cocoa-db-1                    │
│ URL: mayor.campaign.org                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Cocoa Canvas Instance 2                 │
│ Campaign: "City Council District 1"     │
│ Database: cocoa-db-2                    │
│ URL: district1.campaign.org             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Cocoa Canvas Instance 3                 │
│ Campaign: "Measure A - Transit Funding" │
│ Database: cocoa-db-3                    │
│ URL: measure-a.campaign.org             │
└─────────────────────────────────────────┘
```

### Scenario 2: Statewide Campaign Network

State campaign with county-level operations:

```
State HQ Instance: state.campaign.org
├─ Campaign: "Governor 2026 Statewide"
├─ Campaign DB, voter file, contact logs
├─ Central coordination, reporting

County 1 Instance: county1.campaign.org
├─ Campaign: "Governor 2026 - County 1"
├─ Independent deployment
├─ Local team, local voter data
├─ Reports rollup to state

County 2 Instance: county2.campaign.org
├─ Campaign: "Governor 2026 - County 2"
├─ Independent deployment
```

---

## Database Migrations

### Migration: `20260216072927_simplify_to_single_campaign`

**Changes**:
1. ✅ Updated Campaign model (added color, logo fields for branding)
2. ✅ Removed campaignId foreign key from Voter table
3. ✅ Deleted CampaignVoter junction table and all references
4. ✅ Simplified ContactLog indexes

**Backwards Compatibility**: ❌ Breaking change
- Existing multi-campaign deployments would need custom migration script
- New deployments use simplified schema from day one

**Data Loss**: 
- CampaignVoter mapping deleted (voters preserved, just campaign assignments removed)
- Voters will no longer have explicit campaign IDs
- Since all voters implicitly belong to THE campaign, no functional data loss

---

## Benefits of Single-Campaign Model

| Aspect | Multi-Campaign | Single-Campaign |
|--------|---|---|
| **UI Complexity** | Campaign selector, filter, switch | N/A, implicit context |
| **Database Queries** | `WHERE campaignId = X` required | No campaign filter needed |
| **API Endpoints** | /campaigns, /campaigns/[id], etc | No campaign endpoints |
| **Configuration** | Campaign management UI | Setup wizard or env vars |
| **Deployment** | One app instance per org | One instance per race |
| **Scaling** | Shared infrastructure risk | Independent scaling |
| **Code Maintenance** | More complex RBAC/permissions | Simpler permission model |
| **Dashboard** | Campaign switcher needed | Direct to campaign overview |

---

## Implementation Timeline

### ✅ Complete (Done)
- Database schema simplified
- CampaignVoter table removed
- Voter table cleaned up
- Migration created and applied
- Voter API endpoints updated
- Tests updated and passing

### 🔄 Phase 3 (Coming)
- Campaign setup/configuration UI
- Campaign metadata displayed on dashboard
- Environment variable support for campaign config
- Admin panel for campaign editing
- Deployment documentation

### 📋 Future Enhancements
- Multi-instance coordination (reporting, data sync)
- Campaign branding/theming customization
- Advanced analytics across campaigns
- Voter file management tools

---

## Deployment Checklist

When deploying a new instance for a new campaign:

- [ ] Configure environment variables with campaign details
- [ ] Initialize database with migration
- [ ] Create initial user account via setup wizard
- [ ] Set campaign name, dates, target area
- [ ] Configure campaign branding (color, logo)
- [ ] Import voter file (CSV)
- [ ] Configure team members and permissions
- [ ] Set up deployment URL and DNS
- [ ] Test voter import and contact logging
- [ ] Configure email/SMS integration (Phase 3)
- [ ] Go live!

---

## Questions & Troubleshooting

### Q: Can I run multiple campaigns in one database?
**A**: Not with this model. One instance = one campaign = one database. For multiple campaigns, deploy multiple instances.

### Q: What if we expand to a second race mid-deployment?
**A**: Deploy a new instance with its own database for the second race. Both instances remain independent.

### Q: How do we coordinate across multiple campaign instances?
**A**: Phase 3 will include reporting dashboards and optional data sync features.

### Q: Can we change the campaign details after launch?
**A**: Yes! Campaign settings can be updated via admin panel (endDate, status, targeting area, etc). The political race itself doesn't change—just the metadata.

---

## References

- [PHASE2_COMPLETE.md](../planning/PHASE2_COMPLETE.md) - Voter management system
- [Database Schema](../prisma/schema.prisma) - Full Prisma schema
- [Setup Documentation](../admin/AUTO_SETUP.md) - Initial deployment
