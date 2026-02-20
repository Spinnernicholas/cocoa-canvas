/**
 * Geocoding Service Types
 */

export interface CustomProperty {
  name: string; // e.g., "batchSize"
  label: string; // e.g., "Batch Size"
  type: 'number' | 'string' | 'boolean' | 'select';
  description: string;
  default: any;
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: any }>;
}

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  confidence?: number; // 0-1 confidence score
  matchType?: string; // "exact", "partial", "approximate"
  components?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
    country?: string;
  };
  formattedAddress?: string;
  source?: string; // Which provider returned this
}

export interface GeocodeError {
  code: string; // "RATE_LIMIT", "INVALID_ADDRESS", "NOT_FOUND", "API_ERROR"
  message: string;
  retryable: boolean;
}

export interface GeocodeRequest {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface GeocoderProvider {
  providerId: string; // e.g., "nominatim", "opencage"
  providerName: string; // Human readable
  isAvailable(): Promise<boolean>;
  geocode(request: GeocodeRequest): Promise<GeocodeResult | null>;
  batchGeocode?(
    requests: GeocodeRequest[]
  ): Promise<(GeocodeResult | null)[]>;
  getCustomProperties?(): CustomProperty[];
}
