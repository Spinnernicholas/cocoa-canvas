/**
 * US Census Bureau Batch Geocoder Provider
 * 
 * Uses the free US Census Geocoding Services API
 * https://geocoding.geo.census.gov/geocoder/
 * 
 * Features:
 * - Free to use, no API key required
 * - Supports batch geocoding (up to 10,000 addresses per request)
 * - Returns coordinates and matched addresses
 * - Limited to US addresses only
 */

import { GeocoderProvider, GeocodeRequest, GeocodeResult } from '../types';

export class CensusGeocoderProvider implements GeocoderProvider {
  providerId = 'census';
  providerName = 'US Census Geocoder';

  private batchApiUrl =
    'https://geocoding.geo.census.gov/geocoder/locations/addressbatch';
  private singleApiUrl =
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

  async isAvailable(): Promise<boolean> {
    try {
      // Simple connectivity check to Census API
      const response = await fetch(this.singleApiUrl + '?benchmark=Public_AR_Current&format=json&address=1+Main+St%2C+Washington%2C+DC', {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('[Census Geocoder] Availability check failed:', error);
      return false;
    }
  }

  async geocode(request: GeocodeRequest): Promise<GeocodeResult | null> {
    try {
      // Build address string
      const addressParts = [request.address];
      if (request.city) addressParts.push(request.city);
      if (request.state) addressParts.push(request.state);
      if (request.zipCode) addressParts.push(request.zipCode);
      const fullAddress = addressParts.join(', ');

      // Call single address geocoding endpoint
      const params = new URLSearchParams({
        address: fullAddress,
        benchmark: 'Public_AR_Current', // Current benchmark
        format: 'json',
      });

      const response = await fetch(`${this.singleApiUrl}?${params}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.error('[Census Geocoder] API error:', response.status);
        return null;
      }

      const data = await response.json();

      // Parse Census response
      if (
        data.result?.addressMatches &&
        Array.isArray(data.result.addressMatches) &&
        data.result.addressMatches.length > 0
      ) {
        const match = data.result.addressMatches[0];
        const coords = match.coordinates;

        return {
          address: fullAddress,
          latitude: coords.y,
          longitude: coords.x,
          confidence: this.calculateConfidence(match),
          matchType: match.matchedAddress ? 'exact' : 'approximate',
          formattedAddress: match.matchedAddress || fullAddress,
          components: {
            street: match.addressComponents?.streetName,
            city: match.addressComponents?.city,
            state: match.addressComponents?.state,
            zipCode: match.addressComponents?.zip,
            county: undefined,
            country: 'USA',
          },
          source: 'census',
        };
      }

      return null;
    } catch (error) {
      console.error('[Census Geocoder] Error geocoding address:', error);
      return null;
    }
  }

  async batchGeocode(
    requests: GeocodeRequest[]
  ): Promise<(GeocodeResult | null)[]> {
    try {
      // Census batch API requires CSV format:
      // Unique ID, Street address, City, State, ZIP
      const csvLines = requests.map((req, index) => {
        const id = index + 1;
        const street = this.escapeCsv(req.address);
        const city = this.escapeCsv(req.city || '');
        const state = this.escapeCsv(req.state || '');
        const zip = this.escapeCsv(req.zipCode || '');
        return `${id},${street},${city},${state},${zip}`;
      });

      const csvContent = csvLines.join('\n');

      // Create form data
      const formData = new FormData();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('addressFile', blob, 'addresses.csv');
      formData.append('benchmark', 'Public_AR_Current');
      formData.append('vintage', 'Current_Current');

      // Send batch request
      const response = await fetch(this.batchApiUrl, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000), // 60 second timeout for batch
      });

      if (!response.ok) {
        console.error('[Census Geocoder] Batch API error:', response.status);
        return requests.map(() => null);
      }

      const responseText = await response.text();

      // Parse CSV response
      // Format: ID,"Input Address",Match,Exact/Non_Exact,Matched Address,Coords,TIGER Line ID,Side
      const results = this.parseBatchResponse(responseText, requests);
      return results;
    } catch (error) {
      console.error('[Census Geocoder] Batch geocoding error:', error);
      return requests.map(() => null);
    }
  }

  private parseBatchResponse(
    csvText: string,
    originalRequests: GeocodeRequest[]
  ): (GeocodeResult | null)[] {
    const lines = csvText.trim().split('\n');
    const results: (GeocodeResult | null)[] = new Array(
      originalRequests.length
    ).fill(null);

    for (const line of lines) {
      try {
        // Parse CSV line (handle quoted fields)
        const fields = this.parseCsvLine(line);

        if (fields.length < 6) continue;

        const id = parseInt(fields[0]) - 1; // Convert back to 0-based index
        const match = fields[2]; // "Match" or "No_Match"
        const matchType = fields[3]; // "Exact" or "Non_Exact"
        const matchedAddress = fields[4];
        const coords = fields[5]; // "longitude,latitude"

        if (match === 'Match' && coords) {
          const [longitude, latitude] = coords.split(',').map(parseFloat);

          if (!isNaN(latitude) && !isNaN(longitude) && id >= 0 && id < originalRequests.length) {
            const originalReq = originalRequests[id];
            const fullAddress = [
              originalReq.address,
              originalReq.city,
              originalReq.state,
              originalReq.zipCode,
            ]
              .filter(Boolean)
              .join(', ');

            results[id] = {
              address: fullAddress,
              latitude,
              longitude,
              confidence: matchType === 'Exact' ? 1.0 : 0.8,
              matchType: matchType === 'Exact' ? 'exact' : 'approximate',
              formattedAddress: matchedAddress || fullAddress,
              source: 'census',
              components: {
                country: 'USA',
              },
            };
          }
        }
      } catch (error) {
        console.error('[Census Geocoder] Error parsing line:', error);
      }
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    fields.push(currentField.trim());
    return fields;
  }

  private escapeCsv(value: string): string {
    if (!value) return '';
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private calculateConfidence(match: any): number {
    // Census API doesn't provide a direct confidence score
    // Use match type as a proxy
    if (!match) return 0;
    
    // If it's an exact match with all components, high confidence
    if (match.matchedAddress && match.addressComponents) {
      return 0.95;
    }
    
    return 0.8;
  }
}

// Export singleton instance
export const censusGeocoder = new CensusGeocoderProvider();
