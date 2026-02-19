import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/gis/layer-features
 * 
 * Fetch features from an ArcGIS FeatureServer or MapServer layer.
 * Supports querying with spatial extent (bbox) for pagination.
 * 
 * Query params:
 * - url: Service endpoint (e.g., https://server.com/arcgis/rest/services/...)
 * - layerId: Layer ID to query
 * - where: Optional WHERE clause for filtering (default: '1=1')
 * - bbox: Optional bounding box (xmin,ymin,xmax,ymax) to limit results to visible area
 * - geometryType: Filter by geometry type if needed
 * - outSR: Output spatial reference (default: 4326)
 * - limit: Max results to return (default: 1000, max: 10000)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const layerId = request.nextUrl.searchParams.get('layerId');
  const where = request.nextUrl.searchParams.get('where') || '1=1';
  const bbox = request.nextUrl.searchParams.get('bbox');
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get('limit') || '1000', 10),
    10000
  );
  const outSR = request.nextUrl.searchParams.get('outSR') || '4326';

  if (!url || layerId === null) {
    return NextResponse.json(
      { error: 'Missing url or layerId parameter' },
      { status: 400 }
    );
  }

  try {
    // Build the query URL
    const queryUrl = new URL(`${url}/${layerId}/query`);
    queryUrl.searchParams.set('where', where);
    queryUrl.searchParams.set('outFields', '*');
    queryUrl.searchParams.set('f', 'json');
    queryUrl.searchParams.set('returnGeometry', 'true');
    queryUrl.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    queryUrl.searchParams.set('outSR', outSR);
    queryUrl.searchParams.set('resultRecordCount', limit.toString());

    // Add bounding box filter if provided (format: xmin,ymin,xmax,ymax)
    if (bbox) {
      const parts = bbox.split(',').map((v) => parseFloat(v.trim()));
      if (parts.length === 4) {
        const [xmin, ymin, xmax, ymax] = parts;
        if (!isNaN(xmin) && !isNaN(ymin) && !isNaN(xmax) && !isNaN(ymax)) {
          queryUrl.searchParams.set('geometry', JSON.stringify({
            xmin,
            ymin,
            xmax,
            ymax,
          }));
          queryUrl.searchParams.set('geometryType', 'esriGeometryEnvelope');
        }
      }
    }

    const response = await fetch(queryUrl.toString());
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `ArcGIS service returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'ArcGIS query error' },
        { status: 400 }
      );
    }

    // Transform ArcGIS response to GeoJSON for easier map rendering
    const features = data.features || [];
    const geoJsonFeatures = features
      .map((feature: any) => {
        const geometry = feature.geometry;
        let geoJsonGeometry: any = null;

        if (geometry) {
          // Convert ESRI JSON geometry to GeoJSON
          if (geometry.x !== undefined && geometry.y !== undefined && geometry.x !== null && geometry.y !== null) {
            // Point - validate coordinates are finite numbers
            if (typeof geometry.x === 'number' && typeof geometry.y === 'number' && 
                isFinite(geometry.x) && isFinite(geometry.y)) {
              geoJsonGeometry = {
                type: 'Point',
                coordinates: [geometry.x, geometry.y],
              };
            }
          } else if (geometry.rings && Array.isArray(geometry.rings) && geometry.rings.length > 0) {
            // Polygon or MultiPolygon
            const rings = geometry.rings.filter((ring: any) => Array.isArray(ring) && ring.length > 0);
            if (rings.length === 0) {
              return null;
            }
            if (rings.length > 1 && isExteriorRing(rings[0])) {
              // MultiPolygon
              geoJsonGeometry = {
                type: 'MultiPolygon',
                coordinates: rings,
              };
            } else {
              // Polygon
              geoJsonGeometry = {
                type: 'Polygon',
                coordinates: rings,
              };
            }
          } else if (geometry.paths && Array.isArray(geometry.paths) && geometry.paths.length > 0) {
            // LineString or MultiLineString
            const paths = geometry.paths.filter((path: any) => Array.isArray(path) && path.length > 0);
            if (paths.length === 0) {
              return null;
            }
            if (paths.length === 1) {
              geoJsonGeometry = {
                type: 'LineString',
                coordinates: paths[0],
              };
            } else {
              geoJsonGeometry = {
                type: 'MultiLineString',
                coordinates: paths,
              };
            }
          }
        }

        // Only return features with valid geometry
        if (!geoJsonGeometry) {
          return null;
        }

        return {
          type: 'Feature',
          geometry: geoJsonGeometry,
          properties: feature.attributes || {},
        };
      })
      .filter((f: any) => f !== null);

    return NextResponse.json({
      success: true,
      data: {
        type: 'FeatureCollection',
        features: geoJsonFeatures,
        count: geoJsonFeatures.length,
        exceededTransferLimit: data.exceededTransferLimit || false,
      },
    });
  } catch (error) {
    console.error('Error fetching layer features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch layer features' },
      { status: 500 }
    );
  }
}

/**
 * Check if ring is an exterior ring (clockwise in ESRI coordinates)
 */
function isExteriorRing(ring: number[][]): boolean {
  if (!ring || ring.length < 3) return false;
  
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += (x2 - x1) * (y2 + y1);
  }
  
  return sum > 0; // Clockwise = exterior ring
}
