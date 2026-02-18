---
title: Voter File Import Architecture
---

# Voter File Import Architecture

## Overview

The voter file import system uses a **Registry Pattern** with a **Strategy Pattern** to support 58+ different voter file formats through a single unified API endpoint. Each format has its own importer implementation, but they all conform to the same interface.

## Architecture

### Single Unified Endpoint

**Endpoint**: `POST /api/v1/voters/import`

**Parameters**:
- `file` - The voter file (multipart/form-data)
- `format` - Format identifier (e.g., "contra_costa", "alameda", "simple_csv")
- `importType` - "full" or "incremental"

**Benefits**:
- Clean API surface (1 endpoint vs 58+ endpoints)
- Easy to maintain and extend
- Consistent error handling
- Automatic validation based on format
- Format auto-detection support

### Component Structure

```
lib/importers/
├── types.ts              # Common types and interfaces
├── registry.ts           # Importer registry singleton
├── index.ts              # Auto-registration of all importers
├── simple-csv.ts         # Simple CSV importer
├── contra-costa.ts       # Contra Costa County importer
├── alameda.ts            # Alameda County importer (TODO)
├── los-angeles.ts        # Los Angeles County importer (TODO)
└── [58+ more formats]    # Additional format importers
```

## VoterImporter Interface

All importers must implement the `VoterImporter` interface:

```typescript
interface VoterImporter {
  // Metadata
  readonly formatId: string;              // e.g., "contra_costa"
  readonly formatName: string;            // e.g., "Contra Costa County"
  readonly description: string;           // Human-readable description
  readonly supportedExtensions: string[]; // e.g., ['.txt', '.tsv']
  readonly supportsIncremental: boolean;  // Can do incremental updates?
  
  // Core functionality
  importFile(options: VoterImportOptions): Promise<VoterImportResult>;
  
  // Optional
  validateFormat?(filePath: string): Promise<boolean>;
  getFormatHelp?(): string;
}
```

## How It Works

### 1. Registration (Startup)

When the app starts, all importers are automatically registered:

```typescript
// lib/importers/index.ts
import { importerRegistry } from './registry';
import { simpleCsvImporter } from './simple-csv';
import { contraCostaImporter } from './contra-costa';

importerRegistry.register(simpleCsvImporter);
importerRegistry.register(contraCostaImporter);
// ... register more as implemented
```

### 2. Format Selection (UI)

The UI fetches available formats:

```bash
GET /api/v1/voters/import
```

Response:
```json
{
  "success": true,
  "formats": [
    {
      "id": "simple_csv",
      "name": "Simple CSV",
      "description": "Basic CSV with firstname, lastname...",
      "supportedExtensions": [".csv"],
      "supportsIncremental": false
    },
    {
      "id": "contra_costa",
      "name": "Contra Costa County",
      "description": "Contra Costa County voter registration...",
      "supportedExtensions": [".txt", ".tsv"],
      "supportsIncremental": true
    }
  ],
  "count": 2
}
```

### 3. File Upload (Import)

The UI submits the file with format parameter:

```bash
POST /api/v1/voters/import
Content-Type: multipart/form-data

file: [binary data]
format: "contra_costa"
importType: "full"
```

### 4. Processing Flow

```
1. API validates request (auth, format exists, extensions)
2. API retrieves importer from registry: importerRegistry.get(format)
3. API saves file temporarily
4. API calls importer.importFile(options)
5. Importer processes file (streaming, parsing, database operations)
6. API returns result
7. API cleans up temp file
8. API logs to audit log
```

## Building Custom Modules

The import system is designed to be extensible, allowing you to add custom importers, validators, data transformers, and other modules without modifying core system code.

### Custom Importers

Custom importers enable you to support new voter file formats from different jurisdictions or data sources.

#### Step 1: Create Format Schema Documentation

Before implementing, document the file format specification:

```bash
# Create schema documentation
docs/developer/file-schemas/your-county.md
```

