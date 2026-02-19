import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface MapConfig {
  portalUrl?: string;
  operationalLayers?: Array<any>;
  baseMap?: Array<any>;
  title?: string;
  subtitle?: string;
  initialExtent?: Extent;
  initialState?: {
    viewpoint?: {
      targetGeometry?: {
        xmin: number;
        ymin: number;
        xmax: number;
        ymax: number;
        spatialReference?: {
          wkid?: number;
          latestWkid?: number;
        };
      };
    };
  };
  map?: {
    itemId?: string;
  };
  widgetPool?: {
    widgets?: Array<any>;
  };
}

interface Layer {
  id: string;
  title: string;
  url: string;
  type: string;
  visible: boolean;
  opacity?: number;
  geometryType?: string;
  description?: string;
  source?: string;
  itemUrl?: string;
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
  operationalLayers?: Layer[];
  baseLayers?: Layer[];
  extent?: Extent;
  error?: string;
}

/**
 * Extract unique service URLs from web map configuration
 */
function extractServiceUrls(webMapConfig: any): {
  operationalServices: Map<string, any[]>;
  baseServices: Map<string, any[]>;
} {
  const operationalServices = new Map<string, any[]>();
  const baseServices = new Map<string, any[]>();

  // Extract operational layer service URLs
  if (webMapConfig.operationalLayers && Array.isArray(webMapConfig.operationalLayers)) {
    webMapConfig.operationalLayers.forEach((layer: any) => {
      if (layer.url) {
        // Extract the base service URL (everything before /0, /1, etc.)
        const match = layer.url.match(/^(.+\/MapServer|.+\/FeatureServer)(?:\/\d+)?$/);
        if (match) {
          const baseUrl = match[1];
          if (!operationalServices.has(baseUrl)) {
            operationalServices.set(baseUrl, []);
          }
          operationalServices.get(baseUrl)!.push(layer);
        }
      }
    });
  }

  // Extract base layer service URLs
  if (webMapConfig.baseMap?.baseMapLayers && Array.isArray(webMapConfig.baseMap.baseMapLayers)) {
    webMapConfig.baseMap.baseMapLayers.forEach((layer: any) => {
      if (layer.url) {
        const match = layer.url.match(/^(.+\/MapServer|.+\/FeatureServer|.+\/TileServer)(?:\/\d+)?$/);
        if (match) {
          const baseUrl = match[1];
          if (!baseServices.has(baseUrl)) {
            baseServices.set(baseUrl, []);
          }
          baseServices.get(baseUrl)!.push(layer);
        }
      }
    });
  }

  return { operationalServices, baseServices };
}

/**
 * Fetch and parse layer hierarchy from a MapServer endpoint
 */
