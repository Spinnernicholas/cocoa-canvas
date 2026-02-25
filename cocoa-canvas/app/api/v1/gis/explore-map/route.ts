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

interface Widget {
  id?: string;
  label?: string;
  type?: string;
  icon?: string;
  config?: any;
  serviceUrls?: string[];
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
  widgets?: Widget[];
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
 * Fetch detailed metadata for individual layer from MapServer
 */
async function fetchLayerDetails(serviceUrl: string, layerId: number): Promise<any> {
  try {
    const layerUrl = `${serviceUrl}/${layerId}`;
    const response = await fetch(`${layerUrl}?f=json`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`[Explorer] Failed to fetch layer ${layerId} details from ${serviceUrl}:`, error);
    return null;
  }
}

/**
 * Enrich layers with detailed metadata by fetching individual layer details
 */
async function enrichLayerMetadata(serviceUrl: string, layers: any[]): Promise<any[]> {
  if (!layers || !Array.isArray(layers)) {
    return layers || [];
  }

  // Fetch details for each layer in parallel
  const enrichPromises = layers.map(async (layer) => {
    const layerDetails = await fetchLayerDetails(serviceUrl, layer.id);
    if (layerDetails) {
      // Merge detailed metadata
      return {
        ...layer,
        name: layerDetails.name || layer.name || `Layer ${layer.id}`,
        description: layerDetails.description || layer.description,
        geometryType: layerDetails.geometryType || layer.geometryType,
        type: layerDetails.type || layer.type,
        fields: layerDetails.fields,
        extent: layerDetails.extent || layer.extent,
      };
    }
    return layer;
  });

  return Promise.all(enrichPromises);
}

/**
 * Extract widgets from web app configuration data
 */
function extractWidgets(webAppData: any): Widget[] {
  const widgets: Widget[] = [];
  
  // Handle both widgetOnScreen and widgetPool structures
  const onScreenWidgets = webAppData?.widgetOnScreen?.widgets || [];
  const pooledWidgets = webAppData?.widgetPool?.widgets || [];
  const allWidgets = [...onScreenWidgets, ...pooledWidgets];
  
  for (const widget of allWidgets) {
    const serviceUrls: string[] = [];
    
    // Extract service URLs from widget config using regex
    if (widget.config) {
      const configStr = JSON.stringify(widget.config);
      const serviceUrlRegex = /(https?:\/\/[^\s"']+\/arcgis\/rest\/services\/[^\s"']+?\/[A-Za-z]+Server)/gi;
      let match;
      while ((match = serviceUrlRegex.exec(configStr)) !== null) {
        if (!serviceUrls.includes(match[1])) {
          serviceUrls.push(match[1]);
        }
      }
    }
    
    widgets.push({
      id: widget.id,
      label: widget.label || widget.name || widget.id,
      type: widget.uri || widget.type,
      icon: widget.icon,
      config: widget.config,
      serviceUrls: serviceUrls.length > 0 ? serviceUrls : undefined,
    });
  }
  
  return widgets;
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

    console.log(`[Explorer] Found ${serviceUrls.size} unique service URLs:`);
    serviceUrls.forEach(url => console.log(`  - ${url}`));

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
        console.warn(`[Explorer] No details fetched for service: ${serviceUrl}`);
        continue;
      }

      // Determine service type from URL - extract any *Server pattern
      let serviceType = 'Service';
      const serverTypeMatch = serviceUrl.match(/\/([A-Za-z]+Server)(?:\/|$)/i);
      if (serverTypeMatch) {
        serviceType = serverTypeMatch[1];
      } else if (serviceDetails.type) {
        serviceType = serviceDetails.type;
      }

      // Extract service name from URL - match everything between /services/ and /*Server
      const serviceNameMatch = serviceUrl.match(/\/services\/(.+?)\/[A-Za-z]+Server/);
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

      // Enrich layers with detailed metadata and use the full layer metadata from the service
      if (serviceDetails.layers) {
        const enrichedLayers = await enrichLayerMetadata(serviceUrl, serviceDetails.layers);
        const hierarchy = buildLayerHierarchy(enrichedLayers);
        
        operationalLayers.push({
          _serviceUrl: serviceUrl,
          _hierarchy: hierarchy,
          _allLayers: enrichedLayers,
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

    // Try to extract portal URL and widgets from resolved items
    let portalUrl = 'https://www.arcgis.com';
    let widgets: Widget[] = [];
    
    if (result.lists.items.length > 0) {
      const firstItem = result.lists.items[0];
      if ('portalBaseUrl' in firstItem && firstItem.portalBaseUrl) {
        portalUrl = firstItem.portalBaseUrl as string;
      }
      
      // Fetch web app data to extract widgets if this is a Web Application
      if ('itemId' in firstItem && firstItem.itemId && 
          ('itemType' in firstItem && (firstItem.itemType === 'Web Mapping Application' || firstItem.itemType === 'Application'))) {
        try {
          const dataUrl = `${portalUrl}/sharing/rest/content/items/${firstItem.itemId}/data?f=json`;
          const dataResponse = await fetch(dataUrl);
          if (dataResponse.ok) {
            const webAppData = await dataResponse.json();
            widgets = extractWidgets(webAppData);
            console.log(`[Explorer] Extracted ${widgets.length} widgets from web app`);
          }
        } catch (error) {
          console.warn('[Explorer] Failed to fetch web app data for widgets:', error);
        }
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
      widgets: widgets.length > 0 ? widgets : undefined,
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