Include:
- Field definitions and types
- Required vs optional fields
- File format details (delimiter, encoding, etc.)
- Database mapping for each field
- Sample records and examples

See [basic-csv.md](./file-schemas/basic-csv.md) and [contra-costa.md](./file-schemas/contra-costa.md) for examples.

#### Step 2: Implement the VoterImporter Interface

```typescript
// lib/importers/alameda.ts
import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { 
  VoterImporter, 
  VoterImportOptions, 
  VoterImportResult 
} from './types';

const prisma = new PrismaClient();

/**
 * Alameda County Voter File Importer
 * 
 * File Format: CSV with 45 fields
 * Delimiter: Comma
 * Encoding: UTF-8
 */
export class AlamedaImporter implements VoterImporter {
  // Metadata (required)
  readonly formatId = 'alameda';
  readonly formatName = 'Alameda County';
  readonly description = 'Alameda County voter registration file (45 fields, CSV)';
  readonly supportedExtensions = ['.csv'];
  readonly supportsIncremental = true;
  
  /**
   * Import voter file
   */
  async importFile(options: VoterImportOptions): Promise<VoterImportResult> {
    const { filePath, importType, onProgress } = options;
    
    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];
    
    // Get required location types
    const locations = await this.getLocationTypes();
    if (!locations) {
      return {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        message: 'Location types not initialized. Run seed-locations first.',
      };
    }
    
    return new Promise((resolve) => {
      const parser = parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      
      const stream = createReadStream(filePath);
      stream.pipe(parser);
      
      parser.on('data', async (record: any) => {
        try {
          parser.pause();
          
          // Process individual record
          const result = await this.processRecord(record, importType, locations);
          
          if (result === 'created') created++;
          else if (result === 'updated') updated++;
          else if (result === 'skipped') skipped++;
          
          processed++;
          
          if (onProgress && processed % 100 === 0) {
            onProgress(processed, created + updated, errors.length);
          }
          
          parser.resume();
        } catch (error: any) {
          errors.push({
            row: processed + 1,
            message: error.message || 'Failed to process record',
          });
          processed++;
          parser.resume();
        }
      });
      
      parser.on('end', () => {
        resolve({
          success: errors.length === 0,
          processed,
          created,
          updated,
          skipped,
          errors: errors.length,
        });
      });
      
      parser.on('error', (error: Error) => {
        resolve({
          success: false,
          processed,
          created,
          updated,
          skipped,
          errors: errors.length + 1,
          message: error.message,
        });
      });
    });
  }
  
  /**
   * Validate file format (optional)
   */
  async validateFormat(filePath: string): Promise<boolean> {
    // Check for expected headers, field count, etc.
    // Return true if file matches this format
    return true;
  }
  
  /**
   * Get format help text (optional)
   */
  getFormatHelp(): string {
    return `
Alameda County Voter Registration File

Format: CSV (Comma-delimited)
Fields: 45 columns
Encoding: UTF-8
Typical file size: 800MB - 1.2GB

Obtained from: Alameda County Registrar of Voters
`.trim();
  }
  
  /**
   * Helper: Get location types
   */
  private async getLocationTypes() {
    const residence = await prisma.location.findUnique({ 
      where: { name: 'Residence' } 
    });
    const mailing = await prisma.location.findUnique({ 
      where: { name: 'Mailing' } 
    });
    const unknown = await prisma.location.findUnique({ 
      where: { name: 'Unknown' } 
    });
    
    if (!residence || !mailing || !unknown) return null;
    
    return { residence, mailing, unknown };
  }
  
  /**
   * Helper: Process individual record
   */
  private async processRecord(
    record: any, 
    importType: 'full' | 'incremental',
    locations: any
  ): Promise<'created' | 'updated' | 'skipped'> {
    // Implement your record processing logic here
    // 1. Extract and validate fields
    // 2. Look up existing voter (for incremental)
    // 3. Create/update Person record
    // 4. Create/update Voter record
    // 5. Create contact records (Address, Phone, Email)
    // 6. Create vote history records
    
    // Return 'created', 'updated', or 'skipped'
    return 'created';
  }
}

// Export singleton instance
export const alamedaImporter = new AlamedaImporter();
```

