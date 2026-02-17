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

## Creating a New Importer

### Step 1: Implement the Interface

```typescript
// lib/importers/alameda.ts
import { VoterImporter, VoterImportOptions, VoterImportResult } from './types';

export class AlamedaImporter implements VoterImporter {
  readonly formatId = 'alameda';
  readonly formatName = 'Alameda County';
  readonly description = 'Alameda County voter registration file';
  readonly supportedExtensions = ['.csv'];
  readonly supportsIncremental = true;
  
  async importFile(options: VoterImportOptions): Promise<VoterImportResult> {
    // Your import logic here
    // Parse file, create/update voters, return results
  }
  
  async validateFormat(filePath: string): Promise<boolean> {
    // Optional: Validate file matches this format
  }
  
  getFormatHelp(): string {
    return 'Help text for Alameda format';
  }
}

export const alamedaImporter = new AlamedaImporter();
```

### Step 2: Register It

```typescript
// lib/importers/index.ts
import { alamedaImporter } from './alameda';

importerRegistry.register(alamedaImporter);
```

That's it! The endpoint automatically supports the new format.

## Supported Formats

### Currently Implemented

1. **simple_csv** - Basic CSV with firstname/lastname
2. **contra_costa** - Contra Costa County (92 fields, tab-delimited)

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

## Conclusion

This architecture provides a scalable, maintainable way to support 58+ different voter file formats through a single unified API. Adding new formats is as simple as implementing the interface and registering the importer.
