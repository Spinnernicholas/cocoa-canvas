# ArcGIS Library - Cocoa Canvas Integration

This directory contains the ArcGIS web app scraper library, ported from the standalone `arcgislib` project. It provides tools to extract structure from ArcGIS web maps and web apps without cloning the UI.

## What It Does

The arcgis library resolves ArcGIS URLs into a dependency graph of:
- **Items**: Web maps, web mapping applications, hosted feature services
- **Services**: Map services, feature services, image services
- **Layers**: Individual layers within services
- **Tables**: Non-spatial data tables
- **Resources**: Related files and media

This data can be used to:
- Build custom Leaflet-based map viewers
- Extract structured data from ArcGIS web apps
- Populate databases with service metadata
- Generate JSON representations of web map structure

## Usage

### Basic Resolution

```typescript
import { resolveArcGIS } from '@/lib/gis/arcgis';

// Scrape a web app
const result = await resolveArcGIS(
  'https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18',
  { concurrency: 8 }
);

console.log(`Found ${result.lists.layers.length} layers`);
```

### URL Normalization

```typescript
import { normalizeArcGISUrl } from '@/lib/gis/arcgis';

// Normalize different ArcGIS URL formats
const targets = normalizeArcGISUrl(url);

// Returns array of NormalizedTarget objects with:
// - kind: 'item' | 'service'
// - url: REST endpoint URL
// - portalBaseUrl: The portal domain
// - itemId (for items)
```

### Deep Scanning

```typescript
import { deepScan } from '@/lib/gis/arcgis';

// Extract URLs and item IDs from nested JSON
const data = { /* some ArcGIS API response */ };
const result = deepScan(data);

console.log(result.serviceUrls);  // Set<string>
console.log(result.itemIds);      // Set<string>
```

## API Integration

See `api-route-example.ts` for complete API route implementations.

### POST /api/v1/gis/arcgis/scrape

Scrape a web app and return its structure:

```typescript
const response = await fetch('/api/v1/gis/arcgis/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.arcgis.com/apps/webappviewer/index.html?id=...'
  })
});

const { data } = await response.json();
// data contains: root, summary, lists, warnings
```

### GET /api/v1/gis/arcgis/normalize?url=...

Normalize an ArcGIS URL:

```typescript
const response = await fetch(
  '/api/v1/gis/arcgis/normalize?url=' + encodeURIComponent(url)
);

const { targets } = await response.json();
// targets: array of normalized URL objects
```

## Examples

See `examples.ts` for detailed usage patterns:

1. **Scraping web app structure** - Extract all layers, services, and items
2. **URL normalization** - Parse different ArcGIS URL formats
3. **API integration** - Create REST endpoints for frontend use
4. **Database storage** - Transform results for storage
5. **Leaflet integration** - Build custom maps from scraped data

## Leaflet Map Builder Pattern

The typical workflow for building a custom Leaflet map from a web app:

1. **Backend**: Scrape the web app via API endpoint
2. **Frontend**: Fetch the structure from the API
3. **Render**: Add layers to Leaflet map from the structure

```typescript
'use client';

import L from 'leaflet';

export async function buildMapFromWebApp(webAppUrl: string) {
  // 1. Scrape structure from backend
  const response = await fetch('/api/v1/gis/arcgis/scrape', {
    method: 'POST',
    body: JSON.stringify({ url: webAppUrl })
  });
  
  const { data } = await response.json();
  
  // 2. Create Leaflet map
  const map = L.map('map').setView([39.8, -98.6], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
  // 3. Add layers from scraped structure
  data.lists.layers.forEach(layer => {
    if (layer.serviceUrl) {
      L.tileLayer.wms(layer.serviceUrl, {
        layers: [layer.layerId || 0],
        transparent: true,
        format: 'image/png'
      }).addTo(map);
    }
  });
  
  return map;
}
```

## Configuration

### Concurrency Control

Control how many concurrent requests are made:

```typescript
const result = await resolveArcGIS(url, {
  concurrency: 4  // Default: 8
});
```

### Authentication

If the web app contains protected items/services, provide an authentication token:

```typescript
const result = await resolveArcGIS(url, {
  token: 'your-arcgis-token',
  // OR use a function for dynamic token retrieval
  getToken: async () => {
    const token = await fetchLatestToken();
    return token;
  }
});
```

## Types

```typescript
// Main result type
type ResolveResult = {
  root: string;
  nodes: Record<string, BaseNode>;
  edges: Edge[];
  lists: {
    items: ItemNode[];
    services: ServiceNode[];
    layers: LayerNode[];
    tables: TableNode[];
    resources: ResourceNode[];
  };
  warnings: string[];
};

// Node types
type BaseNode = ItemNode | ServiceNode | LayerNode | TableNode | ResourceNode;

type ItemNode = {
  kind: 'item';
  id: string;
  itemId: string;
  name?: string;
  portalBaseUrl: string;
};

type ServiceNode = {
  kind: 'service';
  id: string;
  serviceUrl: string;
  name?: string;
  type?: string;
};

type LayerNode = {
  kind: 'layer';
  id: string;
  serviceUrl: string;
  layerId: number;
  name?: string;
};
```

## Error Handling

The library uses graceful degradation - it collects errors as warnings rather than stopping the entire resolution process:

```typescript
const result = await resolveArcGIS(url);

// Check for partial failures
if (result.warnings.length > 0) {
  console.warn('Resolution completed with warnings:');
  result.warnings.forEach(w => console.warn(`  - ${w}`));
}

// Use whatever was successfully resolved
console.log(`Successfully resolved: ${Object.keys(result.nodes).length} nodes`);
```

## Performance

- **Caching**: Prevents duplicate requests for the same URL
- **Concurrency limiting**: Controls server load (default 8 concurrent requests)
- **Exponential backoff**: Automatic retry on rate limit (429) or server errors
- **Streaming**: Stream responses rather than buffering all in memory

## Testing

Run tests with:

```bash
npm run test:unit -- lib/gis/arcgis/arcgis.test.ts
```

Test coverage includes:
- URL normalization (item pages, REST endpoints, web app viewers, enterprise portals)
- Deep JSON scanning for embedded service URLs and item IDs
- Graph storage and deduplication
- Error resilience and graceful degradation
- Result structure validation

## Files

- `types.ts` - TypeScript type definitions
- `normalize.ts` - URL normalization and parsing
- `scan.ts` - Deep JSON scanning for ArcGIS references
- `graph.ts` - Dependency graph storage and management
- `fetcher.ts` - HTTP client with caching, retry, concurrency control
- `resolve.ts` - Main resolution logic and orchestration
- `index.ts` - Public API exports
- `examples.ts` - Integration examples
- `api-route-example.ts` - Next.js API route implementation
- `arcgis.test.ts` - Comprehensive test suite

## License

Same as cocoa-canvas project.
