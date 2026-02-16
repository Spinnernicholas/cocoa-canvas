# Voter File Importer - Phase 2 Implementation

## Overview
Implemented comprehensive voter data management with support for different file types and formats, starting with Contra Costa County format.

## Database Schema Changes

### Models Updated/Added

1. **Voter Model** (Enhanced)
   - External identifiers: `externalId`, `externalVoterId`
   - Name components: `title`, `firstName`, `middleName`, `lastName`, `nameSuffix`
   - Demographics: `gender`, `birthDate`, `birthPlace`
   - Registration info: `registrationDate`, `partyAffiliation`, `partyAbbreviation`, `language`
   - Voting status: `vbmStatus`, `statusReason`
   - Geographic: `precinctId`, `precinctName`
   - Import metadata: `importSource`, `importType`, `importFormat`, `importedAt`

2. **Location Model** (New)
   - Standardized location types for contact information
   - Seeded with: Home, Work, Cell, Mailing, Residence
   - Allows for flexible contact organization

3. **ContactInfo Model** (New)
   - Links contact details to voters with location context
   - Supports addresses, phone numbers, and emails
   - Address components: `houseNumber`, `preDirection`, `streetName`, `streetSuffix`, `postDirection`, `unitAbbr`, `unitNumber`, `city`, `state`, `zipCode`
   - Phone: `phone`, `phoneType`
   - Email: `email`
   - Verification: `isVerified`, `isPrimary`

4. **VoteHistory Model** (New)
   - Tracks election participation
   - Election details: `electionAbbr`, `electionDesc`, `electionDate`, `electionType`
   - Ballot info: `ballotPartyName`, `ballotPartyAbbr`, `ballotCounted`
   - Voting method: `votingMethod`
   - District info: `districtId`, `subDistrict`, `districtName`

## File Format Support

### Import Types
- **Full Import**: Complete voter file replacement/initial load
- **Incremental Update**: Updates to existing voter records

### Supported Formats

#### 1. Contra Costa County Format
- **File**: Tab-delimited text (`.txt`)
- **Fields**: 92 columns including:
  - Voter identity fields
  - Residence address (separate components)
  - Mailing address (4 address lines)
  - Contact information (phone, email)
  - Election history (5 most recent elections)
  - District and precinct information

**Key Distinctions**:
- Residence vs. Mailing addresses properly separated
- Address components vs. full address lines
- Home contact = Residence location
- Mail contact = Mailing location (if different)

#### 2. Simple CSV Format
- Basic import for testing/simple datasets
- Required columns: `firstName`, `lastName`
- Optional: `email`, `phone`, `address`, `city`, `zip`

#### 3. Standard Format (Future)
- To be designed based on common patterns across jurisdictions
- Will normalize various county formats into a standard structure

## Data Analysis Tools

### Python Scripts
Location: `/scripts/data-analysis/`

1. **analyze_contra_costa.py**
   - Analyzes Contra Costa voter file structure
   - Identifies field types and fill rates
   - Provides sample data from each column
   - Helps understand source data before import

Usage:
```bash
python3 scripts/data-analysis/analyze_contra_costa.py [file_path]
```

## Importer Implementation

### Contra Costa Importer
Location: `/lib/importers/contra-costa.ts`

Features:
- Streaming parser for large files (574MB+ support)
- Progress tracking
- Error handling and reporting
- Automatic location type assignment
- Contact info extraction and organization
- Vote history tracking

### Simple CSV Importer
Location: `/app/api/v1/voters/import/route.ts`

Features:
- Basic CSV parsing
- Manual voter creation
- Error reporting

## API Endpoints

### POST /api/v1/voters
Create a new voter manually
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "Q",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "notes": "Interested in campaign"
}
```

### POST /api/v1/voters/import
Import voters from CSV file
- Accepts CSV with firstName/lastName columns
- Creates basic voter records

### Future: POST /api/v1/voters/import/contra-costa
Dedicated Contra Costa import endpoint
- Will accept .txt tab-delimited files
- Full address and contact parsing
- Election history import
- Progress tracking via job system

## Location Seeds

Initial location types are automatically seeded:
- **Home**: Residence address and home contact information
- **Work**: Work/office address and contact information  
- **Cell**: Mobile/cellular phone number
- **Mailing**: Mailing address if different from residence
- **Residence**: Voter registration residence address

Run seeds: `npx ts-node prisma/seeds/seed-locations.ts`

## Migration Applied

Migration: `20260216160612_add_voter_contact_models`
- Created Location table
- Created ContactInfo table
- Created VoteHistory table
- Updated Voter table with new fields
- Removed old simple fields (name, email, phone, address)

## Next Steps

1. **Implement Contra Costa Import Endpoint**
   - Create dedicated API route
   - Integrate with job queue for async processing
   - Add progress tracking

2. **Import UI**
   - File upload interface
   - Format selection
   - Import type selection (full vs. incremental)
   - Progress display

3. **Incremental Update Logic**
   - Match on `externalId` or `externalVoterId`
   - Update existing records vs. create new
   - Merge strategy for contact info

4. **Standard Format Definition**
   - Design universal import format
   - Create transformation layer for various county formats
   - Documentation for partners

5. **Data Validation**
   - Address validation
   - Email/phone format verification
   - Duplicate detection strategies

## File Analysis Results

Sample from Contra Costa file (574MB):
- 92 fields total
- Key fields: RegistrationNumber, VoterID, Name components, Addresses, Contact info
- High fill rates on core fields (>95%)
- Variable fill rates on optional fields
- Election history for last 5 elections

## Dependencies Added

- `csv-parse`: CSV/TSV parsing library for Node.js
- Used in Contra Costa importer for streaming large files

## Testing

Build Status: ✅ Successful
- All TypeScript compilation passes
- Prisma client generated
- No type errors
- All routes compile

## Documentation

- README updated with new schema
- Python analysis scripts documented
- Seed scripts include inline documentation
- This implementation summary
