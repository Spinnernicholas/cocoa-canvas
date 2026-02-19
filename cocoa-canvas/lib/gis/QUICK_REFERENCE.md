# Map Explorer & Remote GIS Dataset - Quick Reference

## Quick Start for Developers

### Feature Overview
Discover layers from public ArcGIS Web Apps → Import to Cocoa Canvas catalog as remote GIS datasets

### Key Files
| File | Purpose |
|------|---------|
| `app/gis/explorer/page.tsx` | Main explorer UI with import integration |
| `components/ImportToCatalogDialog.tsx` | Import form modal dialog |
| `app/api/v1/gis/explore-map/route.ts` | Layer discovery engine |
| `app/api/v1/gis/layer-details/route.ts` | Layer metadata fetcher |
| `app/api/v1/gis/dataset-types/route.ts` | Dataset type listing |
| `app/api/v1/gis/remote-datasets/route.ts` | Remote dataset management |
| `app/api/v1/gis/remote-datasets/import/route.ts` | Catalog import handler |
| `prisma/schema.prisma` | RemoteGISDataset model |
| `lib/gis/IMPORT_WORKFLOW.md` | User workflow documentation |
| `lib/gis/REMOTE_DATASETS_README.md` | API documentation |
| `lib/gis/REMOTE_DATASETS_IMPLEMENTATION.md` | Implementation details |
| `lib/gis/IMPLEMENTATION_COMPLETE.md` | Completion summary |

### API Endpoints

```typescript
// Discover layers from ArcGIS Web App
GET /api/v1/gis/explore-map?url=...

// Get layer details
GET /api/v1/gis/layer-details?url=...&layerId=...

// Get available dataset types
GET /api/v1/gis/dataset-types

// Save discovered layer as remote dataset
POST /api/v1/gis/remote-datasets
Body: { serviceUrl, layerId, layerName, layerType, geometryType }

// Import remote dataset to catalog
POST /api/v1/gis/remote-datasets/import
Body: { remoteDatasetId, catalogName, datasetTypeId, ... }

// List remote datasets
GET /api/v1/gis/remote-datasets?filters...
```

### Component Props

```typescript
// ImportToCatalogDialog
<ImportToCatalogDialog
  isOpen={boolean}
  onClose={() => void}
  onImport={(data) => Promise<void>}
  layerName={string}
  serviceUrl={string}
  layerId={number}
  datasetTypes={Array<{id, name}>}
  isLoading={boolean}
/>
```

### Database Models

```typescript
// RemoteGISDataset
model RemoteGISDataset {
  id                   String   @id @default(cuid())
  serviceUrl           String   // Service endpoint URL
  layerId              Int      // ArcGIS layer ID
  layerName            String   // Display name
  layerType            String?  // Type from service
  geometryType         String?  // Geometry type
  fields               Json?    // Field definitions
  spatialReference     Json?    // Coordinate system
  extent               Json?    // Bounding box
  srid                 Int?     // EPSG code
  description          String?  // User notes
  
  createdById          String
  createdBy            User     @relation(fields: [createdById], references: [id])
  
  importedDatasetId    String?
  importedDataset      GISDataset? @relation(fields: [importedDatasetId], references: [id])
  
  isAccessible         Boolean  @default(true)
  
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([serviceUrl, layerId])
  @@index([importedDatasetId])
  @@index([isAccessible])
  @@index([createdAt])
}
```

### State Management Pattern

```typescript
// In explorer page component
const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
const [selectedNode, setSelectedNode] = useState<LayerTreeNode | null>(null);
const [selectedServiceUrl, setSelectedServiceUrl] = useState<string | null>(null);
const [importDialogOpen, setImportDialogOpen] = useState(false);
const [datasetTypes, setDatasetTypes] = useState<Array<{id, name}>>([]);
const [importLoading, setImportLoading] = useState(false);
const [importSuccess, setImportSuccess] = useState<string | null>(null);

// Fetch dataset types on mount
useEffect(() => {
  const fetchDatasetTypes = async () => {
    const response = await fetch('/api/v1/gis/dataset-types');
    const data = await response.json();
    setDatasetTypes(data.data);
  };
  fetchDatasetTypes();
}, []);
```

### Workflow Handlers

