/**
 * Catalog Geocoding Provider
 * 
 * Uses a geocoding dataset from the catalog (local PostGIS table or remote ESRI service)
 * to geocode addresses. The provider queries the dataset for matching addresses and
 * returns coordinates.
 * 
 * Configuration:
 * - datasetId: ID of the GISDataset to use (must have datasetType "Geocoding")
 * - addressField: Field name for street address
 * - cityField: Field name for city
 * - stateField: Field name for state
 * - matchTolerance: "exact" or "fuzzy" (default: "fuzzy")
 */

import { GeocoderProvider, GeocodeRequest, GeocodeResult, CustomProperty } from '../types';
import { prisma } from '@/lib/prisma';

interface CatalogGeocoderConfig {
  datasetId: string;
  addressField: string;
  cityField?: string;
  stateField?: string;
  zipCodeField?: string;
  matchTolerance?: 'exact' | 'fuzzy';
}

export class CatalogGeocoderProvider implements GeocoderProvider {
  providerId = 'catalog';
  providerName = 'Catalog Geocoding Dataset';

  private config: CatalogGeocoderConfig;

  constructor(config: CatalogGeocoderConfig) {
    this.config = {
      addressField: 'address',
      cityField: 'city',
      stateField: 'state',
      zipCodeField: 'zipcode',
      matchTolerance: 'fuzzy',
      ...config,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.datasetId) {
        return false;
      }

      // Check if dataset exists and is active
      const dataset = await prisma.gISDataset.findUnique({
        where: { id: this.config.datasetId },
        include: { 
          datasetType: true,
          sourceRemoteDataset: true,
        },
      });

      if (!dataset || !dataset.isActive) {
        return false;
      }

      // Verify it's a geocoding dataset
      if (dataset.datasetType.name !== 'Geocoding') {
        console.warn(
          `[Catalog Geocoder] Dataset ${this.config.datasetId} is not a Geocoding type`
        );
        return false;
      }

      // Verify it has a data source (either local table or remote service)
      if (!dataset.sourceTable && !dataset.sourceRemoteDataset) {
        console.warn(
          `[Catalog Geocoder] Dataset ${this.config.datasetId} has no data source`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Catalog Geocoder] Availability check failed:', error);
      return false;
    }
  }

