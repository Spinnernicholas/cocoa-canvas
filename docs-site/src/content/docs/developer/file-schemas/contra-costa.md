---
title: Contra Costa County Voter File Format
---

# Contra Costa County Voter File Format

## Overview

The Contra Costa County voter registration file is a comprehensive dataset containing detailed voter information including identity, addresses, contact information, registration details, precinct assignments, and vote history for up to 5 recent elections.

**Format ID**: `contra_costa`  
**Format Name**: Contra Costa County  
**File Extensions**: `.txt`, `.tsv`  
**Delimiter**: Tab (`\t`)  
**Encoding**: UTF-8  
**Header Row**: Required  
**Total Fields**: 92 columns  
**Typical Record Count**: ~700,000 voters  
**Typical File Size**: 500MB - 1GB  
**Supports Incremental Import**: Yes (via VoterID)

---

## Field Schema

### Identity Fields (8 fields)

| Field Name | Type | Required | Description | Example | Population |
|------------|------|----------|-------------|---------|------------|
| `RegistrationNumber` | String | No | Unique registration number | R12345678 | ~100% |
| `VoterID` | String | **Yes** | Unique voter identifier (external ID) | V0123456789 | 100% |
| `VoterTitle` | String | No | Title or prefix | Mr., Ms., Dr. | ~5% |
| `FirstName` | String | **Yes** | First name | John | 100% |
| `MiddleName` | String | No | Middle name or initial | Michael | ~60% |
| `LastName` | String | **Yes** | Last name | Smith | 100% |
| `NameSuffix` | String | No | Name suffix | Jr., Sr., III | ~2% |
| `Gender` | String | No | Gender | M, F | ~99% |

### Demographics Fields (3 fields)

| Field Name | Type | Required | Description | Format | Population |
|------------|------|----------|-------------|--------|------------|
| `BirthDate` | Date | No | Date of birth | MM/DD/YYYY | ~95% |
| `BirthPlace` | String | No | Birth location | CA, USA | ~40% |
| `Language` | String | No | Preferred language | English, Spanish | ~10% |

### Residence Address Fields (11 fields)

| Field Name | Type | Required | Description | Example | Population |
|------------|------|----------|-------------|---------|------------|
| `HouseNumber` | String | Yes* | House/building number | 123 | ~99% |
| `PreDirection` | String | No | Street prefix direction | N, S, E, W | ~15% |
| `StreetName` | String | Yes* | Street name | Main | ~99% |
| `StreetSuffix` | String | No | Street type | St, Ave, Blvd | ~90% |
| `PostDirection` | String | No | Street suffix direction | N, S, E, W | ~5% |
| `UnitAbbr` | String | No | Unit type abbreviation | Apt, Unit, #  | ~20% |
| `UnitNumber` | String | No | Unit/apartment number | 5B | ~20% |
| `ResidenceCity` | String | Yes* | City name | Walnut Creek | ~99% |
| `ResidenceZipCode` | String | Yes* | ZIP code | 94596 | ~99% |

*Required for creating an Address record

### Mailing Address Fields (7 fields)

| Field Name | Type | Required | Description | Example | Population |
|------------|------|----------|-------------|---------|------------|
| `MailAddress1` | String | No | Mailing address line 1 | PO Box 1234 | ~15% |
| `MailAddress2` | String | No | Mailing address line 2 | Suite 100 | ~3% |
| `MailAddress3` | String | No | Mailing address line 3 | | ~1% |
| `MailAddress4` | String | No | Mailing address line 4 | | <1% |
| `MailCity` | String | No | Mailing city | Concord | ~15% |
| `MailState` | String | No | Mailing state | CA | ~15% |
| `MailZip` | String | No | Mailing ZIP code | 94520 | ~15% |

### Contact Information Fields (2 fields)

| Field Name | Type | Required | Description | Example | Population |
|------------|------|----------|-------------|---------|------------|
| `PhoneNumber` | String | No | Phone number (any format) | (925) 555-1234 | ~60% |
| `EmailAddress` | String | No | Email address | voter@example.com | ~31% |

### Registration Fields (5 fields)

| Field Name | Type | Required | Description | Format | Population |
|------------|------|----------|-------------|--------|------------|
| `RegistrationDate` | Date | No | Voter registration date | MM/DD/YYYY | ~99% |
| `PartyName` | String | No | Full party name | Democratic | ~95% |
| `PartyAbbr` | String | No | Party abbreviation | DEM, REP, NPP | ~95% |
| `VBMProgramStatus` | String | No | Vote-by-mail program status | Active, Inactive | ~70% |
| `StatusReason` | String | No | Registration status reason | New, Update | ~50% |

