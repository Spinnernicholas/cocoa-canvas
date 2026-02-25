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
  minScale?: number;
  maxScale?: number;
  defaultVisibility?: boolean;
  parentLayerId?: number;
  children?: LayerTreeNode[];
}

interface ServiceInfo {
  serviceUrl: string;
  name: string;
  type: string;
  description?: string;
  copyrightText?: string;
  currentVersion?: string;
  capabilities?: string;
  supportedQueryFormats?: string;
  spatialReference?: { wkid?: number };
  initialExtent?: Extent;
  fullExtent?: Extent;
  extent?: Extent;
  layerCount: number;
  tableCount: number;
  tables?: any[];
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
  services?: ServiceInfo[];
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
 * Build hierarchical layer structure from service layers with full metadata
 */
function buildLayerHierarchy(serviceLayers: any[]): LayerTreeNode[] {
  const layerMap = new Map<number, LayerTreeNode>();
  const rootLayers: LayerTreeNode[] = [];

  // First pass: create nodes with full metadata
  serviceLayers.forEach((layer) => {
    const node: LayerTreeNode = {
      id: `${layer.id}`,
      name: layer.name || `Layer ${layer.id}`,
      type: layer.type,
      geometryType: layer.geometryType,
      description: layer.description,
      minScale: layer.minScale,
      maxScale: layer.maxScale,
      defaultVisibility: layer.defaultVisibility,
      parentLayerId: layer.parentLayerId,
      children: [],
    };
    layerMap.set(layer.id, node);
  });

  // Second pass: build hierarchy based on parentLayerId
  layerMap.forEach((node) => {
    if (node.parentLayerId !== undefined && node.parentLayerId !== -1) {
      const parent = layerMap.get(node.parentLayerId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        // Parent not found, add as root
        rootLayers.push(node);
      }
    } else {
      rootLayers.push(node);
    }
  });

  return rootLayers;
}

/**
 * Fetch full service metadata including all layers with complete details
 */
async function fetchServiceDetails(serviceUrl: string): Promise<any> {
  try {
    const response = await fetch(`${serviceUrl}?f=json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch service details: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`[Explorer] Failed to fetch service details for ${serviceUrl}:`, error);
    return { layers: [], tables: [] };
  }
}

/**
 * Fetch and parse ArcGIS map configuration using arcgis library
 * 
 * The arcgis library handles:
 * - URL normalization for web app viewers, item pages, and REST endpoints
 * - Recursive resolution of web maps, services, and layers
 * - Error resilience and graceful degradation
 * 
 * Enhanced to fetch full service metadata for all discovered services
 */
async function fetchMapConfiguration(
  mapUrl: string
): Promise<MapExploreResult> {
  try {
    // Use the arcgis library to resolve the complete web app structure
    const result = await resolveArcGIS(mapUrl, {
      concurrency: 8,
    });

    // Collect all unique service URLs
    const serviceUrls = new Set<string>();
    result.lists.services.forEach((service) => {
      if (service.serviceUrl) {
        serviceUrls.add(service.serviceUrl);
      }
    });
    result.lists.layers.forEach((layer) => {
      if (layer.serviceUrl) {
        serviceUrls.add(layer.serviceUrl);
      }
    });

    // Fetch full service details for each service
    const serviceDetailsMap = new Map<string, any>();
    const serviceDetailsPromises = Array.from(serviceUrls).map(async (serviceUrl) => {
      const details = await fetchServiceDetails(serviceUrl);
      serviceDetailsMap.set(serviceUrl, details);
    });

    await Promise.all(serviceDetailsPromises);

    // Build both service info and hierarchical structures with full layer metadata
    const services: ServiceInfo[] = [];
    const operationalLayers: ServiceHierarchy[] = [];
    let extent: Extent | undefined;

    for (const serviceUrl of serviceUrls) {
      const serviceDetails = serviceDetailsMap.get(serviceUrl);
      if (!serviceDetails) {
        continue;
      }

      // Determine service type from URL
      const serviceType = 
        serviceUrl.includes('/MapServer') ? 'MapServer' :
        serviceUrl.includes('/FeatureServer') ? 'FeatureServer' :
        serviceUrl.includes('/ImageServer') ? 'ImageServer' :
        serviceUrl.includes('/GeocodeServer') ? 'GeocodeServer' :
        serviceUrl.includes('/GeometryServer') ? 'GeometryServer' :
        serviceUrl.includes('/GPServer') ? 'Geoprocessing Service' :
        serviceDetails.type || 'Service';

      // Extract service name from URL
      const serviceNameMatch = serviceUrl.match(/\/services\/([^\/]+)/);
      const serviceName = serviceDetails.mapName || serviceDetails.name || 
        (serviceNameMatch ? serviceNameMatch[1].replace(/\//g, ' / ') : serviceUrl.split('/').slice(-2, -1)[0]);

      // Create service info object
      const serviceInfo: ServiceInfo = {
        serviceUrl,
        name: serviceName,
        type: serviceType,
        description: serviceDetails.description || serviceDetails.serviceDescription,
        copyrightText: serviceDetails.copyrightText,
        currentVersion: serviceDetails.currentVersion,
        capabilities: serviceDetails.capabilities,
        supportedQueryFormats: serviceDetails.supportedQueryFormats,
        spatialReference: serviceDetails.spatialReference,
        initialExtent: serviceDetails.initialExtent,
        fullExtent: serviceDetails.fullExtent,
        extent: serviceDetails.extent,
        layerCount: serviceDetails.layers?.length || 0,
        tableCount: serviceDetails.tables?.length || 0,
        tables: serviceDetails.tables,
      };

      services.push(serviceInfo);

      // Use the full layer metadata from the service
      if (serviceDetails.layers) {
        const hierarchy = buildLayerHierarchy(serviceDetails.layers);
        
        operationalLayers.push({
          _serviceUrl: serviceUrl,
          _hierarchy: hierarchy,
          _allLayers: serviceDetails.layers,
        });
      }

      // Use extent from first service if available
      if (!extent && (serviceDetails.initialExtent || serviceDetails.fullExtent || serviceDetails.extent)) {
        extent = serviceDetails.initialExtent || serviceDetails.fullExtent || serviceDetails.extent;
      }
    }

    // Default extent (US bounds) if services were found and no extent returned
    if (!extent && operationalLayers.length > 0) {
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
    console.log(`  - Services: ${services.length}`);
    console.log(`  - Layers: ${result.lists.layers.length}`);
    console.log(`  - Service groups: ${operationalLayers.length}`);
    console.log(`  - Warnings: ${result.warnings.length}`);
    
    // Log service details
    services.forEach((service) => {
      console.log(`  - Service: ${service.name} (${service.type})`);
      console.log(`    URL: ${service.serviceUrl}`);
      console.log(`    Layers: ${service.layerCount}, Tables: ${service.tableCount}`);
    });

    return {
      success: true,
      mapTitle: 'ArcGIS Web App',
      portalUrl,
      services: services.length > 0 ? services : undefined,
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