  async geocode(request: GeocodeRequest): Promise<GeocodeResult | null> {
    try {
      if (!this.config.datasetId) {
        throw new Error('Catalog geocoder requires datasetId in provider config');
      }

      // Get the dataset
      const dataset = await prisma.gISDataset.findUnique({
        where: { id: this.config.datasetId },
        include: { sourceRemoteDataset: true },
      });

      if (!dataset) {
        throw new Error(`Dataset not found: ${this.config.datasetId}`);
      }

      // Query local PostGIS table or remote service
      if (dataset.sourceTable) {
        return await this.geocodeFromLocalTable(dataset.sourceTable, request);
      } else if (dataset.sourceRemoteDataset) {
        return await this.geocodeFromRemoteService(dataset.sourceRemoteDataset, request);
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[Catalog Geocoder] Error geocoding address:', error);
      throw new Error(`[Catalog Geocoder] ${message}`);
    }
  }

  /**
   * Geocode using a local PostGIS table
   */
  private async geocodeFromLocalTable(
    tableName: string,
    request: GeocodeRequest
  ): Promise<GeocodeResult | null> {
    try {
      // Build WHERE clause based on match tolerance
      const conditions: string[] = [];
      const isFuzzy = this.config.matchTolerance === 'fuzzy';

      // Address matching
      if (isFuzzy) {
        conditions.push(
          `LOWER("${this.config.addressField}") LIKE LOWER('%${this.sanitizeInput(request.address)}%')`
        );
      } else {
        conditions.push(
          `LOWER("${this.config.addressField}") = LOWER('${this.sanitizeInput(request.address)}')`
        );
      }

      // City matching
      if (this.config.cityField && request.city) {
        if (isFuzzy) {
          conditions.push(
            `LOWER("${this.config.cityField}") LIKE LOWER('%${this.sanitizeInput(request.city)}%')`
          );
        } else {
          conditions.push(
            `LOWER("${this.config.cityField}") = LOWER('${this.sanitizeInput(request.city)}')`
          );
        }
      }

      // State matching
      if (this.config.stateField && request.state) {
        conditions.push(
          `LOWER("${this.config.stateField}") = LOWER('${this.sanitizeInput(request.state)}')`
        );
      }

      // Zip code matching
      if (this.config.zipCodeField && request.zipCode) {
        conditions.push(
          `"${this.config.zipCodeField}" = '${this.sanitizeInput(request.zipCode)}'`
        );
      }

      const whereClause = conditions.join(' AND ');

      // Query the table (limit 1 for best match)
      const query = `
        SELECT 
          "${this.config.addressField}" as address,
          ${this.config.cityField ? `"${this.config.cityField}" as city,` : ''}
          ${this.config.stateField ? `"${this.config.stateField}" as state,` : ''}
          ${this.config.zipCodeField ? `"${this.config.zipCodeField}" as zip,` : ''}
          ST_Y(geom) as latitude,
          ST_X(geom) as longitude
        FROM ${tableName}
        WHERE ${whereClause}
        LIMIT 1
      `;

      const result = await prisma.$queryRawUnsafe<any[]>(query);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];

      return {
        address: request.address,
        latitude: row.latitude,
        longitude: row.longitude,
        confidence: isFuzzy ? 0.8 : 1.0,
        matchType: isFuzzy ? 'approximate' : 'exact',
        components: {
          street: row.address,
          city: row.city,
          state: row.state,
          zipCode: row.zip,
        },
        formattedAddress: [row.address, row.city, row.state, row.zip]
          .filter(Boolean)
          .join(', '),
        source: 'catalog',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[Catalog Geocoder] Error querying local table:', error);
      throw new Error(`Local table query failed: ${message}`);
    }
  }

  /**
   * Geocode using a remote ESRI service
   */
  private async geocodeFromRemoteService(
    remoteDataset: any,
    request: GeocodeRequest
  ): Promise<GeocodeResult | null> {
    try {
      // Build ESRI query
      const conditions: string[] = [];
      const isFuzzy = this.config.matchTolerance === 'fuzzy';

      // Address matching
      if (isFuzzy) {
        conditions.push(
          `LOWER(${this.config.addressField}) LIKE LOWER('%${this.sanitizeInput(request.address)}%')`
        );
      } else {
        conditions.push(
          `LOWER(${this.config.addressField}) = LOWER('${this.sanitizeInput(request.address)}')`
        );
      }

      // City matching
      if (this.config.cityField && request.city) {
        if (isFuzzy) {
          conditions.push(
            `LOWER(${this.config.cityField}) LIKE LOWER('%${this.sanitizeInput(request.city)}%')`
          );
        } else {
          conditions.push(
            `LOWER(${this.config.cityField}) = LOWER('${this.sanitizeInput(request.city)}')`
          );
        }
      }

      // State matching
      if (this.config.stateField && request.state) {
        conditions.push(
          `LOWER(${this.config.stateField}) = LOWER('${this.sanitizeInput(request.state)}')`
        );
      }

      // Zip code matching
      if (this.config.zipCodeField && request.zipCode) {
        conditions.push(
          `${this.config.zipCodeField} = '${this.sanitizeInput(request.zipCode)}'`
        );
      }

      const whereClause = conditions.join(' AND ');

      // Query ESRI service
      const featureUrl = `${remoteDataset.serviceUrl}/${remoteDataset.layerId}/query`;
      const queryParams = new URLSearchParams({
        where: whereClause,
        outFields: '*',
        f: 'geojson',
        resultRecordCount: '1',
      });

      const response = await fetch(`${featureUrl}?${queryParams}`);

      if (!response.ok) {
        let responseBody = '';
        try {
          responseBody = await response.text();
        } catch {
          responseBody = '';
        }
        throw new Error(
          `Remote service error ${response.status}: ${response.statusText}${responseBody ? ` - ${responseBody.slice(0, 300)}` : ''}`
        );
      }

      const data = await response.json();

      if (data?.error) {
        const arcgisMessage = data.error?.message || 'ArcGIS query failed';
        const arcgisDetails = Array.isArray(data.error?.details)
          ? data.error.details.join('; ')
          : '';
        throw new Error(
          `ArcGIS error: ${arcgisMessage}${arcgisDetails ? ` - ${arcgisDetails}` : ''}`
        );
      }

      const features = data.features || [];

      if (features.length === 0) {
        return null;
      }

      const feature = features[0];
      const props = feature.properties || {};
      const geometry = feature.geometry;

      // Extract coordinates from GeoJSON geometry
      let latitude: number;
      let longitude: number;

      if (geometry.type === 'Point') {
        [longitude, latitude] = geometry.coordinates;
      } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        // Calculate centroid for polygons
        const coords =
          geometry.type === 'Polygon'
            ? geometry.coordinates[0]
            : geometry.coordinates[0][0];
        
        longitude = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length;
        latitude = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length;
      } else {
        console.error('[Catalog Geocoder] Unsupported geometry type:', geometry.type);
        return null;
      }

      return {
        address: request.address,
        latitude,
        longitude,
        confidence: isFuzzy ? 0.8 : 1.0,
        matchType: isFuzzy ? 'approximate' : 'exact',
        components: {
          street: props[this.config.addressField],
          city: this.config.cityField ? props[this.config.cityField] : undefined,
          state: this.config.stateField ? props[this.config.stateField] : undefined,
          zipCode: this.config.zipCodeField ? props[this.config.zipCodeField] : undefined,
        },
        formattedAddress: [
          props[this.config.addressField],
          this.config.cityField ? props[this.config.cityField] : null,
          this.config.stateField ? props[this.config.stateField] : null,
          this.config.zipCodeField ? props[this.config.zipCodeField] : null,
        ]
          .filter(Boolean)
          .join(', '),
        source: 'catalog',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[Catalog Geocoder] Error querying remote service:', error);
      throw new Error(`Remote service query failed: ${message}`);
    }
  }

  /**
   * Sanitize input to prevent SQL injection
   */
  private sanitizeInput(input: string): string {
    return input.replace(/'/g, "''").trim();
  }

  getCustomProperties(): CustomProperty[] {
    return [
      {
        name: 'datasetId',
        label: 'Catalog Dataset',
        type: 'string',
        description: 'ID of the Geocoding dataset from the catalog',
        required: true,
        default: '',
      },
      {
        name: 'addressField',
        label: 'Address Field',
        type: 'string',
        description: 'Field name for street address',
        required: true,
        default: 'address',
      },
      {
        name: 'cityField',
        label: 'City Field',
        type: 'string',
        description: 'Field name for city',
        required: false,
        default: 'city',
      },
      {
        name: 'stateField',
        label: 'State Field',
        type: 'string',
        description: 'Field name for state',
        required: false,
        default: 'state',
      },
      {
        name: 'zipCodeField',
        label: 'Zip Code Field',
        type: 'string',
        description: 'Field name for zip code',
        required: false,
        default: 'zipcode',
      },
      {
        name: 'matchTolerance',
        label: 'Match Tolerance',
        type: 'select',
        description: 'How strictly to match addresses',
        required: false,
        default: 'fuzzy',
        options: [
          { label: 'Exact Match', value: 'exact' },
          { label: 'Fuzzy Match', value: 'fuzzy' },
        ],
      },
    ];
  }
}

/**
 * Factory function to create a catalog geocoder from config
 */
export function createCatalogGeocoder(config: string): CatalogGeocoderProvider {
  const parsedConfig: CatalogGeocoderConfig = JSON.parse(config);

  if (!parsedConfig.datasetId) {
    throw new Error('Catalog geocoder requires datasetId in provider config');
  }

  return new CatalogGeocoderProvider(parsedConfig);
}

/**
 * Export a default instance (will be configured from GeocoderProvider DB record)
 */
export const catalogGeocoder = new CatalogGeocoderProvider({
  datasetId: '', // Will be set from config
  addressField: 'address',
  cityField: 'city',
  stateField: 'state',
  zipCodeField: 'zipcode',
  matchTolerance: 'fuzzy',
});
