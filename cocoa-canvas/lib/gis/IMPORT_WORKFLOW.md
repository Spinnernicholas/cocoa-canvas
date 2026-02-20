# Map Explorer Import Workflow

## Overview

The Map Explorer now includes a complete workflow for discovering layers from ArcGIS maps and importing them into the Cocoa Canvas GIS catalog. This document describes the user-facing workflow and technical implementation.

## User Workflow

### 1. Opening the Map Explorer

Navigate to the Map Explorer page from the main dashboard. The explorer supports any public ArcGIS Web App URL.

### 2. Exploring Layers

1. Paste an ArcGIS Web App URL into the input field
2. Click "Explore Map" to discover all layers and services
3. The explorer dynamically:
   - Extracts service URLs from the Web Map configuration
   - Queries each MapServer/FeatureServer endpoint
   - Builds a hierarchical tree of layers with parent-child relationships
   - Groups layers by their source service

### 3. Viewing Layer Details

1. Click on any layer in the hierarchy to view its details
2. The details panel shows:
   - Layer name, type, and geometry type
   - Description (if available)
   - Spatial extent (bounding box)
   - Sub-layers and their properties
   - Copyright information
   - Raw service response (expandable)

### 4. Importing to Catalog

1. With a layer selected, click the **"➕ Add to Catalog"** button
2. A dialog appears with the following form fields:
   - **Catalog Dataset Name** (required) - How to name this dataset in the catalog
   - **Description** (optional) - Details about the dataset
   - **Dataset Type** (required) - Category/classification (e.g., "Parcel Data", "Demographics")
   - **Tags** (optional) - Comma-separated keywords for searching
   - **Category** (optional) - Organizational category (e.g., "Property", "Political")
   - **Public** (optional toggle) - Whether other users can access this dataset

3. Fill in the form and click **"Import to Catalog"**
4. The system:
   - Saves the layer as a RemoteGISDataset (tracking the remote service)
   - Creates a GISDataset in your catalog linked to the remote dataset
   - Shows a success message confirming the import

### 5. Using Imported Datasets

Once imported, the dataset appears in your GIS catalog with:
- A link to the remote service (for updating/refreshing)
- All metadata you provided (name, description, tags, category)
- Access controls based on the public flag
- Full integration with other Cocoa Canvas features

## Technical Architecture

### Components

#### ImportToCatalogDialog (`components/ImportToCatalogDialog.tsx`)
- React functional component using hooks
- Manages form state (name, description, type, tags, category, public)
- Input validation with user-friendly error messages
- Loading state during import
- Dark mode support with cocoa theme

**Props:**
```typescript
interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportRemoteDatasetRequest) => Promise<void>;
  layerName: string;
  serviceUrl: string;
  layerId: number;
  datasetTypes: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}
```

#### Map Explorer Page (`app/gis/explorer/page.tsx`)
Enhanced with import integration:
- Fetches available dataset types on mount
- Tracks selected service URL when layer is selected
- Manages import dialog visibility
- Handles complete import workflow
- Shows success messages to user

### API Endpoints

#### GET `/api/v1/gis/dataset-types`
Returns list of available dataset types for import dropdown.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "type-1", "name": "Parcel Data", "description": "Property parcels" },
    { "id": "type-2", "name": "Demographics", "description": "Population data" }
  ]
}
```

#### POST `/api/v1/gis/remote-datasets`
Saves a discovered layer as a RemoteGISDataset.

**Request:**
```json
{
  "serviceUrl": "https://server.com/arcgis/rest/services/...",
  "layerId": 0,
  "layerName": "Assessment Parcels",
  "layerType": "Feature Layer",
  "geometryType": "esriGeometryPolygon"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "remote_abc123",
    "serviceUrl": "...",
    "layerId": 0,
    "layerName": "Assessment Parcels",
    "createdAt": "2025-02-20T10:30:00Z"
  }
}
```

#### POST `/api/v1/gis/remote-datasets/import`
Imports a RemoteGISDataset into the catalog as a GISDataset.

**Request:**
```json
{
  "remoteDatasetId": "remote_abc123",
  "catalogName": "County Assessment Parcels",
  "catalogDescription": "2024 parcel assessment data",
  "datasetTypeId": "type-1",
  "tags": ["parcel", "assessment", "county"],
  "category": "Property",
  "isPublic": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gisDataset": { "id": "dataset_xyz", "name": "County Assessment Parcels" },
    "remoteDataset": { "id": "remote_abc123", "serviceUrl": "..." }
  }
}
```

### Data Flow

```
User opens explorer
    ↓
Pastes ArcGIS URL
    ↓
Clicks "Explore Map"
    ├→ Extract service URLs from Web Map
    ├→ Query each MapServer/FeatureServer
    └→ Build hierarchical layer structure
    ↓
User clicks layer in tree
    ├→ Fetch layer details from service
    └→ Show in details panel
    ↓
