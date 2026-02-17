# Schema Migration Plan: Current → New Design

**Date**: February 16, 2026  
**Purpose**: Update Prisma schema to support Person-centric, multi-import architecture

---

## Executive Summary

### Current Design (schema.prisma)
- **Voter-centric**: All personal data directly on Voter model
- **No person separation**: Can't support non-voters (volunteers, staff)
- **No deduplication**: No external ID tracking across imports
- **No lookup tables**: Party, Precinct, Election inline with Voter data
- **No address grouping**: Can't query whole households together

### New Design (VOTER_FILE_ARCHITECTURE.md)
- **Person-centric**: Person = core identity, Voter = voting profile (1:0 or 1:1)
- **Multi-role support**: Person can be voter, volunteer, staff, contact
- **External ID tracking**: externalId + externalSource for deduplication
- **Normalized lookups**: Party, Precinct, Election, Location as seed tables
- **Address grouping**: Household + Building for canvassing strategies

---

## Model-by-Model Comparison

### 1. PERSON (NEW)
**Status**: ✅ NEW MODEL
**Purpose**: Core human identity, independent of voter registration

```prisma
model Person {
  id              String    @id @default(cuid())
  
  // Name components
  title           String?
  firstName       String
  middleName      String?
  lastName        String
  nameSuffix      String?
  
  // Demographics
  gender          String?
  birthDate       DateTime?
  birthPlace      String?
  language        String?
  
  // Household grouping
  householdId     String?
  household       Household? @relation(fields: [householdId], references: [id])
  
  // Notes
  notes           String?
  
  // Relations
  voter           Voter?
  contactInfo     ContactInfo[]
  contactLogs     ContactLog[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([firstName, lastName])
  @@index([householdId])
}
```

**Migration Strategy**:
- Create new PERSON table
- Migrate data from VOTER → PERSON (firstName, lastName, etc.)
- Keep voter data on VOTER table, add personId FK

---

### 2. VOTER (MAJOR CHANGES)
**Status**: 🔄 UPDATE EXISTING

**Current Fields**:
```prisma
registrationNumber String? @unique
voterFileId        String?
title              String?
firstName          String
middleName         String?
lastName           String
nameSuffix         String?
gender             String?
birthDate          DateTime?
birthPlace         String?
language           String?
registrationDate   DateTime?
partyName          String?
partyAbbr          String?
vbmStatus          String?
precinctId         String?
precinctPortion    String?
precinctName       String?
contactStatus      String    @default("pending")
lastContactDate    DateTime?
lastContactMethod  String?
importedFrom       String?
importType         String?
importFormat       String?
notes              String?
```

**New Fields**:
```prisma
personId           String    @unique              // NEW: FK to Person
person             Person    @relation(...)       // NEW: Relation
externalId         String?                        // NEW: VoterID or RegistrationNumber
externalSource     String?                        // NEW: "contra_costa", "simple_csv"
registrationNumber String?   (keep, may differ)   // Keep for backward compat
partyId            String?                        // NEW: FK to Party instead of string
party              Party?    @relation(...)       // NEW: Relation
precinctId         String?   (keep FK)            // Keep, but ensure it's FK to Precinct
precinct           Precinct? @relation(...)       // NEW: Explicit relation
importFile         String?                        // NEW: SHA hash
```

**Removed Fields** (moved to Person):
- title, firstName, middleName, lastName, nameSuffix
- gender, birthDate, birthPlace, language
- notes (moved to Person.notes)

**Unique Constraints**:
```prisma
@@unique([externalId, externalSource])  // NEW: Deduplication key
@@unique([personId])                     // Existing: 1:1 with Person
```

**Migration Steps**:
1. Create Person records from Voter data (name, gender, birthDate, etc.)
2. Add personId, externalId, externalSource columns to Voter
3. Populate externalId, externalSource based on importedFrom
4. Migrate partyAbbr → partyId (create Party lookup entries)
5. Migrate precinctName → precinctId (create Precinct lookup entries)
6. Drop old unique constraints, add new ones
7. Drop old personal/demographic fields from Voter

---

### 3. PARTY (NEW)
**Status**: ✅ NEW MODEL
**Purpose**: Normalized political party data

```prisma
model Party {
  id              String   @id @default(cuid())
  
  name            String   @unique  // "Democratic", "Republican", etc.
  abbr            String   @unique  // "DEM", "REP", "AIP", "G", "L", "N", "U"
  description     String?
  color           String?  // Hex color for UI
  
  voters          Voter[]
  voteHistory     VoteHistory[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([abbr])
}
```