### Precinct Fields (3 fields)

| Field Name | Type | Required | Description | Example | Population |
|------------|------|----------|-------------|---------|------------|
| `PrecinctID` | String | No | Precinct identifier | 1234 | ~99% |
| `PrecinctPortion` | String | No | Precinct portion/split | A, B | ~10% |
| `PrecinctName` | String | No | Precinct name | Pleasant Hill 1 | ~99% |

### Vote History Fields (53 fields: 5 elections × 10 fields + 3 extra)

For each of the 5 most recent elections (N = 1 to 5):

| Field Pattern | Type | Description | Example |
|---------------|------|-------------|---------|
| `ElectionAbbr_N` | String | Election abbreviation | PRIM-2024 |
| `ElectionDesc_N` | String | Election description | Primary Election March 2024 |
| `ElectionDate_N` | Date | Election date | MM/DD/YYYY |
| `ElectionType_N` | String | Type of election | Primary, General, Special |
| `BallotPartyName_N` | String | Party ballot received | Democratic |
| `BallotPartyAbbr_N` | String | Party ballot abbreviation | DEM |
| `BallotCounted_N` | String | Whether ballot was counted | 1 (yes), 0 (no) |
| `VotingMethodDesc_N` | String | How voter cast ballot | Vote By Mail, Polling Place |
| `DistrictID_N` | String | District identifier for election | D001 |
| `SubDistrict_N` | String | Sub-district identifier | SD01 |
| `DistrictName_N` | String | District name | Congressional District 11 |

**Note**: Older elections (higher N values) are less populated as not all voters have 5 elections of history.

---

## Data Requirements

### Validation Rules

1. **VoterID** (Required)
   - Must be present and non-empty
   - Used as unique external identifier
   - Used for deduplication in incremental imports

2. **FirstName and LastName** (Required)
   - Default to 'Unknown' if not provided
   - Should generally always be present in county files

3. **Date Fields** (Optional but Validated)
   - Format: `MM/DD/YYYY`
   - Invalid dates are set to null
   - Affects: `BirthDate`, `RegistrationDate`, `ElectionDate_N`

4. **Residence Address** (Optional but Conditional)
   - Address record only created if all of these present:
     - `HouseNumber`
     - `StreetName`
   - City and ZIP are also required for complete address

5. **Mailing Address** (Optional)
   - Only created if `MailAddress1` is present
   - Only created if different from residence address

6. **Party References**
   - `PartyAbbr` looked up in Party table
   - If not found, `partyId` is null
   - Party records should be pre-seeded

7. **Precinct References**
   - `PrecinctID` looked up in Precinct table
   - If not found, `precinctId` is null
   - Precinct records should be pre-seeded or imported

### Import Types

#### Full Import
- Creates new Person/Voter records for previously unknown voters
- Updates existing Person/Voter records (matched by VoterID)
- **Replaces** all contact information (addresses, phones, emails)
- **Replaces** all vote history
- Use for: Initial data load or periodic complete refresh

#### Incremental Import
- **Only** updates voters that already exist (matched by VoterID)
- Skips voters not already in database
- Updates Person and Voter fields
- **Replaces** all contact information
- **Replaces** all vote history
- Use for: Regular updates to refresh existing records

---

## Database Mapping

### Person Record

| Field Name | Database Field | Table | Type | Notes |
|------------|----------------|-------|------|-------|
| `FirstName` | `firstName` | Person | String | Required, defaults to 'Unknown' |
| `LastName` | `lastName` | Person | String | Required, defaults to 'Unknown' |
| `MiddleName` | `middleName` | Person | String | Optional |
| `NameSuffix` | `nameSuffix` | Person | String | Optional |
| `VoterTitle` | `title` | Person | String | Optional |
| `Gender` | `gender` | Person | String | Optional (M, F) |
| `BirthDate` | `birthDate` | Person | DateTime | Parsed from MM/DD/YYYY |
| `BirthPlace` | `birthPlace` | Person | String | Optional |
| `Language` | `language` | Person | String | Optional |

### Voter Record

