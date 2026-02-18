---
title: Voter File Import Formats
---

# Voter File Import Formats

This document describes the supported voter file formats and import types.

## Import Types

### Full Import
- **Purpose**: Complete replacement of voter data
- **Behavior**: 
  - All existing voters are either updated or marked as inactive
  - New voters are added
  - Existing contact information and vote history are replaced
- **Use Case**: Initial data load or periodic full refresh

### Incremental Import
- **Purpose**: Update existing voter records only
- **Behavior**:
  - Only updates voters that already exist in the database
  - New voters in the file are skipped
  - Updates contact information and adds new vote history
- **Use Case**: Regular updates to keep data fresh

## Supported Formats

### 1. Contra Costa County Format

**File Format**: Tab-delimited text file  
**Record Count**: ~700,000 voters  
**Fields**: 92 columns

#### Key Fields

**Identity**
- `RegistrationNumber`: Unique registration number
- `VoterID`: Voter ID from jurisdiction
- `VoterTitle`, `FirstName`, `MiddleName`, `LastName`, `NameSuffix`
- `Gender`, `BirthDate`, `BirthPlace`

**Residence Address**
- `HouseNumber`, `PreDirection`, `StreetName`, `StreetSuffix`, `PostDirection`
- `UnitAbbr`, `UnitNumber`
- `ResidenceCity`, `ResidenceZipCode`

**Mailing Address**
- `MailAddress1`, `MailAddress2`, `MailAddress3`, `MailAddress4`
- `MailCity`, `MailState`, `MailZip`

**Contact Information**
- `PhoneNumber`: ~60% of records have phone numbers
- `EmailAddress`: ~31% of records have email addresses

**Registration**
- `RegistrationDate`, `PartyName`, `PartyAbbr`
- `Language`: Preferred language
- `VBMProgramStatus`: Vote-by-mail status

**Precinct**
- `PrecinctID`, `PrecinctPortion`, `PrecinctName`

**Vote History** (5 most recent elections)
- `ElectionAbbr_N`, `ElectionDesc_N`, `ElectionDate_N`
- `ElectionType_N`, `BallotPartyName_N`, `BallotPartyAbbr_N`
- `BallotCounted_N`: Whether ballot was counted
- `VotingMethodDesc_N`: How they voted (absentee, polling place, etc.)
- `DistrictID_N`, `SubDistrict_N`, `DistrictName_N`

**Status**
- `StatusReason`: Reason for last registration change

#### Import Behavior

**Voter Record**
- Creates/updates `Voter` with all identity and registration fields
- Stores vote history in `VoteHistory` table (5 most recent elections)

**Contact Information**
1. **Residence Address** → `ContactInfo` with Location = "Residence"
   - Parsed from individual address components
   - Marked as `isPrimary: true, isVerified: true`

2. **Mailing Address** → `ContactInfo` with Location = "Mailing"
   - Only created if different from residence
   - Marked as `isPrimary: false, isVerified: true`

3. **Phone Number** → `ContactInfo` with Location = "Cell"
   - Marked as `isPrimary: true, isVerified: false`

4. **Email Address** → `ContactInfo` with Location = "Residence"
   - Marked as `isPrimary: true, isVerified: false`

#### Sample Import

```typescript
import { importContraCostaFile } from '@/lib/importers/contra-costa';

const result = await importContraCostaFile({
  filePath: '/path/to/voter-file.txt',
  importType: 'full', // or 'incremental'
  jobId: 'optional-job-id',
  onProgress: (processed, total, errors) => {
    console.log(`Processed: ${processed}, Errors: ${errors}`);
  },
});

console.log(`Success: ${result.success}, Processed: ${result.processed}, Errors: ${result.errors}`);
```

### 2. Standard Format (TODO)

The standard format will be a normalized CSV format that can be used across jurisdictions.

**Planned Fields**:
- Voter identity
- Multiple addresses with location types
- Multiple phone numbers with location types
- Multiple emails with location types
- Party affiliation
- Registration status
- Vote history (optional)

**Status**: Not yet implemented

## Data Model

### Location Types

The system uses the following standard location types:

- **Home**: Primary residence address and home contact
- **Work**: Work or business address and contact
- **Cell**: Mobile/cellular phone number
- **Mailing**: Mailing address if different from residence
- **Residence**: Voter registration residence address

### Contact Information Storage

All contact information (addresses, phones, emails) is stored in the `ContactInfo` table with:
- Reference to `Voter`
- Reference to `Location` (type)
- Optional phone, email, and address fields
- Flags: `isPrimary`, `isVerified`

This allows:
- Multiple addresses per voter (home, work, mailing, etc.)
- Multiple phone numbers per voter (home, cell, work, etc.)
- Multiple emails per voter (home, work, etc.)
- Flexible querying by location type

## Analysis Tools

### Analyze Contra Costa File

A Python script is available to analyze the structure of Contra Costa files:

```bash
cd scripts/data-analysis
python3 analyze_contra_costa.py ../../tmp/voter-file.txt
```

This will:
- Show all 92 field names
- Analyze field population rates
- Display sample values
- Show a complete sample record
- Count total records (optional)

## Adding New Formats

To add a new jurisdiction format:

1. Create analysis script in `scripts/data-analysis/`
2. Create importer in `lib/importers/[jurisdiction].ts`
3. Implement interface with `importType` parameter
4. Map fields to Voter and ContactInfo models
5. Document format in this file
6. Add tests in `lib/importers/[jurisdiction].test.ts`

## Import Performance

For large files (700k+ records):
- Processing speed: ~500-1000 records/second
- 700k records: ~12-25 minutes
- Consider batch processing for very large files
- Monitor memory usage during import
- Use job queue for background processing