User clicks "Add to Catalog"
    ├→ Open ImportToCatalogDialog
    └→ Show dataset types
    ↓
User fills form and submits
    ├→ POST /api/v1/gis/remote-datasets (save remote reference)
    ├→ POST /api/v1/gis/remote-datasets/import (link to catalog)
    └→ Show success message
    ↓
Dataset appears in catalog
    └→ Ready to use in Cocoa Canvas
```

## Feature Highlights

### Dynamic Discovery
- No hard-coded layers or services
- Automatically discovers all MapServer/FeatureServer endpoints
- Builds complete hierarchies with parent-child relationships
- Supports 5+ simultaneous services from a single Web App

### Metadata Preservation
- Stores service URL, layer ID, geometry type, and layer type
- Links to the remote service for tracking data source
- Tracks who imported the dataset and when
- Optional public/private access control

### User-Friendly Interface
- Dark mode support throughout
- Intuitive layer tree with expand/collapse
- Form validation with helpful error messages
- Loading states and success confirmation
- Cocoa/cinnamon color theme matching Cocoa Canvas brand

### Database Integration
- `RemoteGISDataset` table tracks all remote layer references
- `GISDataset.sourceRemoteDataset` links catalog datasets to remote sources
- Bidirectional relationship for tracking imports
- Indexes for fast lookups by service URL and layer ID
- Audit tracking (creator, timestamps)

## Error Handling

The import workflow handles several error scenarios:

### Import Dialog Errors
- Required field validation (shows field-specific errors)
- Form submission errors (network, server responses)
- Loading/retry support

### API Errors
- Remote dataset save failures (duplicate checking, validation)
- Import to catalog failures (missing types, permissions)
- Service endpoint failures (network timeouts, 404s)

### User Feedback
- Inline error messages in dialog
- Toast notifications for import completion
- Success/error states clearly indicated
- Stack traces logged to console for debugging

## Future Enhancements

### Planned Features
1. **Metadata Refresh** - Update dataset metadata from remote service
2. **Bulk Import** - Select multiple layers and import in one operation
3. **Layer Preview Map** - Show layer extent and features on a map
4. **Sync with Remote** - Keep catalog dataset in sync with remote service
5. **Field Mapping** - Customize which service fields are available in catalog
6. **Schedule Refresh** - Automatic periodic updates from remote service

### Possible Extensions
- Import from other sources (WFS, vector tiles, raster endpoints)
- Layer comparison and versioning
- Service health monitoring
- Layer usage analytics and adoption tracking
- Import templates for common datasets

## Security & Permissions

### Authentication
- All import endpoints require user authentication
- Tracked by user ID for audit purposes

### Authorization
- Users can only import to catalogs they have access to
- Public datasets can be shared across team

### Data Privacy
- Remote dataset URLs stored securely in database
- Sensitive service credentials never stored
- Service access remains read-only via REST endpoints

## Testing

### Manual Testing Checklist
- [ ] Open explorer with sample ArcGIS Web App
- [ ] Verify layer hierarchy displays correctly
- [ ] Click layer and view details
- [ ] Click "Add to Catalog" button
- [ ] Verify form validation (try submitting empty)
- [ ] Fill form and submit
- [ ] Verify success message appears
- [ ] Check dataset appears in catalog
- [ ] Verify links to remote service work
- [ ] Test dark mode appearance

### API Testing
```bash
# Get dataset types
curl -H "Authorization: Bearer $TOKEN" \
  https://app.example.com/api/v1/gis/dataset-types

# Save remote dataset
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceUrl": "https://...",
    "layerId": 0,
    "layerName": "Test Layer"
  }' \
  https://app.example.com/api/v1/gis/remote-datasets

# Import to catalog
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remoteDatasetId": "remote_...",
    "catalogName": "My Dataset",
    "datasetTypeId": "type-1"
  }' \
  https://app.example.com/api/v1/gis/remote-datasets/import
```

## Troubleshooting

### Dialog Won't Open
- Check that a layer is selected (selection persists when clicking details panel)
- Verify dataset types are loading (check browser console for fetch errors)
- Ensure authentication token is valid

### Import Fails
- Verify catalog name is unique or matches existing dataset
- Check that dataset type ID exists in system
- Ensure service URL is still accessible
- Look at API response in browser DevTools

### Layers Not Appearing
- Confirm ArcGIS Web App URL is public/accessible
- Check service endpoints are not blocked by CORS
- Verify service URL format is recognized (MapServer, FeatureServer)

## See Also

- [REMOTE_DATASETS_README.md](./REMOTE_DATASETS_README.md) - API and backend documentation
- [REMOTE_DATASETS_IMPLEMENTATION.md](./REMOTE_DATASETS_IMPLEMENTATION.md) - Technical implementation details
- [app/gis/explorer/page.tsx](../../../app/gis/explorer/page.tsx) - Explorer component code
- [components/ImportToCatalogDialog.tsx](../../../components/ImportToCatalogDialog.tsx) - Dialog component code
