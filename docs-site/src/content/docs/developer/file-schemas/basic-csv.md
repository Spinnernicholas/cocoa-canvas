# Basic CSV Voter File Format

## Overview

The Basic CSV format is a simplified voter file format for quick imports when standardized county voter data is unavailable. It requires minimal fields (firstname and lastname) with optional contact information.

**Format ID**: `simple_csv`  
**Format Name**: Simple CSV  
**File Extension**: `.csv`  
**Delimiter**: Comma (`,`)  
**Encoding**: UTF-8  
**Header Row**: Required  
**Supports Incremental Import**: No (no unique voter ID)

---

## Field Schema

### Required Fields

| Field Name | Aliases | Type | Description | Example |
|------------|---------|------|-------------|---------|
| `firstname` | `first_name`, `FirstName` | String | Voter's first name | John |
| `lastname` | `last_name`, `LastName` | String | Voter's last name | Smith |

### Optional Fields

| Field Name | Aliases | Type | Description | Example |
|------------|---------|------|-------------|---------|
| `email` | `Email` | String | Email address | john.smith@example.com |
| `phone` | `Phone` | String | Phone number (any format) | (555) 123-4567 |
| `address` | `Address` | String | Street address | 123 Main St |
| `city` | `City` | String | City name | San Francisco |
| `state` | `State` | String | State abbreviation (defaults to CA) | CA |
| `zip` | `Zip` | String | ZIP code | 94102 |

---

## Data Requirements

### Validation Rules

1. **firstname** and **lastname** are required
   - Must not be empty or whitespace-only
   - Records missing these fields will be skipped with an error

2. **email** (if provided)
   - No format validation performed
   - Will be linked to Person record

3. **phone** (if provided)
   - No format validation or normalization
   - Any format accepted (digits, dashes, parentheses, etc.)
   - Will be linked to Person record

4. **address**, **city**, **zip** (if provided)
   - All three must be present to create an Address record
   - Partial address data will be ignored
   - State defaults to 'CA' if not provided

### Import Behavior

- **Import Type**: Full import only (no incremental updates)
- **Deduplication**: None (each row creates a new Person/Voter)
- **Location Requirements**: 'Residence' and 'Cell' location types must exist
- **Source Tracking**: All records marked with source `simple_csv`

---

## File Format Examples

### Minimal Format (Required Fields Only)

```csv
firstname,lastname
John,Smith
Jane,Doe
Robert,Johnson
```

### Complete Format (All Fields)

```csv
firstname,lastname,email,phone,address,city,state,zip
John,Smith,john.smith@example.com,555-123-4567,123 Main St,San Francisco,CA,94102
Jane,Doe,jane.doe@example.com,(555) 234-5678,456 Oak Ave,Oakland,CA,94601
Robert,Johnson,bob@example.com,555.345.6789,789 Pine St,Berkeley,CA,94704
```

### Alternative Column Names

```csv
first_name,last_name,Email,Phone,Address,City,State,Zip
John,Smith,john.smith@example.com,555-123-4567,123 Main St,San Francisco,CA,94102
```

---

## Database Mapping

### Person Record

Created for each valid row:

| CSV Field | Database Field | Table | Notes |
|-----------|----------------|-------|-------|
| `firstname` | `firstName` | Person | Required |
| `lastname` | `lastName` | Person | Required |

### Voter Record

Created and linked to Person:

| CSV Field | Database Field | Table | Notes |
|-----------|----------------|-------|-------|
| (auto) | `personId` | Voter | Links to Person.id |
| (fixed) | `externalSource` | Voter | Set to 'simple_csv' |
| (fixed) | `registrationDate` | Voter | Set to import date |
| (fixed) | `importedFrom` | Voter | Set to 'simple_csv' |
| (fixed) | `importType` | Voter | Set to 'full' |
| (fixed) | `importFormat` | Voter | Set to 'simple_csv' |

### Address Record

Created if address, city, and zip are all provided:

| CSV Field | Database Field | Table | Notes |
|-----------|----------------|-------|-------|
| (auto) | `personId` | Address | Links to Person.id |
| (lookup) | `locationId` | Address | 'Residence' location type |
| `address`, `city`, `state`, `zip` | `fullAddress` | Address | Combined formatted address |
| `address` | `streetName` | Address | Street address only |
| `city` | `city` | Address | City name |
| `state` | `state` | Address | State code (default: CA) |
| `zip` | `zipCode` | Address | ZIP code |
| (fixed) | `isPrimary` | Address | Set to true |
| (fixed) | `isVerified` | Address | Set to false |
| (fixed) | `source` | Address | Set to 'simple_csv' |

### Phone Record

Created if phone is provided:

| CSV Field | Database Field | Table | Notes |
|-----------|----------------|-------|-------|
| (auto) | `personId` | Phone | Links to Person.id |
| (lookup) | `locationId` | Phone | 'Cell' location type |
| `phone` | `number` | Phone | Raw phone number |
| (fixed) | `isPrimary` | Phone | Set to true |
| (fixed) | `isVerified` | Phone | Set to false |
| (fixed) | `source` | Phone | Set to 'simple_csv' |

### Email Record

Created if email is provided:

| CSV Field | Database Field | Table | Notes |
|-----------|----------------|-------|-------|
| (auto) | `personId` | Email | Links to Person.id |
| (lookup) | `locationId` | Email | 'Residence' location type |
| `email` | `address` | Email | Email address |
| (fixed) | `isPrimary` | Email | Set to false |
| (fixed) | `isVerified` | Email | Set to false |
| (fixed) | `source` | Email | Set to 'simple_csv' |

---

## Error Handling

### Common Errors

1. **Missing Required Fields**
   - Error: "Missing required fields: firstname and lastname"
   - Action: Row skipped, error logged with row number

2. **Location Types Not Initialized**
   - Error: "Location types not initialized. Run seed-locations first."
   - Action: Import fails immediately
   - Fix: Run `npx prisma db seed` or seed-locations script

3. **Duplicate Records**
   - Error: "Duplicate voter record" (Prisma P2002 error)
   - Action: Row skipped
   - Note: This format has no unique ID for deduplication

### Error Result Structure

```typescript
{
  success: boolean;
  processed: number;
  created: number;
  updated: number;  // Always 0 for simple CSV
  skipped: number;
  errors: number;
  message?: string;
}
```

---

## Usage Example

### Import via API

```typescript
import { SimpleCsvImporter } from '@/lib/importers/simple-csv';

const importer = new SimpleCsvImporter();

const result = await importer.importFile({
  filePath: '/path/to/voters.csv',
  importType: 'full',
  onProgress: (processed, created, errors) => {
    console.log(`Processed: ${processed}, Created: ${created}, Errors: ${errors}`);
  },
});

console.log(`
  Success: ${result.success}
  Processed: ${result.processed}
  Created: ${result.created}
  Skipped: ${result.skipped}
  Errors: ${result.errors}
`);
```

### Progress Reporting

- Progress callback invoked every 100 records
- Provides running totals for processed, created, and error counts
- Import runs synchronously (not background job)

---

## Performance Characteristics

- **Processing Speed**: ~1,000-2,000 records/second
- **Memory Usage**: Low (streaming CSV parser)
- **Recommended Max File Size**: 100,000 records
- **Database Operations**: 4 queries per record (Person, Voter, Address?, Phone?, Email?)
- **Transaction Model**: Individual record transactions (no batch commits)

### For Large Files

- Consider splitting files into smaller chunks
- Use job queue system for background processing
- Monitor database connection pool

---

## Limitations

1. **No Incremental Updates**: Every import creates new records
2. **No Deduplication**: No unique voter ID to prevent duplicates
3. **No Vote History**: Format doesn't support election participation data
4. **No Party Affiliation**: No political party field
5. **Limited Address Support**: Single address only (no mailing address)
6. **No Demographics**: No gender, birthdate, or other demographic data

---

## See Also

- [Contra Costa Voter File Format](./contra-costa.md) - Full county voter file format
- [Import Architecture](../IMPORT_ARCHITECTURE.md) - Import system design
- [Database Schema Master](../DATABASE_SCHEMA_MASTER.md) - Complete database schema