**Migration**:
1. Extract unique parties from Voter.partyAbbr
2. Create Party records with standard abbreviations
3. Map Voter.partyAbbr → Voter.partyId
4. Same for VoteHistory.ballotPartyAbbr → VoteHistory.ballotPartyId

---

### 4. PRECINCT (NEW)
**Status**: ✅ NEW MODEL
**Purpose**: Normalized voting precinct data

```prisma
model Precinct {
  id              String   @id @default(cuid())
  
  number          String   @unique  // "0001", "DANV119", etc.
  name            String?
  description     String?
  pollingPlace    String?
  
  voters          Voter[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([number])
}
```

**Migration**:
1. Extract unique precinctId values from Voter
2. Create Precinct records with id = precinctId (or map if needed)
3. Voter.precinctId already correct (just change FK reference)
4. Drop Voter.precinctName

---

### 5. ELECTION (NEW)
**Status**: ✅ NEW MODEL
**Purpose**: Shared election metadata

```prisma
model Election {
  id              String   @id @default(cuid())
  
  electionDate    DateTime @unique
  electionAbbr    String?  @unique
  electionDesc    String?
  electionType    String?
  jurisdictionCode String?
  
  voteHistory     VoteHistory[]
  
  createdAt       DateTime @default(now())
  
  @@index([electionDate])
}
```

**Migration**:
1. Extract unique election dates from VoteHistory
2. Create Election records from unique (electionDate, electionAbbr, electionDesc, electionType)
3. Add electionId FK to VoteHistory
4. Keep fallback fields (electionDate, electionAbbr, etc.) in VoteHistory for backward compat

---

### 6. LOCATION (UPDATE)
**Status**: 🔄 UPDATE EXISTING

**Current Fields**:
```prisma
name        String @unique
description String?
```

**New Fields**:
```prisma
category    String?  // "phone", "email", "address", "digital"
isActive    Boolean @default(true)
```

**Default Data**:
```prisma
{ name: "Home", category: "phone" }
{ name: "Work", category: "phone" }
{ name: "Cell", category: "phone" }
{ name: "Other Phone", category: "phone" }
{ name: "Home Email", category: "email" }
{ name: "Work Email", category: "email" }
{ name: "Personal Email", category: "email" }
{ name: "Residence", category: "address" }
{ name: "Mailing Address", category: "address" }
{ name: "Work Address", category: "address" }
```

**Migration**:
1. Add category column with null default
2. Run seed script to populate category for existing locations
3. Add isActive column (default true)
4. Data: Insert seed locations if not present

---

### 7. BUILDING (NEW)
**Status**: ✅ NEW MODEL
**Purpose**: Multi-unit apartment buildings

```prisma
model Building {
  id              String   @id @default(cuid())
  
  streetNumber    String
  preDirection    String?
  streetName      String
  streetSuffix    String?
  postDirection   String?
  city            String
  state           String   @default("CA")
  zipCode         String
  fullAddress     String   @unique
  
  buildingType    String?  // "apartment", "condo", "townhouse"
  totalUnits      Int?
  
  latitude        Float?
  longitude       Float?
  geocoded        Boolean  @default(false)
  
  households      Household[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([fullAddress])
  @@index([zipCode])
}
```

**Migration**:
- Create new BUILDING table
- No existing data to migrate (new feature)
- Will be populated on next voter import

---

### 8. HOUSEHOLD (NEW)
**Status**: ✅ NEW MODEL
**Purpose**: Address grouping for canvassing

```prisma
model Household {
  id              String   @id @default(cuid())
  
  buildingId      String?
  building        Building? @relation(fields: [buildingId], references: [id])
  
  houseNumber     String?
  preDirection    String?
  streetName      String
  streetSuffix    String?
  postDirection   String?
  unitAbbr        String?
  unitNumber      String?
  city            String
  state           String   @default("CA")
  zipCode         String
  fullAddress     String   @unique
  
  personCount     Int      @default(1)
  maxVotingScore  Int?
  
  latitude        Float?
  longitude       Float?
  geocoded        Boolean  @default(false)
  geocodedAt      DateTime?
  
  people          Person[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([houseNumber, streetName, zipCode])
  @@index([buildingId])
  @@index([fullAddress])
  @@index([zipCode])
}
```

**Migration**:
- Create new HOUSEHOLD table
- No existing data to migrate (new feature)
- Will be populated on next voter import

---