#### Step 3: Register the Importer

Add your importer to the registry:

```typescript
// lib/importers/index.ts
import { importerRegistry } from './registry';
import { simpleCsvImporter } from './simple-csv';
import { contraCostaImporter } from './contra-costa';
import { alamedaImporter } from './alameda';

// Register all importers
importerRegistry.register(simpleCsvImporter);
importerRegistry.register(contraCostaImporter);
importerRegistry.register(alamedaImporter);
```

That's it! The API endpoint automatically supports your new format.

#### Step 4: Add Tests

Create unit tests for your importer:

```typescript
// lib/importers/alameda.test.ts
import { alamedaImporter } from './alameda';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('AlamedaImporter', () => {
  beforeEach(async () => {
    // Seed test data
    await seedTestData();
  });
  
  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });
  
  it('should import sample file', async () => {
    const result = await alamedaImporter.importFile({
      filePath: 'test-data/alameda-sample.csv',
      importType: 'full',
    });
    
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThan(0);
    expect(result.errors).toBe(0);
  });
  
  it('should handle incremental imports', async () => {
    // First import
    await alamedaImporter.importFile({
      filePath: 'test-data/alameda-sample.csv',
      importType: 'full',
    });
    
    // Incremental update
    const result = await alamedaImporter.importFile({
      filePath: 'test-data/alameda-update.csv',
      importType: 'incremental',
    });
    
    expect(result.success).toBe(true);
    expect(result.updated).toBeGreaterThan(0);
  });
  
  it('should validate file format', async () => {
    const isValid = await alamedaImporter.validateFormat(
      'test-data/alameda-sample.csv'
    );
    expect(isValid).toBe(true);
  });
});
```

#### Best Practices for Custom Importers

1. **Use Streaming Parsers**
   - Don't load entire file into memory
   - Use `csv-parse` with streaming for CSV/TSV files
   - Process records one-at-a-time or in small batches

2. **Implement Progress Reporting**
   - Call `onProgress()` callback every 100-1000 records
   - Provide accurate counts for processed, created, updated, errors

3. **Handle Errors Gracefully**
   - Catch errors per-record, not per-file
   - Log detailed error information with row numbers
   - Continue processing after non-fatal errors

4. **Validate Data Early**
   - Check for required fields before database operations
   - Validate date formats, phone numbers, etc.
   - Return clear error messages

5. **Support Both Import Types**
   - Implement full import for initial data loads
   - Implement incremental import for updates (if format has unique IDs)
   - Document which types are supported

6. **Use Transactions Wisely**
   - Consider per-record transactions for better error isolation
   - Or batch transactions (100-1000 records) for better performance
   - Document your transaction strategy

7. **Document Your Format**
   - Create detailed schema documentation
   - Include field mappings and examples
   - Document data sources and typical file characteristics

8. **Test Thoroughly**
   - Test with sample files (small and large)
   - Test both import types
   - Test error conditions (malformed data, missing fields)
   - Test with real production data (if available)

### Custom Validators

Custom validators can be added to validate data before or during import.

```typescript
// lib/importers/validators/phone-validator.ts

export interface PhoneValidator {
  validate(phone: string): boolean;
  normalize(phone: string): string;
  getError(phone: string): string | null;
}

export class USPhoneValidator implements PhoneValidator {
  validate(phone: string): boolean {
    const normalized = this.normalize(phone);
    return /^\d{10}$/.test(normalized);
  }
  
  normalize(phone: string): string {
    // Remove all non-digits
    return phone.replace(/\D/g, '');
  }
  
  getError(phone: string): string | null {
    if (!this.validate(phone)) {
      return 'Phone number must be 10 digits';
    }
    return null;
  }
}

// Usage in importer
const phoneValidator = new USPhoneValidator();
const normalizedPhone = phoneValidator.normalize(record.PhoneNumber);
if (!phoneValidator.validate(normalizedPhone)) {
  console.warn(phoneValidator.getError(record.PhoneNumber));
}
```

