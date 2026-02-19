# Map/Endpoint Explorer

A comprehensive tool for exploring and analyzing ArcGIS map services and applications.

## Features

### 🎯 Core Functionality

- **Map Configuration Parser**: Automatically extracts all layers from public ArcGIS Web App URLs
- **Layer Details Viewer**: Query ArcGIS REST API endpoints to get detailed layer information
- **Interactive UI**: Browse layers, view metadata, and copy service URLs
- **Support for Multiple Service Types**: MapService, FeatureService, Vector Tile Layers, and more

### 📍 Supported Map Types

- ArcGIS Web AppBuilder applications
- ArcGIS Web App Viewer
- ArcGIS Dashboards with embedded maps
- Web Maps with multiple layer services

## Usage

### Access the Explorer

Once logged in to Cocoa Canvas, click the **🔍 Explore** link in the top navigation bar, or visit:

```
/gis/explorer
```

### Basic Workflow

1. **Enter a Map URL**
   - Paste a public ArcGIS Web App URL
   - Example: `https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18`

2. **Load the Map Configuration**
   - Click "Explore Map"
   - The tool will fetch and parse all layers

3. **Browse Layers**
   - **Operational Layers**: Primary data layers shown on the map
   - **Base Layers**: Background/basemap layers
   - Each layer shows:
     - Title and type
     - Service endpoint URL (REST API)
     - Visibility and opacity settings
     - Geometry type (for feature layers)

4. **View Layer Details**
   - Click any layer to expand detailed information
   - See layer metadata, sub-layers, and extent
   - View raw JSON response from the service

5. **Copy Service URLs**
   - Use "Copy URL" buttons to get REST endpoint URLs
   - Paste directly into your applications or tools

## API Endpoints

### Explore Map Configuration

```
GET /api/v1/gis/explore-map?url={mapUrl}
POST /api/v1/gis/explore-map
```

**Parameters:**
- `url` (required): Full ArcGIS Web App URL
- OR `itemId` (required): Item ID of the map/app

**Response:**
```json
{
  "success": true,
  "mapTitle": "Contra Costa County Map",
  "portalUrl": "https://cocogis.maps.arcgis.com",
  "operationalLayers": [
    {
      "id": "layer-123",
      "title": "Assessment Parcels",
      "url": "https://gis.cccounty.us/arcgis/rest/services/CCMAP/Assessment_Parcels_ArcPro/MapServer/0",
      "type": "ArcGISMapServiceLayer",
      "visible": true,
      "geometryType": "esriGeometryPolygon"
    }
  ],
  "baseLayers": [...]
}
```

### Get Layer Details

```
GET /api/v1/gis/layer-details?url={serviceUrl}&layerId={layerId}
POST /api/v1/gis/layer-details
```

**Parameters:**
- `url` (required): ArcGIS service URL (MapServer or FeatureService)
- `layerId` (optional): Specific layer ID to query

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Assessment Parcels",
    "description": "Parcel boundaries...",
    "extent": {
      "xmin": -13660440.4,
      "ymin": 4520240.8,
      "xmax": -13495336.4,
      "ymax": 4611965.3,
      "spatialReference": { "wkid": 3857 }
    },
    "layers": [
      {
        "id": 0,
        "name": "Assessment Parcels",
        "type": "Feature Layer",
        "geometryType": "esriGeometryPolygon",
        "fields": [...]
      }
    ]
  }
}
```

## Examples

### Using with cURL

```bash
# Get all layers from a map
curl "http://localhost:3000/api/v1/gis/explore-map?url=https://www.arcgis.com/apps/webappviewer/index.html?id=..."

# Get details from a specific service
curl "http://localhost:3000/api/v1/gis/layer-details?url=https://gis.cccounty.us/arcgis/rest/services/CCMAP/Assessment_Parcels_ArcPro/MapServer"
```

### Using with JavaScript/Fetch

```javascript
// Explore a map
async function exploreMap(mapUrl) {
  const response = await fetch(`/api/v1/gis/explore-map?url=${encodeURIComponent(mapUrl)}`);
  const data = await response.json();
  console.log('Map layers:', data.operationalLayers);
}

// Get layer details
async function getLayerDetails(serviceUrl) {
  const response = await fetch(`/api/v1/gis/layer-details?url=${encodeURIComponent(serviceUrl)}`);
  const data = await response.json();
  console.log('Layer info:', data.data);
}
```

### Using with Python

```python
import requests

# Explore a map
response = requests.get(
    'http://localhost:3000/api/v1/gis/explore-map',
    params={'url': 'https://www.arcgis.com/apps/webappviewer/index.html?id=...'}
)
layers = response.json()['operationalLayers']

# Get layer details
for layer in layers:
    response = requests.get(
        'http://localhost:3000/api/v1/gis/layer-details',
        params={'url': layer['url']}
    )
    details = response.json()
    print(f"{layer['title']}: {details['data']['description']}")
```

## Use Cases

### 📚 Documentation
- Extract layer information for documentation generation
- Create API catalogs from existing maps
- Track available services

### 🔄 Data Integration
- Find specific layer endpoints for integration projects
- Identify available feature layers for your applications
- Cross-reference service URLs

### 🎨 Map Customization
- Identify which layers are available on a public map
- Get layer IDs and service information
- Plan custom applications based on existing services

### 📊 GIS Inventory
- Create an inventory of available mapping services
- Understand the layer hierarchy in complex maps
- Document service capabilities and extent

## Features in Development

- Cache parsed map configurations for faster access
- Advanced filtering by layer type or geometry
- RESTful layer query interface
- Feature layer property explorer
- Service capability comparison tools
- Spatial reference transformation utilities

## Security Notes

- Only works with **public** ArcGIS services
- No authentication required (uses public REST APIs)
- Does not modify any data
- All requests go through Cocoa Canvas backend for security

## Troubleshooting

### Error: "Could not extract map ID from URL"
- Ensure the URL includes the `id=` parameter
- Verify the map is public and accessible

### Error: "Service returned 404"
- The layer URL may be incorrect or service is no longer available
- Check if the service endpoint is still active

### Error: "Service error"
- The ArcGIS service may have CORS restrictions
- Try accessing through a different method

## Architecture

```
User Interface (page.tsx)
    ↓
    ├─→ [GET /api/v1/gis/explore-map] → Fetch map config
    │   ├─→ Fetch ArcGIS Configuration from public portal
    │   ├─→ Parse operational layers
    │   └─→ Extract base layer information
    │
    └─→ [GET /api/v1/gis/layer-details] → Query layer details
        ├─→ Fetch layer info from ArcGIS REST API
        ├─→ Extract metadata, fields, extent
        └─→ Return formatted layer information
```

## Related Documentation

- [GIS Catalog Schema](./SCHEMA_CHANGES_GIS_CATALOG.md) - Database schema for storing imported datasets
- [Voter Import System](./lib/importers/README.md) - How to import voter data
- [Map Component](./components/Map.tsx) - Interactive map rendering
