/**
 * Calculate centroid of GeoJSON geometry
 * Supports Point, Polygon, and MultiPolygon geometries
 */

interface Point {
  type: 'Point';
  coordinates: [number, number];
}

interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

type Geometry = Point | Polygon | MultiPolygon;

interface Centroid {
  lat: number;
  lng: number;
}

/**
 * Calculate centroid from a Point geometry
 */
function centroidFromPoint(point: Point): Centroid {
  const [lng, lat] = point.coordinates;
  return { lat, lng };
}

/**
 * Calculate centroid from a Polygon geometry
 * Uses the average of all ring points
 */
function centroidFromPolygon(polygon: Polygon): Centroid {
  const ring = polygon.coordinates[0]; // Use outer ring
  let lat = 0;
  let lng = 0;

  for (const [lon, la] of ring) {
    lng += lon;
    lat += la;
  }

  return {
    lat: lat / ring.length,
    lng: lng / ring.length,
  };
}

/**
 * Calculate centroid from a MultiPolygon geometry
 * Uses the average of the first polygon's centroid
 */
function centroidFromMultiPolygon(multiPolygon: MultiPolygon): Centroid {
  if (multiPolygon.coordinates.length === 0) {
    throw new Error('MultiPolygon has no polygons');
  }

  // Calculate centroid from the first polygon
  const firstPolygon: Polygon = {
    type: 'Polygon',
    coordinates: multiPolygon.coordinates[0],
  };

  return centroidFromPolygon(firstPolygon);
}

/**
 * Calculate centroid of a GeoJSON geometry
 */
export function calculateCentroid(geometry: Geometry): Centroid {
  switch (geometry.type) {
    case 'Point':
      return centroidFromPoint(geometry);
    case 'Polygon':
      return centroidFromPolygon(geometry);
    case 'MultiPolygon':
      return centroidFromMultiPolygon(geometry);
    default:
      throw new Error(`Unsupported geometry type: ${(geometry as any).type}`);
  }
}
