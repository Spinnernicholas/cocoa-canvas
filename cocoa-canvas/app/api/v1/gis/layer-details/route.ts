import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface LayerInfo {
  id: number;
  name: string;
  type: string;
  description?: string;
  geometryType?: string;
  minScale?: number;
  maxScale?: number;
  defaultVisibility?: boolean;
  fields?: Array<{
    name: string;
    type: string;
    alias: string;
  }>;
}

interface ServiceInfo {
  name?: string;
  description?: string;
  currentVersion?: string;
  mapName?: string;
  layers?: LayerInfo[];
  supportedQueryFormats?: string;
  capabilities?: string;
  copyrightText?: string;
  spatialReference?: {
    wkid?: number;
  };
  extent?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    spatialReference: {
      wkid: number;
    };
  };
}

/**
 * Fetch layer details from ArcGIS REST API
 * Supports both MapService and FeatureService endpoints
 */
async function fetchLayerDetails(
  layerUrl: string
): Promise<{
  success: boolean;
  data?: ServiceInfo;
  layers?: LayerInfo[];
  error?: string;
}> {
  try {
    // Ensure the URL ends with /rest/services/... format
    if (!layerUrl.includes('/rest/')) {
      return {
        success: false,
        error: 'Invalid ArcGIS service URL format',
      };
    }

    // Add /json format if not present
    let apiUrl = layerUrl;
    if (!apiUrl.includes('?f=')) {
      apiUrl += '?f=json';
    } else if (!apiUrl.includes('f=json')) {
      apiUrl = apiUrl.replace(/f=[^&]*/, 'f=json');
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Service returned: ${response.status} ${response.statusText}`,
      };
    }

    const data: ServiceInfo = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Service error',
      };
    }

    return {
      success: true,
      data,
      layers: data.layers,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to fetch layer details: ${errorMessage}`,
    };
  }
}

/**
 * Fetch details for a specific layer from a map service
 */
async function fetchSpecificLayer(
  serviceUrl: string,
  layerId: number
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    let apiUrl = `${serviceUrl}/${layerId}?f=json`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Service returned: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || 'Service error',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const layerId = searchParams.get('layerId');

    if (!url) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: url',
          example: '/api/v1/gis/layer-details?url=https://gis.example.com/arcgis/rest/services/MyService/MapServer',
        },
        { status: 400 }
      );
    }

    if (layerId) {
      const result = await fetchSpecificLayer(url, parseInt(layerId));
      return NextResponse.json(result);
    }

    const result = await fetchLayerDetails(url);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, layerId } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required parameter: url' },
        { status: 400 }
      );
    }

    if (layerId) {
      const result = await fetchSpecificLayer(url, layerId);
      return NextResponse.json(result);
    }

    const result = await fetchLayerDetails(url);
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