| Field Name | Database Field | Table | Type | Notes |
|------------|----------------|-------|------|-------|
| (auto) | `personId` | Voter | String | Links to Person.id |
| `VoterID` | `externalId` | Voter | String | Unique external identifier |
| (fixed) | `externalSource` | Voter | String | Set to 'contra_costa' |
| `RegistrationNumber` | `registrationNumber` | Voter | String | Optional |
| `RegistrationDate` | `registrationDate` | Voter | DateTime | Parsed from MM/DD/YYYY |
| `PartyAbbr` → Party.id | `partyId` | Voter | String | FK to Party table |
| `VBMProgramStatus` | `vbmStatus` | Voter | String | Vote-by-mail status |
| `PrecinctID` → Precinct.id | `precinctId` | Voter | String | FK to Precinct table |
| `PrecinctPortion` | `precinctPortion` | Voter | String | Optional |
| (fixed) | `importedFrom` | Voter | String | Set to 'contra_costa' |
| (auto) | `importType` | Voter | String | 'full' or 'incremental' |
| (fixed) | `importFormat` | Voter | String | Set to 'contra_costa' |

**Unique Constraint**: `(externalId, externalSource)` - prevents duplicate voters from same source

### Address Records (Person-linked)

#### Residence Address (Location: 'Residence')

| Field Name | Database Field | Table | Type | Notes |
|------------|----------------|-------|------|-------|
| (auto) | `personId` | Address | String | Links to Person.id |
| (lookup) | `locationId` | Address | String | 'Residence' location type |
| `HouseNumber` | `houseNumber` | Address | String | Building number |
| `PreDirection` | `preDirection` | Address | String | Street prefix direction |
| `StreetName` | `streetName` | Address | String | Street name |
| `StreetSuffix` | `streetSuffix` | Address | String | Street type |
| `PostDirection` | `postDirection` | Address | String | Street suffix direction |
| `UnitAbbr` | `unitAbbr` | Address | String | Unit type |
| `UnitNumber` | `unitNumber` | Address | String | Unit number |
| `ResidenceCity` | `city` | Address | String | City name |
| (fixed: CA) | `state` | Address | String | State code |
| `ResidenceZipCode` | `zipCode` | Address | String | ZIP code |
| (computed) | `fullAddress` | Address | String | Formatted full address |
| (fixed: true) | `isPrimary` | Address | Boolean | Residence is primary |
| (fixed: true) | `isVerified` | Address | Boolean | County data is verified |
| (fixed) | `source` | Address | String | Set to 'contra_costa' |

**Full Address Format**: `[HouseNumber] [PreDirection] [StreetName] [StreetSuffix] [PostDirection] [Unit]`

#### Mailing Address (Location: 'Mailing')

| Field Name | Database Field | Table | Type | Notes |
|------------|----------------|-------|------|-------|
| (auto) | `personId` | Address | String | Links to Person.id |
| (lookup) | `locationId` | Address | String | 'Mailing' location type |
| `MailAddress1` | `fullAddress` | Address | String | Mailing address string |
| `MailCity` | `city` | Address | String | City name |
| `MailState` | `state` | Address | String | State code |
| `MailZip` | `zipCode` | Address | String | ZIP code |
| (fixed: false) | `isPrimary` | Address | Boolean | Mailing is not primary |
| (fixed: true) | `isVerified` | Address | Boolean | County data is verified |
| (fixed) | `source` | Address | String | Set to 'contra_costa' |

**Only created if**: `MailAddress1` exists AND differs from residence address

### Email Record (Person-linked)

| Field Name | Database Field | Table | Type | Notes |
|------------|----------------|-------|------|-------|
| (auto) | `personId` | Email | String | Links to Person.id |
| (lookup) | `locationId` | Email | String | 'Unknown' location type |
| `EmailAddress` | `address` | Email | String | Email address |
| (fixed: true) | `isPrimary` | Email | Boolean | Set as primary |
| (fixed: false) | `isVerified` | Email | Boolean | Not verified |
| (fixed) | `source` | Email | String | Set to 'contra_costa' |

### Phone Record (Person-linked)

| Field Name | Database Field | Table | Type | Notes |
|------------|----------------|-------|------|-------|
| (auto) | `personId` | Phone | String | Links to Person.id |
| (lookup) | `locationId` | Phone | String | 'Unknown' location type |
| `PhoneNumber` | `number` | Phone | String | Raw phone number |
| (fixed: true) | `isPrimary` | Phone | Boolean | Set as primary |
| (fixed: false) | `isVerified` | Phone | Boolean | Not verified |
| (fixed) | `source` | Phone | String | Set to 'contra_costa' |