### Custom Field Mappers

Create reusable field mapping utilities:

```typescript
// lib/importers/mappers/address-mapper.ts

export interface AddressComponents {
  houseNumber?: string;
  preDirection?: string;
  streetName?: string;
  streetSuffix?: string;
  postDirection?: string;
  unitAbbr?: string;
  unitNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  fullAddress: string;
}

export class AddressMapper {
  /**
   * Build full address from components
   */
  static buildFullAddress(components: Partial<AddressComponents>): string {
    const parts = [
      components.houseNumber,
      components.preDirection,
      components.streetName,
      components.streetSuffix,
      components.postDirection,
      components.unitAbbr && components.unitNumber 
        ? `${components.unitAbbr} ${components.unitNumber}`
        : null,
    ].filter(Boolean);
    
    return parts.join(' ');
  }
  
  /**
   * Parse address string into components
   */
  static parseAddress(address: string): Partial<AddressComponents> {
    // Implement address parsing logic
    // This is complex - consider using a library like 'usps-webtools' or 'node-address'
    return {
      fullAddress: address,
      // ... other components
    };
  }
  
  /**
   * Normalize address (uppercase, trim, fix abbreviations)
   */
  static normalize(address: string): string {
    return address
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/\bSTREET\b/g, 'ST')
      .replace(/\bAVENUE\b/g, 'AVE')
      .replace(/\bBOULEVARD\b/g, 'BLVD');
  }
}

// Usage in importer
const fullAddress = AddressMapper.buildFullAddress({
  houseNumber: record.HouseNumber,
  streetName: record.StreetName,
  city: record.City,
  state: record.State,
  zipCode: record.ZipCode,
});
```

### Custom Data Transformers

Build reusable data transformation utilities:

```typescript
// lib/importers/transformers/date-transformer.ts

export class DateTransformer {
  /**
   * Parse date in MM/DD/YYYY format
   */
  static parseUSDate(dateStr: string): Date | null {
    if (!dateStr || !dateStr.trim()) return null;
    
    try {
      const [month, day, year] = dateStr.trim().split('/');
      if (!month || !day || !year) return null;
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  /**
   * Parse date in YYYY-MM-DD format
   */
  static parseISODate(dateStr: string): Date | null {
    if (!dateStr || !dateStr.trim()) return null;
    
    try {
      const date = new Date(dateStr.trim());
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  /**
   * Format date for display
   */
  static format(date: Date, format: 'US' | 'ISO' = 'US'): string {
    if (format === 'ISO') {
      return date.toISOString().split('T')[0];
    }
    // US format: MM/DD/YYYY
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
}

// Usage in importer
const birthDate = DateTransformer.parseUSDate(record.BirthDate);
const registrationDate = DateTransformer.parseISODate(record.RegDate);
```

### Custom Export Formats

While the system focuses on importing, you may want to add custom export formats:

```typescript
// lib/exporters/types.ts

export interface VoterExporter {
  readonly formatId: string;
  readonly formatName: string;
  readonly description: string;
  readonly fileExtension: string;
  
  exportVoters(options: VoterExportOptions): Promise<VoterExportResult>;
}

export interface VoterExportOptions {
  outputPath: string;
  filters?: VoterFilters;
  fields?: string[];
  onProgress?: (processed: number, total: number) => void;
}

// lib/exporters/csv-exporter.ts
export class CsvExporter implements VoterExporter {
  readonly formatId = 'csv';
  readonly formatName = 'CSV Export';
  readonly description = 'Export voters to CSV format';
  readonly fileExtension = '.csv';
  
  async exportVoters(options: VoterExportOptions): Promise<VoterExportResult> {
    // Implement CSV export logic
    // Stream from database to file
  }
}
```