async function fetchMapServerHierarchy(serviceUrl: string): Promise<{
  success: boolean;
  layers?: any[];
  extent?: Extent;
  error?: string;
}> {
  try {
    const url = `${serviceUrl}?f=json`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch service: ${response.statusText}`,
      };
    }

    const data = await response.json();

    // Return the complete layers array with hierarchy info and extent
    if (data.layers && Array.isArray(data.layers)) {
      return {
        success: true,
        layers: data.layers,
        extent: data.extent,
      };
    }

    return {
      success: false,
      error: 'No layers found in service response',
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error fetching service',
    };
  }
}

/**
 * Combine multiple extents into a single bounding extent
 */
function combineExtents(extent1: Extent | undefined, extent2: Extent | undefined): Extent {
  if (!extent1) return extent2 || { xmin: 0, ymin: 0, xmax: 0, ymax: 0 };
  if (!extent2) return extent1;

  return {
    xmin: Math.min(extent1.xmin, extent2.xmin),
    ymin: Math.min(extent1.ymin, extent2.ymin),
    xmax: Math.max(extent1.xmax, extent2.xmax),
    ymax: Math.max(extent1.ymax, extent2.ymax),
    spatialReference: extent1.spatialReference || extent2.spatialReference || { wkid: 4326 },
  };
}

/**
 * Convert Web Mercator coordinates to WGS84 (lat/lon)
 */
function webMercatorToWGS84(x: number, y: number): { lon: number; lat: number } {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lon, lat };
}

/**
 * Convert extent from Web Mercator to WGS84 if needed
 */
function normalizeExtent(extent: any): Extent {
  const wkid = extent.spatialReference?.wkid || extent.spatialReference?.latestWkid;
  
  // If it's Web Mercator (102100 or 3857), convert to WGS84
  if (wkid === 102100 || wkid === 3857) {
    const bottomLeft = webMercatorToWGS84(extent.xmin, extent.ymin);
    const topRight = webMercatorToWGS84(extent.xmax, extent.ymax);
    
    return {
      xmin: bottomLeft.lon,
      ymin: bottomLeft.lat,
      xmax: topRight.lon,
      ymax: topRight.lat,
      spatialReference: { wkid: 4326 },
    };
  }
  
  // Already in WGS84 or unknown - return as is
  return {
    xmin: extent.xmin,
    ymin: extent.ymin,
    xmax: extent.xmax,
    ymax: extent.ymax,
    spatialReference: { wkid: wkid || 4326 },
  };
}

/**
 * Build hierarchical layer structure from flat layer array
 */
function buildLayerHierarchy(flatLayers: any[]): any[] {
  const layerMap = new Map<number, any>();
  const rootLayers: any[] = [];

  // First pass: create nodes
  flatLayers.forEach((layer) => {
    layerMap.set(layer.id, {
      ...layer,
      children: [],
    });
  });

  // Second pass: build hierarchy
  flatLayers.forEach((layer) => {
    const node = layerMap.get(layer.id)!;
    if (
      layer.parentLayerId !== undefined &&
      layer.parentLayerId !== -1 &&
      layerMap.has(layer.parentLayerId)
    ) {
      const parent = layerMap.get(layer.parentLayerId)!;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    } else {
      rootLayers.push(node);
    }
  });

  return rootLayers;
}

/**
 * Fetch and parse ArcGIS map configuration with service hierarchies
 */
async function fetchMapConfiguration(
  mapUrl: string
): Promise<MapExploreResult> {
  try {
    // Ensure the URL has the proper format
    let configUrl = mapUrl;

    // If it's a web app viewer URL, extract the item ID and fetch the config
    if (configUrl.includes('webappviewer')) {
      const urlParams = new URL(configUrl);
      const itemId = urlParams.searchParams.get('id');

      if (!itemId) {
        return {
          success: false,
          error: 'Could not extract map ID from URL',
        };
      }

      // Construct API call to get the web app configuration
      configUrl = `https://www.arcgis.com/sharing/rest/content/items/${itemId}/data?f=json`;
    } else if (!configUrl.includes('/data?')) {
      // If it's a direct item URL, append /data?f=json
      configUrl = `${configUrl.split('?')[0]}/data?f=json`;
    }

    const response = await fetch(configUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch map configuration: ${response.statusText}`,
      };
    }

    const config: MapConfig = await response.json();

    if (!config) {
      return {
        success: false,
        error: 'Map configuration is empty',
      };
    }

    let operationalLayers: any[] = [];
    let baseLayers: any[] = [];
    let portalUrl = config.portalUrl;
    let webMapExtent: Extent | undefined;
    let serviceExtent: Extent | undefined;

    // Check if the initial config itself is a web map with initialExtent
    if (config.initialExtent) {
      webMapExtent = normalizeExtent(config.initialExtent);
    }
    
    // Check for extent in initialState.viewpoint.targetGeometry (newer format)
    if (!webMapExtent && config.initialState?.viewpoint?.targetGeometry) {
      webMapExtent = normalizeExtent(config.initialState.viewpoint.targetGeometry);
    }

    // If this is a Web App AppBuilder config with a referenced Web Map, fetch the Web Map
    if (config.map?.itemId) {
      try {
        const portal = config.portalUrl?.replace(/\/$/, '') || 'https://cocogis.maps.arcgis.com';
        const webMapUrl = `${portal}/sharing/rest/content/items/${config.map.itemId}/data?f=json`;
        
        const webMapResponse = await fetch(webMapUrl);
        if (webMapResponse.ok) {
          const webMapConfig = await webMapResponse.json();
          
          // Extract the initial extent from the web map if available (and we haven't already set one)
          if (!webMapExtent && webMapConfig.initialExtent) {
            webMapExtent = normalizeExtent(webMapConfig.initialExtent);
          }
          
          // Check for extent in initialState.viewpoint.targetGeometry (newer format)
          if (!webMapExtent && webMapConfig.initialState?.viewpoint?.targetGeometry) {
            webMapExtent = normalizeExtent(webMapConfig.initialState.viewpoint.targetGeometry);
          }
          
          // Extract unique service URLs from the web map
          const { operationalServices, baseServices } = extractServiceUrls(webMapConfig);
          
          // Fetch layer hierarchies from each operational service
          for (const [serviceUrl, usedLayers] of operationalServices.entries()) {
            try {
              const hierarchy = await fetchMapServerHierarchy(serviceUrl);
              if (hierarchy.success && hierarchy.layers) {
                const hierarchicalLayers = buildLayerHierarchy(hierarchy.layers);
                
                // Convert to Layer type with hierarchy info
                operationalLayers.push({
                  // Store the raw hierarchical structure
                  _hierarchy: hierarchicalLayers,
                  _serviceUrl: serviceUrl,
                  _allLayers: hierarchy.layers,
                  _extent: hierarchy.extent,
                });

                // Accumulate service extent (separate from web map extent)
                if (hierarchy.extent) {
                  serviceExtent = combineExtents(serviceExtent, hierarchy.extent);
                }
              }
            } catch (error) {
              console.error(`Error fetching service hierarchy for ${serviceUrl}:`, error);
            }
          }
          
          // Fetch layer hierarchies from each base service
          for (const [serviceUrl, usedLayers] of baseServices.entries()) {
            try {
              const hierarchy = await fetchMapServerHierarchy(serviceUrl);
              if (hierarchy.success && hierarchy.layers) {
                const hierarchicalLayers = buildLayerHierarchy(hierarchy.layers);
                
                baseLayers.push({
                  // Store the raw hierarchical structure
                  _hierarchy: hierarchicalLayers,
                  _serviceUrl: serviceUrl,
                  _allLayers: hierarchy.layers,
                  _extent: hierarchy.extent,
                });

                // Accumulate service extent (separate from web map extent)
                if (hierarchy.extent) {
                  serviceExtent = combineExtents(serviceExtent, hierarchy.extent);
                }
              }
            } catch (error) {
              console.error(`Error fetching service hierarchy for ${serviceUrl}:`, error);
            }
          }
        }
      } catch (webMapError) {
        console.error('Error fetching web map:', webMapError);
      }
    }

    // Use web map extent if available, fall back to service extent
    const finalExtent = webMapExtent || serviceExtent;

    return {
      success: true,
      mapTitle: config.title || 'Unnamed Map',
      portalUrl,
      operationalLayers: operationalLayers.length > 0 ? operationalLayers : undefined,
      baseLayers: baseLayers.length > 0 ? baseLayers : undefined,
      extent: finalExtent,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Error fetching map configuration: ${errorMessage}`,
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
          error:
            'Missing required parameter: url or itemId',
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
