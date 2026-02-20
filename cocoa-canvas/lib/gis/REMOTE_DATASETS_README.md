# Remote GIS Datasets

Remote GIS Datasets provide a way to discover, catalog, and reference external GIS services (e.g., ArcGIS MapServers) without needing to import all their data upfront.

## Architecture

### Models

**RemoteGISDataset**
- Stores references to external ArcGIS services and their layers
- Tracks service metadata: URL, layer ID, geometry type, spatial reference
- Links to imported catalog datasets via `importedDatasetId`
- Fields stored as JSON for flexibility

**GISDataset** (Enhanced)
- New field: `sourceRemoteDatasetId` - optional link to a RemoteGISDataset
- New field: `sourceRemoteDataset` - relation to RemoteGISDataset
- Allows catalog datasets to source from remote services without full import

### Workflow

```
Map Explorer
     ↓
[User discovers layer in ArcGIS service]
     ↓
Save as RemoteGISDataset
(POST /api/v1/gis/remote-datasets)
     ↓
[User clicks "Import to Catalog"]
     ↓
Create GISDataset linked to RemoteGISDataset
(POST /api/v1/gis/remote-datasets/import)
     ↓
Dataset available in catalog for syncing to app models
```

## API Endpoints

### POST /api/v1/gis/remote-datasets
Discover and save a remote layer as a RemoteGISDataset.

**Request Body:**
```json
{
  "serviceUrl": "https://gis.cccounty.us/arcgis/rest/services/CCMAP/Assessment_Parcels_ArcPro/MapServer",
  "layerId": 0,
  "layerName": "Assessment Parcels",
  "layerType": "Feature Layer",
  "geometryType": "esriGeometryPolygon",
  "serviceType": "MapServer",
  "serviceTitle": "Assessment Parcels ArcPro",
  "layerDescription": "County assessment parcels...",
  "fields": [...],
  "spatialReference": {
    "wkid": 4326,
    "latestWkid": 4326
  },
  "extent": {
    "xmin": -122.5,
    "ymin": 37.5,
    "xmax": -121.5,
    "ymax": 38.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "remote_abc123",
    "serviceUrl": "https://gis.cccounty.us/...",
    "layerId": 0,
    "layerName": "Assessment Parcels",
    "createdAt": "2026-02-18T...",
    "createdById": "user_123"
  }
}
```

### GET /api/v1/gis/remote-datasets
List discovered remote datasets (with optional filters).

**Query Parameters:**
- `serviceUrl` - Filter by service URL
- `layerId` - Filter by layer ID
- `accessible` - Filter by accessibility (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "remote_abc123",
      "serviceUrl": "...",
      "layerId": 0,
      "layerName": "Assessment Parcels",
      "importedDataset": {
        "id": "gis_123",
        "name": "Assessment Parcels Catalog"
      },
      "createdBy": {
        "email": "user@example.com"
      }
    }
  ]
}
```

### POST /api/v1/gis/remote-datasets/import
Import a remote dataset into the catalog.

**Request Body:**
```json
{
  "remoteDatasetId": "remote_abc123",
  "catalogName": "Assessment Parcels Catalog",
  "catalogDescription": "Synced from county GIS service",
  "datasetTypeId": "type_parcels",
  "tags": ["parcels", "county", "assessment"],
  "category": "Property",
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "catalogDataset": {
      "id": "gis_123",
      "name": "Assessment Parcels Catalog",
      "sourceRemoteDatasetId": "remote_abc123"
    },
    "remoteDataset": {
      "id": "remote_abc123",
      "importedDatasetId": "gis_123"
    }
  }
}
```

## Usage in Map Explorer

1. User explores a map using the map explorer tool
2. User clicks on a layer in the explorer to view its details
3. A button "Add to Catalog" appears  
4. Clicking triggers an API call to save the remote layer
5. User fills in catalog metadata (name, type, description, tags)
6. Remote layer is now imported and linked in the catalog

## Example Flow

```javascript
// 1. Discover layer from explorer
const layer = {
  serviceUrl: "https://gis.cccounty.us/arcgis/rest/services/CCMAP/Assessment_Parcels_ArcPro/MapServer",
  layerId: 0,
  layerName: "Assessment Parcels",
  geometryType: "esriGeometryPolygon"
};

// 2. Save as remote dataset
const remoteResponse = await fetch('/api/v1/gis/remote-datasets', {
  method: 'POST',
  body: JSON.stringify(layer)
});
const remoteDataset = await remoteResponse.json();

// 3. Import to catalog
const importResponse = await fetch('/api/v1/gis/remote-datasets/import', {
  method: 'POST',
  body: JSON.stringify({
    remoteDatasetId: remoteDataset.data.id,
    catalogName: "County Assessment Parcels",
    datasetTypeId: "type_parcels",
    category: "Property"
  })
});
```

## Benefits

- **Lazy Loading**: Don't import all data upfront, reference remote services
- **Dynamic Discovery**: Users can find and catalog services through the explorer
- **Metadata Tracking**: Store field definitions, extent, and other metadata without full import
- **Linking**: Multiple catalog datasets can reference the same remote service
- **Auditability**: Track which user discovered each remote dataset and when

## Future Enhancements

- Schedule periodic sync of remote metadata
- Cache remote service responses
- Allow partial imports (selected fields/features)
- Version tracking for remote dataset metadata changes
- Bulk remote dataset discovery from service catalogs