### Module Organization

Organize your custom modules for maintainability:

```
lib/
├── importers/
│   ├── types.ts                    # Core interfaces
│   ├── registry.ts                 # Importer registry
│   ├── index.ts                    # Registration
│   ├── simple-csv.ts               # Built-in importer
│   ├── contra-costa.ts             # Built-in importer
│   ├── your-county.ts              # Your custom importer
│   ├── validators/                 # Shared validators
│   │   ├── phone-validator.ts
│   │   ├── email-validator.ts
│   │   └── date-validator.ts
│   ├── mappers/                    # Field mappers
│   │   ├── address-mapper.ts
│   │   ├── name-mapper.ts
│   │   └── party-mapper.ts
│   └── transformers/               # Data transformers
│       ├── date-transformer.ts
│       ├── string-transformer.ts
│       └── phone-transformer.ts
├── exporters/                      # Export modules
│   ├── types.ts
│   ├── registry.ts
│   ├── csv-exporter.ts
│   └── your-format.ts
└── processors/                     # Data processors
    ├── deduplication.ts
    ├── geocoding.ts
    └── enrichment.ts
```

### Testing Custom Modules

Create comprehensive tests for your modules:

```typescript
// lib/importers/validators/phone-validator.test.ts
describe('USPhoneValidator', () => {
  const validator = new USPhoneValidator();
  
  it('validates 10-digit numbers', () => {
    expect(validator.validate('5551234567')).toBe(true);
    expect(validator.validate('(555) 123-4567')).toBe(true);
    expect(validator.validate('555-123-4567')).toBe(true);
  });
  
  it('rejects invalid numbers', () => {
    expect(validator.validate('123')).toBe(false);
    expect(validator.validate('invalid')).toBe(false);
  });
  
  it('normalizes phone numbers', () => {
    expect(validator.normalize('(555) 123-4567')).toBe('5551234567');
    expect(validator.normalize('555.123.4567')).toBe('5551234567');
  });
});
```

## Supported Formats

### Currently Implemented

1. **simple_csv** - Basic CSV with firstname/lastname ([detailed schema](./file-schemas/basic-csv.md))
2. **contra_costa** - Contra Costa County, 92 fields, tab-delimited ([detailed schema](./file-schemas/contra-costa.md))

### Planned (58+ California Counties)

- Alameda County
- Los Angeles County
- San Francisco County
- San Diego County
- Orange County
- Sacramento County
- Fresno County
- San Bernardino County
- Riverside County
- Santa Clara County
- [48+ more counties...]

## Import Types

### Full Import

- Replaces all voter data
- Clears existing contact info and vote history
- Use when receiving complete voter file

### Incremental Import

- Updates existing voters only
- Matches by `registrationNumber` or `externalVoterId`
- Preserves manual edits
- Use for periodic updates

**Note**: Not all formats support incremental imports. Check `supportsIncremental` flag.

## Data Model

### Voter Record

```typescript
{
  // Identity
  firstName: string
  lastName: string
  middleName?: string
  externalId?: string        // County registration number
  externalVoterId?: string   // County voter ID
  
  // Demographics
  gender?: string
  birthDate?: Date
  partyAffiliation?: string
  
  // Metadata
  importedFrom: string       // Format ID
  importType: 'full' | 'incremental'
  importFormat: string       // Format ID
}
```

### Contact Info (Separate Records)

```typescript
{
  voterId: string
  locationId: string         // Reference to Location type
  
  // Address components
  houseNumber?: string
  streetName?: string
  city?: string
  zipCode?: string
  fullAddress?: string
  
  // Other contact
  phone?: string
  email?: string
  
  isPrimary: boolean
  isVerified: boolean
}
```