```typescript
// Step 1: User selects layer
const handleSelectNode = async (node: LayerTreeNode) => {
  setSelectedNode(node);
  setSelectedServiceUrl(service._serviceUrl);
  // Fetch layer details...
};

// Step 2: User clicks "Add to Catalog"
const handleOpenImportDialog = async () => {
  // Optionally save remote dataset first
  setImportDialogOpen(true);
};

// Step 3: User submits import form
const handleImportToCatalog = async (formData) => {
  // 1. Save as RemoteGISDataset
  // 2. Import to catalog as GISDataset
  // 3. Show success
};
```

### Error Handling Pattern

```typescript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  
  // Use data.data or data.result
} catch (err) {
  console.error('Error:', err);
  setError(err instanceof Error ? err.message : 'An error occurred');
}
```

### Testing Quick Checklist

```bash
# 1. Test discovery endpoint
curl http://localhost:3000/api/v1/gis/explore-map?url=... \
  -H "Authorization: Bearer TOKEN"

# 2. Test dataset types
curl http://localhost:3000/api/v1/gis/dataset-types \
  -H "Authorization: Bearer TOKEN"

# 3. Test remote dataset save
curl -X POST http://localhost:3000/api/v1/gis/remote-datasets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "serviceUrl": "...",
    "layerId": 0,
    "layerName": "Test"
  }'

# 4. Test import
curl -X POST http://localhost:3000/api/v1/gis/remote-datasets/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "remoteDatasetId": "...",
    "catalogName": "Test Import",
    "datasetTypeId": "..."
  }'
```

### Common Tasks

#### Add New dataset Type
1. Create DatasetType record in database
2. Available at GET `/api/v1/gis/dataset-types`
3. Automatically appears in import dialog dropdown

#### Add Support for New Service Type
1. Update `extractServiceUrls()` in explore-map/route.ts
2. Add new regex pattern for service URL detection
3. Implement `fetch${ServiceType}Hierarchy()` function
4. Add to `fetchMapConfiguration()` orchestrator

#### Handle New ArcGIS Service Feature
1. Add to RemoteGISDataset schema if needed
2. Update layer hierarchy builder function
3. Display in layer details panel
4. Add to form if user-configurable via import dialog

#### Debug Import Failures
1. Check browser Network tab for API responses
2. Look for 401 (auth) or 400 (validation) errors
3. Verify dataset type ID exists
4. Check service URL is still valid
5. Review server logs for detailed errors

### Style Conventions

```typescript
// Colors (Tailwind)
Primary:      cocoa-600, cocoa-700, cocoa-800, cocoa-900
Secondary:   cinnamon-600, cinnamon-700
Light:       cocoa-50, cocoa-100
Dark mode:   dark:cocoa-800, dark:cocoa-900, dark:text-white

// CSS Classes
Container:    max-w-6xl mx-auto
Heading:      text-2xl font-bold text-cocoa-900 dark:text-white
Button:       bg-cocoa-600 hover:bg-cocoa-700 text-white rounded
Input:        border border-cocoa-300 dark:border-cocoa-600 rounded
Alert:        bg-red-50 dark:bg-red-900 border border-red-200 rounded
```

### Performance Tips

1. **Cache dataset types** in local state after initial fetch
2. **Lazy load layer details** - fetch only when user selects them
3. **Use service hierarchy cache** - don't refetch same service
4. **Index remote datasets** correctly - use unique(serviceUrl, layerId)
5. **Batch API calls** for multiple remote service queries

### Security Reminders

- ✅ Always use `validateProtectedRoute()` on new endpoints
- ✅ Never store service credentials
- ✅ Sanitize all user inputs (form validation)
- ✅ Mark sensitive data with `@sensitive` comments
- ✅ Log security actions via auditLog()
- ✅ Use existing permission model for datasets

### Related Features

- Map visualization: `app/campaign/map/page.tsx`
- GIS Catalog: `app/maps/page.tsx`
- Dataset search: `PeopleSearch.tsx` (similar pattern)
- Job system: For long-running imports if added
- Audit logging: `lib/audit/logger.ts`

### Documentation References

1. **IMPORT_WORKFLOW.md** - User & feature documentation
2. **REMOTE_DATASETS_README.md** - API reference
3. **REMOTE_DATASETS_IMPLEMENTATION.md** - Technical details
4. **IMPLEMENTATION_COMPLETE.md** - Completion checklist

### Troubleshooting Links

- Can't load layers? Check service is public + CORS
- Import dialog won't open? Verify layer selection persists
- Form validation failing? Check required fields
- API returning 401? Verify auth token + validateProtectedRoute()
- Dark mode issues? Check dark: prefixes in Tailwind classes