### VoteHistory Records (Voter-linked)

For each of 5 most recent elections where date is present:

| Field Name | Database Field | Table | Type | Notes |
|------------|----------------|-------|------|-------|
| (auto) | `voterId` | VoteHistory | String | Links to Voter.id |
| `ElectionDate_N` → Election.id | `electionId` | VoteHistory | String | FK to Election table |
| `ElectionDate_N` | `electionDate` | VoteHistory | DateTime | Election date |
| `ElectionAbbr_N` | `electionAbbr` | VoteHistory | String | Election abbreviation |
| `ElectionDesc_N` | `electionDesc` | VoteHistory | String | Election description |
| `ElectionType_N` | `electionType` | VoteHistory | String | Primary, General, etc. |
| `BallotCounted_N` | `participated` | VoteHistory | Boolean | '1' → true, else false |
| `VotingMethodDesc_N` | `votingMethod` | VoteHistory | String | Vote By Mail, etc. |
| `BallotPartyAbbr_N` → Party.id | `ballotPartyId` | VoteHistory | String | FK to Party table |
| `BallotPartyName_N` | `ballotPartyName` | VoteHistory | String | Party name |
| `DistrictID_N` | `districtId` | VoteHistory | String | District identifier |
| `DistrictName_N` | `districtName` | VoteHistory | String | District name |

### Election Records (Auto-created)

Elections are automatically created when processing vote history if they don't exist:

| Field Name | Database Field | Table | Type | Unique Key |
|------------|----------------|-------|------|------------|
| `ElectionDate_N` | `electionDate` | Election | DateTime | Yes (unique) |
| `ElectionAbbr_N` | `electionAbbr` | Election | String | |
| `ElectionDesc_N` | `electionDesc` | Election | String | |
| `ElectionType_N` | `electionType` | Election | String | |

---

## File Format Example

### Tab-Delimited Structure

```
RegistrationNumber	VoterID	VoterTitle	FirstName	MiddleName	LastName	NameSuffix	Gender	...
R12345678	V0123456789	Mr.	John	M	Smith	Jr.	M	...
R12345679	V0123456790		Jane	L	Doe		F	...
```

### Sample Record (Selected Fields)

```
RegistrationNumber: R12345678
VoterID: V0123456789
FirstName: John
LastName: Smith
Gender: M
BirthDate: 01/15/1980
HouseNumber: 123
StreetName: Main
StreetSuffix: St
ResidenceCity: Walnut Creek
ResidenceZipCode: 94596
PhoneNumber: (925) 555-1234
EmailAddress: john.smith@example.com
RegistrationDate: 10/01/2000
PartyAbbr: DEM
PrecinctID: 1234
ElectionDate_1: 11/08/2022
ElectionDesc_1: General Election November 2022
BallotCounted_1: 1
VotingMethodDesc_1: Vote By Mail
```

---

## Prerequisites

### Required Location Types

Must exist in database before import:
- `Residence` - For residence addresses
- `Mailing` - For mailing addresses
- `Unknown` - For phones and emails with unknown location type

**Setup**: Run `npx prisma db seed` or seed-locations script

### Optional Pre-seeded Data

For optimal data linking:
- **Parties**: Pre-seed political parties with abbreviations matching file (DEM, REP, NPP, etc.)
- **Precincts**: Pre-seed precinct records with numbers matching `PrecinctID` field
- **Elections**: Will be auto-created during import if missing

---

## Import Behavior Details

### Deduplication Logic

1. **Lookup**: Search for existing Voter by `(externalId='VoterID', externalSource='contra_costa')`
2. **Full Import - Voter Exists**: 
   - Update Person and Voter records
   - Delete all existing Addresses, Phones, Emails, VoteHistory
   - Create new contact records and vote history from file
3. **Full Import - Voter New**:
   - Create new Person and Voter records
   - Create all contact records and vote history
4. **Incremental Import - Voter Exists**:
   - Update Person and Voter records
   - Delete all existing Addresses, Phones, Emails, VoteHistory  
   - Create new contact records and vote history from file
5. **Incremental Import - Voter New**:
   - Skip record entirely (incremental only updates existing)

### Record Processing Order