### Vote History (Separate Records)

```typescript
{
  voterId: string
  electionDate: Date
  electionDesc?: string
  ballotCounted: boolean
  votingMethod?: string
}
```

## Progress Tracking

Import progress can be tracked via callback:

```typescript
await importer.importFile({
  filePath: '/path/to/file',
  importType: 'full',
  format: 'contra_costa',
  onProgress: (processed, total, errors) => {
    console.log(`Processed: ${processed}, Errors: ${errors}`);
    // TODO: Send updates via WebSocket or SSE
  },
});
```

## Error Handling

### Import Errors

The importer returns detailed error information:

```typescript
{
  success: false,
  processed: 1000,
  created: 950,
  updated: 0,
  skipped: 25,
  errors: 25,
  errorDetails: [
    { row: 42, field: 'firstName', message: 'Missing required field' },
    { row: 123, message: 'Duplicate voter record' }
  ]
}
```

### Validation Errors

The API validates before processing:
- Format exists in registry
- File extension matches format
- Incremental support (if requested)
- Authentication/authorization

## Testing

### Unit Tests

Test individual importers:

```typescript
import { alamedaImporter } from '@/lib/importers/alameda';

test('imports alameda format', async () => {
  const result = await alamedaImporter.importFile({
    filePath: 'test-data/alameda-sample.csv',
    importType: 'full',
    format: 'alameda',
  });
  
  expect(result.success).toBe(true);
  expect(result.processed).toBe(100);
});
```

### Integration Tests

Test the full API flow:

```typescript
import { POST } from '@/app/api/v1/voters/import/route';

test('imports via API', async () => {
  const formData = new FormData();
  formData.append('file', fileBlob);
  formData.append('format', 'alameda');
  formData.append('importType', 'full');
  
  const response = await POST(mockRequest(formData));
  const result = await response.json();
  
  expect(result.success).toBe(true);
});
```

## Future Enhancements

1. **Job Queue Integration** - Run large imports as background jobs
2. **WebSocket Progress** - Real-time progress updates in UI
3. **Auto-detection** - Automatically detect format from file structure
4. **Dry Run Mode** - Validate file without importing
5. **Mapping UI** - Visual field mapping for custom formats
6. **Import Templates** - Save custom format mappings
7. **Rollback Support** - Ability to undo imports
8. **Conflict Resolution** - UI for resolving duplicate/conflict records

## Performance

### Streaming Parser

All importers use streaming parsers (csv-parse) to handle large files:
- Memory efficient (doesn't load entire file)
- Processes records one-at-a-time
- Supports files 500MB - 2GB+

### Batch Processing

Consider batching database operations:

```typescript
const batch = [];
parser.on('data', async (record) => {
  batch.push(record);
  
  if (batch.length >= 100) {
    await processBatch(batch);
    batch.length = 0;
  }
});
```

## Security

- **Authentication Required** - All imports require valid session
- **Audit Logging** - All imports logged with user, format, results
- **File Validation** - Extensions and format validation before processing
- **Temp File Cleanup** - Uploaded files deleted after processing
- **Rate Limiting** - Consider adding rate limits for large imports

## See Also

### File Format Schemas

For detailed specifications of supported voter file formats:

- [Basic CSV Format](./file-schemas/basic-csv.md) - Simple voter file with firstname/lastname and optional contact fields
- [Contra Costa County Format](./file-schemas/contra-costa.md) - Complete 92-field county voter registration file

### Related Documentation

- [Database Schema Master](./DATABASE_SCHEMA_MASTER.md) - Complete database schema reference
- [Voter File Formats Overview](./VOTER_FILE_FORMATS.md) - Overview of all supported formats and import types

## Conclusion

This architecture provides a scalable, maintainable way to support 58+ different voter file formats through a single unified API. Adding new formats is as simple as implementing the interface and registering the importer.
