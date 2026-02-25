import { NextRequest, NextResponse } from 'next/server';
import { resolveArcGIS } from '@/lib/gis/arcgis';

export const dynamic = 'force-dynamic';

interface Layer {
  id: string;
  title: string;
  url: string;
  type: string;
  visible: boolean;
  opacity?: number;
  geometryType?: string;
  description?: string;
}

interface LayerTreeNode {
  id: string;
  name: string;
  type?: string;
  geometryType?: string;
  description?: string;
  parentLayerId?: number;
  children?: LayerTreeNode[];
}

interface ServiceHierarchy {
  _serviceUrl: string;
  _hierarchy: LayerTreeNode[];
  _allLayers: any[];
}

interface Extent {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  spatialReference?: {
    wkid: number;
  };
}

interface MapExploreResult {
  success: boolean;
  mapTitle?: string;
  portalUrl?: string;
  operationalLayers?: (Layer | ServiceHierarchy)[];
  baseLayers?: (Layer | ServiceHierarchy)[];
  extent?: Extent;
  error?: string;
}

interface ServiceExtentResponse {
  initialExtent?: Extent;
  fullExtent?: Extent;
  extent?: Extent;
  error?: {
    message?: string;
  };
}

/**
 * Build hierarchical layer structure from flat layer array
 */
function buildLayerHierarchy(flatLayers: any[]): LayerTreeNode[] {
  const layerMap = new Map<string, LayerTreeNode>();
  const rootLayers: LayerTreeNode[] = [];

  // First pass: create nodes
  flatLayers.forEach((layer) => {
    const nodeId = `${layer.id}`;
    layerMap.set(nodeId, {
      id: nodeId,
      name: layer.label || `Layer ${layer.id}`,
      description: `Layer ID: ${layer.layerId}`,
      children: [],
    });
  });

  // Second pass: build hierarchy (for now, everything is a root layer)
  // since the arcgis library doesn't preserve parent-child relationships
  flatLayers.forEach((layer) => {
    const nodeId = `${layer.id}`;
    const node = layerMap.get(nodeId);
    if (node) {
      rootLayers.push(node);
    }
  });

  return rootLayers;
}

/**
 * Fetch and parse ArcGIS map configuration using arcgis library
 * 
 * The arcgis library handles:
 * - URL normalization for web app viewers, item pages, and REST endpoints
 * - Recursive resolution of web maps, services, and layers
 * - Error resilience and graceful degradation
 */
async function fetchMapConfiguration(
  mapUrl: string
): Promise<MapExploreResult> {
  try {
    // Use the arcgis library to resolve the complete web app structure
    const result = await resolveArcGIS(mapUrl, {
      concurrency: 8,
    });

    // Group layers by serviceUrl to match explorer expectations
    const serviceLayersMap = new Map<string, any[]>();
    result.lists.layers.forEach((layer) => {
      const serviceUrl = layer.serviceUrl || 'unknown';
      if (!serviceLayersMap.has(serviceUrl)) {
        serviceLayersMap.set(serviceUrl, []);
      }
      serviceLayersMap.get(serviceUrl)!.push(layer);
    });

    // Create hierarchical structure grouped by service
    const operationalLayers: ServiceHierarchy[] = Array.from(
      serviceLayersMap.entries()
    ).map(([serviceUrl, layers]) => ({
      _serviceUrl: serviceUrl,
      _hierarchy: buildLayerHierarchy(layers),
      _allLayers: layers,
    }));

    // Determine extent from the first service when available
    let extent: Extent | undefined;
    if (result.lists.services.length > 0) {
      const serviceUrl = result.lists.services[0].serviceUrl;
      try {
        const response = await fetch(`${serviceUrl}?f=json`);
        if (response.ok) {
          const serviceData: ServiceExtentResponse = await response.json();
          extent = serviceData.initialExtent || serviceData.fullExtent || serviceData.extent;
        }
      } catch (err) {
        console.warn('[Explorer] Failed to fetch service extent:', err);
      }
    }

    // Default extent (US bounds) if services were found and no extent returned
    if (!extent && result.lists.services.length > 0) {
      extent = {
        xmin: -125.0,
        ymin: 25.0,
        xmax: -66.0,
        ymax: 49.0,
        spatialReference: { wkid: 4326 },
      };
    }

    // Try to extract portal URL from resolved items
    let portalUrl = 'https://www.arcgis.com';
    if (result.lists.items.length > 0) {
      const firstItem = result.lists.items[0];
      if ('portalBaseUrl' in firstItem && firstItem.portalBaseUrl) {
        portalUrl = firstItem.portalBaseUrl as string;
      }
    }

    // Log resolution results
    console.log(`[Explorer] Resolved ArcGIS web app:`);
    console.log(`  - Items: ${result.lists.items.length}`);
    console.log(`  - Services: ${result.lists.services.length}`);
    console.log(`  - Layers: ${result.lists.layers.length}`);
    console.log(`  - Service groups: ${operationalLayers.length}`);
    console.log(`  - Warnings: ${result.warnings.length}`);

    return {
      success: true,
      mapTitle: 'ArcGIS Web App',
      portalUrl,
      operationalLayers:
        operationalLayers.length > 0 ? operationalLayers : undefined,
      extent,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('[Explorer] Error resolving ArcGIS web app:', errorMessage);

    return {
      success: false,
      error: `Error resolving ArcGIS configuration: ${errorMessage}`,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mapUrl = searchParams.get('url');
    const itemId = searchParams.get('itemId');

    if (!mapUrl && !itemId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: url or itemId',
          example:
            '/api/v1/gis/explore-map?url=https://www.arcgis.com/apps/webappviewer/index.html?id=92d542bcb39247e8b558021bd0446d18',
        },
        { status: 400 }
      );
    }

    let finalUrl = mapUrl || '';

    if (itemId && !mapUrl) {
      finalUrl = `https://www.arcgis.com/sharing/rest/content/items/${itemId}/data?f=json`;
    }

    const result = await fetchMapConfiguration(finalUrl);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, itemId } = body;

    if (!url && !itemId) {
      return NextResponse.json(
        { error: 'Missing required parameter: url or itemId' },
        { status: 400 }
      );
    }

    let finalUrl = url || '';

    if (itemId && !url) {
      finalUrl = `https://www.arcgis.com/sharing/rest/content/items/${itemId}/data?f=json`;
    }

    const result = await fetchMapConfiguration(finalUrl);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