### 9. CONTACT_INFO (MAJOR CHANGES)
**Status**: 🔄 UPDATE EXISTING

**Current Fields**:
```prisma
voterId     String              // FK to Voter
voter       Voter   @relation   // Explicit relation
locationId  String              // FK to Location
location    Location @relation  // Explicit relation
phone       String?
email       String?
houseNumber String?
preDirection String?
streetName  String?
streetSuffix String?
postDirection String?
unitAbbr    String?
unitNumber  String?
city        String?
state       String?
zipCode     String?
fullAddress String?
isVerified  Boolean @default(false)
isPrimary   Boolean @default(false)
```

**New Fields**:
```prisma
personId    String              // NEW: FK to Person
person      Person @relation    // NEW: Explicit relation
isCurrently Boolean @default(true)  // NEW: Still valid?
source      String?             // NEW: "county_file", "csv_import", "enrichment"
verifiedAt  DateTime?           // NEW: When verified
violationCount Int @default(0)  // NEW: TCPA violations
```

**Removed Fields**:
- voterId (replaced by personId)

**Index Changes**:
- Change @@unique from [personId, locationId, fullAddress] (was voterId)
- Add @@index([isCurrently])
- Remove old voter-based indexes

**Migration Steps**:
1. Add personId, person relation (initially null)
2. Add isCurrently, source, verifiedAt, violationCount columns
3. Populate personId from Voter.personId (based on voterId)
4. Populate source = "county_file" (default)
5. Populate isCurrently = true (default)
6. Drop voterId and voter relation
7. Add unique constraint [personId, locationId]

---

### 10. VOTE_HISTORY (MAJOR CHANGES)
**Status**: 🔄 UPDATE EXISTING

**Current Fields**:
```prisma
voterId         String
voter           Voter @relation
electionAbbr    String?
electionDesc    String?
electionDate    DateTime?
electionType    String?
ballotPartyName String?
ballotPartyAbbr String?
ballotCounted   Boolean @default(false)
votingMethod    String?
districtId      String?
subDistrict     String?
districtName    String?
```

**New Fields**:
```prisma
electionId      String?              // NEW: FK to Election
election        Election? @relation  // NEW: Explicit relation
participated    Boolean              // RENAMED from ballotCounted
ballotParty     String?              // RENAMED from ballotPartyAbbr
ballotPartyName String?              // Keep as is
districtName    String?              // Keep as is
```

**Removed Fields**:
- subDistrict (merged into districtName/districtId context)

**Migration Steps**:
1. Add electionId column
2. Populate electionId from (electionDate, electionAbbr) lookup to Election
3. Rename ballotCounted → participated (update data: 1→true, 0→false)
4. Rename ballotPartyAbbr → ballotParty
5. Keep electionDate, electionAbbr, electionDesc, electionType as fallback
6. Drop subDistrict
7. Update indexes

---

### 11. CONTACT_LOG (MINOR CHANGES)
**Status**: 🔄 UPDATE EXISTING

**Current Fields**:
```prisma
voterId         String
voter           Voter @relation
contactType     String    // call, email, door, sms
outcome         String?
notes           String?
followUpNeeded  Boolean @default(false)
followUpDate    DateTime?
```

**New Fields**:
```prisma
personId        String              // NEW: FK to Person
person          Person @relation    // NEW: Explicit relation
method          String              // RENAMED from contactType
```

**Removed Fields**:
- voterId (replaced by personId)

**Value Changes**:
- contactType → method enum: "call", "email", "door_knock", "sms", "mail", etc.
- outcome enum: "reached", "refused", "not_home", "no_answer", "moved", "invalid", "pending"
- followUpNeeding stays as is

**Migration Steps**:
1. Add personId, person relation (initially null)
2. Populate personId from Voter.personId (based on voterId)
3. Rename contactType → method
4. Update method values: "door" → "door_knock" (if needed)
5. Update outcome values for clarity
6. Drop voterId and voter relation
7. Update indexes to use personId

---

## Migration Sequencing (Critical Order)

**Phase 1: Create Lookup Tables** (no data issues)
1. ✅ Create Party table + seed data
2. ✅ Create Precinct table + seed data
3. ✅ Create Election table + seed data
4. ✅ Create Location updates (add category, seed defaults)
5. ✅ Create Building table
6. ✅ Create Household table

**Phase 2: Create Person Model** (split from Voter)
7. ✅ Create Person table
8. ✅ Migrate data: Voter → Person (name, gender, birthDate, etc.)
9. ✅ Add Person FK to Household

