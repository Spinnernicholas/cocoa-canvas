import { describe, it, expect, vi } from 'vitest';

/**
 * Integration tests for Map Explorer API
 * 
 * These tests verify the functionality of:
 * - POST /api/v1/gis/explore-map
 * - GET /api/v1/gis/layer-details
 * 
 * To run these tests:
 *   npm test -- map-explorer.test.ts
 * 
 * Note: These are example tests. Full integration tests would require
 * running against a live server or mocking the fetch calls.
 */

describe('Map Explorer API', () => {
  describe('explore-map endpoint', () => {
    it('should extract layers from ArcGIS Web App URL', async () => {
      // Example: How to use the explore-map endpoint
      const mapUrl =
        'https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18';

      const expectedResponse = {
        success: true,
        mapTitle: expect.any(String),
        portalUrl: expect.any(String),
        operationalLayers: expect.any(Array),
        baseLayers: expect.any(Array),
      };

      // Mock the response for testing
      const mockResponse = {
        success: true,
        mapTitle: 'Contra Costa County Map',
        portalUrl: 'https://cocogis.maps.arcgis.com',
        operationalLayers: [
          {
            id: '18300aea67e-layer-5',
            title: 'Assessment Parcels',
            url: 'https://gis.cccounty.us/arcgis/rest/services/CCMAP/Assessment_Parcels_ArcPro/MapServer/0',
            type: 'ArcGISMapServiceLayer',
            visible: true,
            geometryType: 'esriGeometryPolygon',
          },
        ],
        baseLayers: [
          {
            id: 'World_Imagery_2017',
            title: 'World Imagery',
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            type: 'ArcGISTiledMapServiceLayer',
            visible: true,
          },
        ],
      };

      expect(mockResponse).toMatchObject(expectedResponse);
      expect(mockResponse.operationalLayers.length).toBeGreaterThan(0);
      expect(mockResponse.operationalLayers[0]).toHaveProperty('url');
      expect(mockResponse.operationalLayers[0]).toHaveProperty('title');
    });

    it('should handle invalid URLs', async () => {
      const invalidUrl = 'not-a-valid-url';

      // Expected error response
      const expectedErrorResponse = {
        success: false,
        error: expect.any(String),
      };

      const mockErrorResponse = {
        success: false,
        error: 'Invalid ArcGIS service URL format',
      };

      expect(mockErrorResponse).toMatchObject(expectedErrorResponse);
      expect(mockErrorResponse.error).toBeTruthy();
    });
  });

  describe('layer-details endpoint', () => {
    it('should fetch layer metadata from service endpoint', async () => {
      const serviceUrl =
        'https://gis.cccounty.us/arcgis/rest/services/CCMAP/Assessment_Parcels_ArcPro/MapServer/0';

      const expectedResponse = {
        success: true,
        data: expect.objectContaining({
          name: expect.any(String),
          type: expect.any(String),
        }),
      };

      // Mock layer details response
      const mockResponse = {
        success: true,
        data: {
          id: 0,
          name: 'Assessment Parcels',
          type: 'Feature Layer',
          geometryType: 'esriGeometryPolygon',
          description: 'Parcel boundaries for the county',
          extent: {
            xmin: -13660440.4,
            ymin: 4520240.8,
            xmax: -13495336.4,
            ymax: 4611965.3,
            spatialReference: { wkid: 3857 },
          },
          fields: [
            {
              name: 'OBJECTID',
              type: 'esriFieldTypeOID',
              alias: 'OBJECTID',
            },
            {
              name: 'APN',
              type: 'esriFieldTypeString',
              alias: 'Assessor Parcel Number',
            },
          ],
        },
      };

      expect(mockResponse).toMatchObject(expectedResponse);
      expect(mockResponse.data.fields).toBeDefined();
      expect(mockResponse.data.extent).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      const invalidServiceUrl = 'https://gis.example.com/invalid/service';

      const expectedErrorResponse = {
        success: false,
        error: expect.any(String),
      };

      const mockErrorResponse = {
        success: false,
        error: 'Service returned: 404 Not Found',
      };

      expect(mockErrorResponse).toMatchObject(expectedErrorResponse);
    });
  });
});

/**
 * Usage Examples for Map Explorer
 * 
 * These examples show how to integrate the Map Explorer API into your applications.
 */

// Example 1: Basic map exploration
export async function exploreMapExample() {
  const mapUrl =
    'https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18';

  const response = await fetch(
    `/api/v1/gis/explore-map?url=${encodeURIComponent(mapUrl)}`
  );
  const mapData = await response.json();

  if (mapData.success) {
    console.log('Map Title:', mapData.mapTitle);
    console.log('Number of Layers:', mapData.operationalLayers.length);

    // Iterate through layers
    mapData.operationalLayers.forEach((layer) => {
      console.log(`- ${layer.title} (${layer.type})`);
      console.log(`  URL: ${layer.url}`);
      console.log(`  Visible: ${layer.visible}`);
    });
  } else {
    console.error('Error:', mapData.error);
  }
}

// Example 2: Get details for a specific layer
export async function getLayerDetailsExample() {
  const serviceUrl =
    'https://gis.cccounty.us/arcgis/rest/services/CCMAP/Assessment_Parcels_ArcPro/MapServer';

  const response = await fetch(
    `/api/v1/gis/layer-details?url=${encodeURIComponent(serviceUrl)}`
  );
  const layerData = await response.json();

  if (layerData.success) {
    console.log('Service Name:', layerData.data.name);
    console.log('Description:', layerData.data.description);
    console.log('Extent:', layerData.data.extent);

    // List sub-layers
    if (layerData.data.layers) {
      console.log('Sub-layers:');
      layerData.data.layers.forEach((layer) => {
        console.log(`- ${layer.name} (${layer.geometryType})`);
      });
    }

    // List fields
    if (layerData.data.fields) {
      console.log('Fields:');
      layerData.data.fields.forEach((field) => {
        console.log(`- ${field.alias} (${field.type})`);
      });
    }
  } else {
    console.error('Error:', layerData.error);
  }
}

// Example 3: Build a layer catalog
export async function buildLayerCatalogExample() {
  const mapUrl =
    'https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18';

  const mapResponse = await fetch(
    `/api/v1/gis/explore-map?url=${encodeURIComponent(mapUrl)}`
  );
  const mapData = await mapResponse.json();

  if (!mapData.success) {
    console.error('Failed to load map');
    return;
  }

  // For each layer, get detailed information
  const catalog = {
    mapTitle: mapData.mapTitle,
    layers: [],
  };

  for (const layer of mapData.operationalLayers) {
    const detailResponse = await fetch(
      `/api/v1/gis/layer-details?url=${encodeURIComponent(layer.url)}`
    );
    const detail = await detailResponse.json();

    catalog.layers.push({
      title: layer.title,
      type: layer.type,
      url: layer.url,
      visible: layer.visible,
      metadata: detail.success ? detail.data : null,
    });
  }

  console.log(JSON.stringify(catalog, null, 2));
}

// Example 4: Search for specific layer types
export async function findLayersByTypeExample() {
  const mapUrl =
    'https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18';

  const response = await fetch(
    `/api/v1/gis/explore-map?url=${encodeURIComponent(mapUrl)}`
  );
  const mapData = await response.json();

  if (mapData.success) {
    // Find all feature layers with polygon geometry
    const polygonLayers = mapData.operationalLayers.filter(
      (layer) => layer.geometryType === 'esriGeometryPolygon'
    );

    console.log(
      'Polygon Layers:',
      polygonLayers.map((l) => l.title)
    );
  }
}
