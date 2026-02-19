/**
 * Geocoder Registry
 *
 * Manages multiple geocoding providers with primary/fallback support.
 * Providers can be configured dynamically via the admin interface.
 */

import { GeocoderProvider } from './types';
import { censusGeocoder } from './providers/census';
import { catalogGeocoder } from './providers/catalog';

export class GeocoderRegistry {
  private providers: Map<string, GeocoderProvider> = new Map();
  private primaryProvider: string = 'census'; // Default to Census geocoder
  private fallbackProviders: string[] = [];

  constructor() {
    // Register default providers
    this.register(censusGeocoder);
    this.register(catalogGeocoder);
  }

  register(provider: GeocoderProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  setPrimary(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not registered`);
    }
    this.primaryProvider = providerId;
  }

  getPrimary(): GeocoderProvider | null {
    return this.providers.get(this.primaryProvider) || null;
  }

  getPrimaryId(): string {
    return this.primaryProvider;
  }

  setFallbacks(providerIds: string[]): void {
    for (const id of providerIds) {
      if (!this.providers.has(id)) {
        throw new Error(`Provider ${id} not registered`);
      }
    }
    this.fallbackProviders = providerIds;
  }

  getProvider(providerId: string): GeocoderProvider | null {
    return this.providers.get(providerId) || null;
  }

  listProviders(): GeocoderProvider[] {
    return Array.from(this.providers.values());
  }

  async getAvailableProviders(): Promise<GeocoderProvider[]> {
    const providers = this.listProviders();
    const available: GeocoderProvider[] = [];
    for (const provider of providers) {
      try {
        if (await provider.isAvailable()) {
          available.push(provider);
        }
      } catch (error) {
        console.warn(`Provider ${provider.providerId} check failed:`, error);
      }
    }
    return available;
  }
}

export const geocoderRegistry = new GeocoderRegistry();
