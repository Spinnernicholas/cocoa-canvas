/**
 * Geocoding Service - Main Entry Point
 *
 * Provides a unified interface for geocoding addresses using configured providers.
 */

import { GeocodeRequest, GeocodeResult } from './types';
import { geocoderRegistry } from './registry';

/**
 * Main geocoding service
 */
class GeocodingService {
  async geocode(
    request: GeocodeRequest,
    options?: {
      providerId?: string;
      useFallback?: boolean;
      timeout?: number;
    }
  ): Promise<GeocodeResult | null> {
    const providerId = options?.providerId || geocoderRegistry.getPrimaryId();
    const provider = geocoderRegistry.getProvider(providerId);

    if (!provider) {
      console.error(`[Geocoding Service] Provider not found: ${providerId}`);
      return null;
    }

    try {
      const result = await provider.geocode(request);
      return result;
    } catch (error) {
      console.error('[Geocoding Service] Error geocoding:', error);
      return null;
    }
  }

  async batchGeocode(
    requests: GeocodeRequest[],
    options?: {
      providerId?: string;
      batchSize?: number;
      delay?: number;
    }
  ): Promise<(GeocodeResult | null)[]> {
    const providerId = options?.providerId || geocoderRegistry.getPrimaryId();
    const provider = geocoderRegistry.getProvider(providerId);

    if (!provider) {
      console.error(`[Geocoding Service] Provider not found: ${providerId}`);
      return requests.map(() => null);
    }

    // Use batch method if available, otherwise fallback to individual geocoding
    if (provider.batchGeocode) {
      try {
        return await provider.batchGeocode(requests);
      } catch (error) {
        console.error('[Geocoding Service] Batch geocoding error:', error);
        return requests.map(() => null);
      }
    }

    // Fallback: geocode one at a time
    const results: (GeocodeResult | null)[] = [];
    for (const request of requests) {
      try {
        const result = await provider.geocode(request);
        results.push(result);

        // Add delay between requests if specified
        if (options?.delay) {
          await new Promise((resolve) => setTimeout(resolve, options.delay));
        }
      } catch (error) {
        console.error('[Geocoding Service] Error geocoding:', error);
        results.push(null);
      }
    }

    return results;
  }

  /**
   * Get statistics about available providers
   */
  async getProviderStats() {
    const providers = geocoderRegistry.listProviders();
    const stats = await Promise.all(
      providers.map(async (provider) => ({
        providerId: provider.providerId,
        providerName: provider.providerName,
        isAvailable: await provider.isAvailable().catch(() => false),
        supportsBatch: !!provider.batchGeocode,
      }))
    );
    return stats;
  }
}

export const geocodingService = new GeocodingService();

/**
 * Re-export for external use
 */
export { GeocoderRegistry } from './registry';
export { geocoderRegistry } from './registry';
export { censusGeocoder } from './providers/census';
export * from './types';