For each record:
1. Look up existing Voter by VoterID
2. Create or update Person record
3. Create or update Voter record
4. Delete old contact info (if full import or updating)
5. Create residence Address (if fields present)
6. Create mailing Address (if different from residence)
7. Create Email record (if present)
8. Create Phone record (if present)
9. For each of 5 elections (if date present):
   - Look up or create Election record
   - Look up ballot Party (if abbreviation present)
   - Create VoteHistory record

### Transaction Model

- Each voter record is processed individually (not batch commits)
- Record processing pauses/resumes stream for backpressure control
- Errors on individual records are logged but don't stop import

---

## Error Handling

### Common Errors

1. **Missing VoterID**
   - Error: "Missing VoterID"
   - Action: Record skipped, error logged

2. **Location Types Not Initialized**
   - Error: "Location types not initialized. Run seed-locations first."
   - Action: Import fails immediately
   - Fix: Run `npx prisma db seed`

3. **Date Parsing Errors**
   - Invalid date formats silently set field to null
   - Import continues processing

4. **Party/Precinct Lookup Failures**
   - Non-fatal: FK set to null
   - Import continues processing
   - Consider pre-seeding reference data

5. **Database Constraint Violations**
   - Caught and logged per record
   - Import continues with next record

### Progress Reporting

```typescript
onProgress: (processed: number, total: number, errors: number) => {
  // Called every 100 records
  // total is always 0 (streaming import)
}
```

---

## Performance Characteristics

- **Processing Speed**: ~500-1,000 records/second
- **700k records**: ~12-25 minutes
- **Memory Usage**: Low (streaming CSV parser)
- **Database Queries per Record**: 
  - 1-2 lookups (Voter, Party)
  - 1-2 creates/updates (Person, Voter)
  - 0-2 Address creates
  - 0-1 Phone create
  - 0-1 Email create
  - 0-5 Election lookups/creates
  - 0-5 VoteHistory creates
  - **Total**: ~15-30 queries per record

### Optimization Recommendations

1. **Pre-seed reference data** (Parties, Precincts, Locations)
2. **Use database indexes** on lookup fields (externalId, externalSource, partyAbbr, precinctNumber)
3. **Monitor connection pool** during import
4. **Use job queue** for background processing
5. **Consider database tuning** for bulk operations

---

## Usage Example

### Import via API

```typescript
import { ContraCostaImporter } from '@/lib/importers/contra-costa';

const importer = new ContraCostaImporter();

const result = await importer.importFile({
  filePath: '/path/to/contra-costa-voters.txt',
  importType: 'full', // or 'incremental'
  jobId: 'import-job-123',
  onProgress: (processed, total, errors) => {
    console.log(`Processed: ${processed}, Errors: ${errors}`);
  },
});

console.log(`
  Success: ${result.success}
  Processed: ${result.processed}
  Created: ${result.created}
  Errors: ${result.errors}
  Message: ${result.message}
`);
```

### Background Job Processing

For production imports, use the job queue system:

```typescript
import { addJob } from '@/lib/queue/bullmq';

await addJob('voter_import', {
  filePath: '/uploads/voters.txt',
  format: 'contra_costa',
  importType: 'full',
  userId: currentUser.id,
});
```

---

## Data Analysis

### Field Population Rates

Based on analysis of sample Contra Costa files:

- **Identity**: 100% (FirstName, LastName, VoterID)
- **Demographics**: 95% BirthDate, 99% Gender, 40% BirthPlace
- **Residence Address**: 99% complete
- **Mailing Address**: 15% of voters
- **Phone Numbers**: 60% of voters
- **Email Addresses**: 31% of voters
- **Party Registration**: 95% of voters
- **Precinct**: 99% of voters
- **Vote History**: Varies by election age (Election_1: 70%, Election_5: 30%)

### Analysis Script

```bash
cd scripts/data-analysis
python3 analyze_contra_costa.py ../../tmp/voter-file.txt
```

Provides:
- Field names and population rates
- Sample values for each field
- Complete sample record
- Total record count

---

## See Also

- [Basic CSV Voter File Format](./basic-csv.md) - Simplified voter import format
- [Import Architecture](../IMPORT_ARCHITECTURE.md) - Import system design
- [Database Schema Master](../DATABASE_SCHEMA_MASTER.md) - Complete database schema
- [Voter File Formats Overview](../VOTER_FILE_FORMATS.md) - All supported formats
