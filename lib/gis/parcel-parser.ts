/**
 * Parser for parcel data in various formats
 * Supports GeoJSON FeatureCollection and other formats
 */

interface ParsedParcel {
  apn?: string;
  fullAddress?: string;
  city?: string;
  zipCode?: string;
  county?: string;
  geometry: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  properties?: Record<string, any>;
}

interface ParseResult {
  parcels: ParsedParcel[];
  errors: Array<{ index: number; error: string }>;
}

/**
 * Parse GeoJSON FeatureCollection
 */export function parseGeoJSON(data: any): ParseResult {
  const result: ParseResult = {
    parcels: [],
    errors: [],
  };

  if (!data || typeof data !== 'object') {
    result.errors.push({ index: 0, error: 'Invalid JSON' });
    return result;
  }

  // Support both FeatureCollection and single Feature
  const features = data.type === 'FeatureCollection' ? data.features : Array.isArray(data) ? data : [data];

  if (!Array.isArray(features)) {
    result.errors.push({ index: 0, error: 'Expected array of features or FeatureCollection' });
    return result;
  }

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];

    try {
      if (!feature.geometry) {
        result.errors.push({ index: i, error: 'Feature missing geometry' });
        continue;
      }

      const properties = feature.properties || {};

      const parcel: ParsedParcel = {
        apn: properties.apn || properties.APN || properties.parcel_id,
        fullAddress: properties.address || properties.fullAddress || properties.street,
        city: properties.city || properties.CITY,
        zipCode: properties.zip || properties.zipCode || properties.ZIP,
        county: properties.county || properties.COUNTY,
        geometry: feature.geometry,
        properties,
      };

      result.parcels.push(parcel);
    } catch (err) {
      result.errors.push({
        index: i,
        error: err instanceof Error ? err.message : 'Failed to parse feature',
      });
    }
  }

  return result;
}

/**
 * Parse CSV data with headers
 * Expected columns: apn, address/fullAddress, city, zipCode, geometry (as GeoJSON)
 */
export function parseCSV(csvText: string): ParseResult {
  const result: ParseResult = {
    parcels: [],
    errors: [],
  };

  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    result.errors.push({ index: 0, error: 'CSV must have header and at least one data row' });
    return result;
  }

  const header = lines[0]
    .split(',')
    .map((h) => h.trim().toLowerCase());

  const addressIdx = header.findIndex((h) => h === 'address' || h === 'fulladdress');
  const apnIdx = header.findIndex((h) => h === 'apn' || h === 'parcel_id');
  const cityIdx = header.findIndex((h) => h === 'city');
  const zipIdx = header.findIndex((h) => h === 'zip' || h === 'zipcode');
  const geometryIdx = header.findIndex((h) => h === 'geometry');

  for (let i = 1; i < lines.length; i++) {
    try {
      const parts = lines[i].split(',').map((p) => p.trim());

      if (geometryIdx === -1) {
        result.errors.push({
          index: i,
          error: 'CSV must include geometry column with GeoJSON',
        });
        continue;
      }

      let geometry;
      try {
        geometry = JSON.parse(parts[geometryIdx]);
      } catch {
        result.errors.push({
          index: i,
          error: 'Invalid GeoJSON in geometry column',
        });
        continue;
      }

      const parcel: ParsedParcel = {
        apn: apnIdx !== -1 ? parts[apnIdx] : undefined,
        fullAddress: addressIdx !== -1 ? parts[addressIdx] : undefined,
        city: cityIdx !== -1 ? parts[cityIdx] : undefined,
        zipCode: zipIdx !== -1 ? parts[zipIdx] : undefined,
        geometry,
      };

      result.parcels.push(parcel);
    } catch (err) {
      result.errors.push({
        index: i,
        error: err instanceof Error ? err.message : 'Failed to parse row',
      });
    }
  }

  return result;
}