**Phase 3: Update Voter Model** (attach to Person)
10. ✅ Add personId, externalId, externalSource, partyId to Voter
11. ✅ Migrate data: partyAbbr → partyId, precinctName removed
12. ✅ Drop old personal fields from Voter
13. ✅ Add unique constraint [externalId, externalSource]

**Phase 4: Update ContactInfo** (personId instead of voterId)
14. ✅ Add personId, isCurrently, source, verifiedAt, violationCount
15. ✅ Migrate: voterId → personId (via Voter.personId)
16. ✅ Drop voterId FK
17. ✅ Update unique constraint

**Phase 5: Update VoteHistory** (participated, electionId)
18. ✅ Add electionId, participated columns
19. ✅ Migrate: ballotCounted → participated, create Election records
20. ✅ Rename ballotPartyAbbr → ballotParty
21. ✅ Drop subDistrict unused fields

**Phase 6: Update ContactLog** (personId instead of voterId)
22. ✅ Add personId, person relation
23. ✅ Migrate: voterId → personId
24. ✅ Rename contactType → method
25. ✅ Drop voterId FK

**Phase 7: Cleanup**
26. ✅ Drop obsolete columns/relations
27. ✅ Verify all indexes
28. ✅ Run data consistency checks

---

## Data Consistency Checks (Post-Migration)

```sql
-- Check all Voters have corresponding Persons
SELECT COUNT(*) FROM Voter WHERE personId IS NULL;  -- Should be 0

-- Check all ContactInfo has corresponding Persons  
SELECT COUNT(*) FROM ContactInfo WHERE personId IS NULL;  -- Should be 0

-- Check all ContactLog has corresponding Persons
SELECT COUNT(*) FROM ContactLog WHERE personId IS NULL;  -- Should be 0

-- Check externalId uniqueness
SELECT externalId, externalSource, COUNT(*) 
FROM Voter 
WHERE externalId IS NOT NULL
GROUP BY externalId, externalSource
HAVING COUNT(*) > 1;  -- Should be empty

-- Check Party references valid
SELECT COUNT(*) FROM Voter WHERE partyId IS NOT NULL AND partyId NOT IN (SELECT id FROM Party);  -- Should be 0

-- Check Precinct references valid
SELECT COUNT(*) FROM Voter WHERE precinctId IS NOT NULL AND precinctId NOT IN (SELECT id FROM Precinct);  -- Should be 0

-- Check Election references valid
SELECT COUNT(*) FROM VoteHistory WHERE electionId IS NOT NULL AND electionId NOT IN (SELECT id FROM Election);  -- Should be 0
```

---

## Risk Assessment

### High Risk ⚠️
- **Voter.personId migration**: Every Voter must map to exactly one Person
  - Mitigation: Use transaction, check not-null constraint post-migration
- **ContactInfo person migration**: Every record must find its Person
  - Mitigation: Query via Voter.personId join, not by guess
- **Deduplication (externalId)**: Must handle existing duplicates before adding unique constraint
  - Mitigation: Identify duplicates pre-migration, decide merge strategy

### Medium Risk 🟡
- **Party/Precinct/Election lookup creation**: Must map existing codes correctly
  - Mitigation: Use explicit mapping, test with sample data
- **VoteHistory participated migration**: Bool conversion must be correct
  - Mitigation: Test 1→true, 0→false conversion

### Low Risk ✅
- **Location category seed**: New field, backfill with manual/script
- **Building/Household creation**: New tables, no existing data conflict
- **ContactLog rename**: Simple column rename, straightforward

---

## Rollback Plan

Each migration step should be independently reversible:
1. Keep backup of schema.prisma pre-migration
2. Export data before each phase
3. Create downgrade migration for each up migration
4. Test rollback on staging environment

---

## Implementation Checklist

- [ ] **Phase 1**: Create lookup tables (Party, Precinct, Election, etc.)
- [ ] **Phase 2**: Create Person table, migrate Voter data
- [ ] **Phase 3**: Update Voter model, drop old fields
- [ ] **Phase 4**: Update ContactInfo model
- [ ] **Phase 5**: Update VoteHistory model
- [ ] **Phase 6**: Update ContactLog model
- [ ] **Phase 7**: Cleanup, indexes, constraints
- [ ] Run data consistency checks
- [ ] Test with real Contra Costa voter file
- [ ] Test with simple CSV imports
- [ ] Verify deduplication logic
- [ ] Performance test (150K+ records)
- [ ] Documentation update
