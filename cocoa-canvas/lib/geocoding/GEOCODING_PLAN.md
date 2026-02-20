# Geocoding Service Architecture Plan

## Overview
Pluggable geocoding service supporting multiple free APIs with a **Strategy + Registry pattern** for easy provider additions.

## Supported Free Geocoding Services

### 1. **Nominatim (OpenStreetMap)** ✅
- **Free**: Yes (no API key required)
- **Free Tier**: Unlimited with rate limits (1 request/second per IP)
- **Coverage**: Global, excellent for OSM data
- **Attribution**: Required (show "© OpenStreetMap contributors")
- **API**: `https://nominatim.openstreetmap.org/search`
- **Batch API**: No native batch, but can queue requests
- **Pros**: No signup, no keys, good accuracy for US addresses
- **Cons**: Strict rate limits, not ideal for bulk geocoding

### 2. **OpenCage Geocoder** ✅
- **Free**: Yes (2,500 requests/day)
- **API Key**: Optional (higher limits with key)
- **Coverage**: Global, aggregates multiple sources
- **API**: `https://api.opencagedata.com/geocode/v1/json`
- **Batch**: Not supported (but 2,500/day good for moderate use)
- **Pros**: Good accuracy, multiple data sources, generous free tier
- **Cons**: Key required for production use

### 3. **LocationIQ** ✅
- **Free**: Yes (5,000 requests/day)
- **API Key**: Required
- **Coverage**: Global, based on Nominatim but with more data
- **API**: `https://us1.locationiq.com/v1/search`
- **Batch**: `POST /batch` endpoint available
- **Pros**: Higher rate limits than Nominatim, batch API, good US coverage
- **Cons**: API key required

### 4. **Geoapify** ✅
- **Free**: Yes (3,000 requests/day)
- **API Key**: Required for production
- **Coverage**: Global with strong US/Europe coverage
- **API**: `https://api.geoapify.com/v1/geocode/search`
- **Batch**: Batch geocoding available
- **Pros**: Good balance of free tier and features
- **Cons**: Key required

### 5. **US Census Bureau Geocoder** 🇺🇸
- **Free**: Yes (unlimited for US addresses)
- **API Key**: Not required
- **Coverage**: US addresses only (excellent for voter data)
- **API**: `https://geocoding.geo.census.gov/geocoder/locations/addressbatch`
- **Batch**: Native batch API (up to 10,000 addresses per request)
- **Pros**: Unlimited, batch support, official government service
- **Cons**: US-only, requires CSV format

### 6. **Mapbox Geocoding** (Optional - paid but has free tier)
- **Free**: $0-$200/month credit (~600k requests)
- **API Key**: Required
- **Coverage**: Global
- **API**: `https://api.mapbox.com/geocoding/v5/mapbox.places`
- **Batch**: Batch endpoint available
- **Pros**: Very high accuracy, fast, batch support
- **Cons**: Eventually paid after free tier

## Architecture

### File Structure
```
lib/geocoding/
├── index.ts                    # Main geocoding service entry point
├── types.ts                    # Shared types and interfaces
├── registry.ts                 # Geocoder registry
├── providers/
│   ├── nominatim.ts           # OpenStreetMap Nominatim
│   ├── opencage.ts            # OpenCage Geocoder
│   ├── locationiq.ts          # LocationIQ
│   ├── geoapify.ts            # Geoapify
│   ├── census.ts              # US Census Bureau
│   └── mapbox.ts              # Mapbox (optional)
└── __tests__/
    ├── registry.test.ts
    ├── nominatim.test.ts
    └── integration.test.ts
```

### Core Types

```typescript
// lib/geocoding/types.ts
export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  confidence?: number;           // 0-1 confidence score
  matchType?: string;            // "exact", "partial", "approximate"
  components?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    county?: string;
    country?: string;
  };
  formattedAddress?: string;
  source?: string;               // Which provider returned this
}

export interface GeocodeError {
  code: string;                  // "RATE_LIMIT", "INVALID_ADDRESS", "NOT_FOUND", "API_ERROR"
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
  providerId: string;            // e.g., "nominatim", "opencage"
  providerName: string;          // Human readable
  isAvailable(): Promise<boolean>; // Check if API is accessible
  geocode(request: GeocodeRequest): Promise<GeocodeResult | null>;
  // Optional batch support
  batchGeocode?(requests: GeocodeRequest[]): Promise<(GeocodeResult | null)[]>;
}
```

### Registry Pattern
```typescript
// lib/geocoding/registry.ts
class GeocoderRegistry {
  private providers: Map<string, GeocoderProvider> = new Map();
  private primaryProvider: string = 'nominatim';
  private fallbackProviders: string[] = [];

  register(provider: GeocoderProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  setPrimary(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`Provider ${providerId} not registered`);
    }
    this.primaryProvider = providerId;
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
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }
}

export const geocoderRegistry = new GeocoderRegistry();
```

### Main Service with Retry/Fallback Logic
```typescript
// lib/geocoding/index.ts
export class GeocodingService {
  constructor(private registry: GeocoderRegistry) {}

  async geocode(
    request: GeocodeRequest,
    options?: {
      providerId?: string;        // Specific provider
      useFallback?: boolean;      // Try fallback providers on failure
      timeout?: number;           // Per-request timeout
    }
  ): Promise<GeocodeResult | null> {
    const providers = this._getProvidersInOrder(options?.providerId);

    for (const provider of providers) {
      try {
        const result = await this._withTimeout(
          provider.geocode(request),
          options?.timeout || 10000
        );
        if (result) {
          result.source = provider.providerId;
          return result;
        }
      } catch (error) {
        if (!options?.useFallback) throw error;
        // Log and continue to next provider
        console.warn(`Geocoding failed with ${provider.providerId}, trying next...`, error);
      }
    }

    return null;
  }

  async batchGeocode(
    requests: GeocodeRequest[],
    options?: {
      providerId?: string;
      batchSize?: number;         // For providers without native batch
      delay?: number;             // Delay between requests (ms)
    }
  ): Promise<(GeocodeResult | null)[]> {
    const provider = this.registry.getProvider(options?.providerId || 'primary');
    if (!provider) throw new Error('Provider not found');

    if (provider.batchGeocode && !options?.batchSize) {
      return provider.batchGeocode(requests);
    }

    // Fall back to sequential geocoding with rate limiting
    const results: (GeocodeResult | null)[] = [];
    const batchSize = options?.batchSize || 1;
    const delay = options?.delay || 100;

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(req => this.geocode(req, { providerId: options?.providerId }))
      );
      results.push(...batchResults);
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  private _getProvidersInOrder(specificProviderId?: string) {
    if (specificProviderId) {
      return [this.registry.getProvider(specificProviderId)].filter(Boolean);
    }
    const primary = this.registry.getProvider(this.registry.primaryProvider);
    const fallbacks = this.registry.fallbackProviders
      .map(id => this.registry.getProvider(id))
      .filter(Boolean);
    return [primary, ...fallbacks].filter(Boolean);
  }

  private _withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Geocoding timeout')), ms)
      ),
    ]);
  }
}

export const geocodingService = new GeocodingService(geocoderRegistry);
```

## Adding a New Geocoding Provider

### Implementation Steps

#### 1. Create Provider File
```typescript
// lib/geocoding/providers/newprovider.ts
import { GeocoderProvider, GeocodeRequest, GeocodeResult } from '../types';

export class NewProviderGeocoder implements GeocoderProvider {
  readonly providerId = 'newprovider';
  readonly providerName = 'New Provider Name';

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error('NewProvider API key required');
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`https://api.newprovider.com/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async geocode(request: GeocodeRequest): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      query: this._buildAddress(request),
      apikey: this.apiKey,
    });

    const response = await fetch(`https://api.newprovider.com/search?${params}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    if (!data.results?.length) return null;

    const result = data.results[0];
    return {
      address: result.formatted_address,
      latitude: result.lat,
      longitude: result.lon,
      confidence: result.confidence || 0.8,
      components: {
        street: result.address,
        city: result.city,
        state: result.state,
        zipCode: result.postcode,
      },
    };
  }

  private _buildAddress(request: GeocodeRequest): string {
    const parts = [
      request.address,
      request.city,
      request.state,
      request.zipCode,
    ].filter(Boolean);
    return parts.join(', ');
  }
}
```

#### 2. Register Provider
```typescript
// lib/geocoding/index.ts (or in a new registration file)
import { NewProviderGeocoder } from './providers/newprovider';

// In initialization code:
if (process.env.NEWPROVIDER_API_KEY) {
  const newProvider = new NewProviderGeocoder(process.env.NEWPROVIDER_API_KEY);
  geocoderRegistry.register(newProvider);
}
```

## Integration with API Routes

```typescript
// app/api/v1/gis/geocode/route.ts
export async function POST(request: NextRequest) {
  const auth = await validateProtectedRoute(request);
  if (!auth.isValid) return auth.response;

  const data = await request.json();
  
  // Single address
  if (data.address) {
    const result = await geocodingService.geocode(data, {
      useFallback: true,
      timeout: 5000,
    });
    return NextResponse.json({ success: true, data: result });
  }

  // Batch geocoding
  if (data.addresses) {
    const results = await geocodingService.batchGeocode(data.addresses, {
      delay: 100,
    });
    return NextResponse.json({ success: true, data: results });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
```

## Configuration

### Environment Variables
```bash
# Optional: API keys for providers (only set if using)
NOMINATIM_API_KEY=           # Not required for basic use
OPENCAGE_API_KEY=
LOCATIONIQ_API_KEY=
GEOAPIFY_API_KEY=
MAPBOX_API_KEY=
CENSUS_API_KEY=              # Not required

# Configuration
GEOCODING_PRIMARY_PROVIDER=nominatim    # Default provider
GEOCODING_FALLBACK_PROVIDERS=opencage,locationiq,geoapify
GEOCODING_TIMEOUT_MS=10000
GEOCODING_BATCH_SIZE=100
```

### Registration Order (app/layout.tsx or initialization file)
```typescript
if (process.env.NODE_ENV === 'production' || process.env.INIT_GEOCODERS) {
  // Free providers in order of preference
  geocoderRegistry.register(new NominatimGeocoder());
  
  if (process.env.LOCATIONIQ_API_KEY) {
    geocoderRegistry.register(new LocationIQGeocoder(process.env.LOCATIONIQ_API_KEY));
  }
  
  if (process.env.OPENCAGE_API_KEY) {
    geocoderRegistry.register(new OpenCageGeocoder(process.env.OPENCAGE_API_KEY));
  }
  
  if (process.env.GEOAPIFY_API_KEY) {
    geocoderRegistry.register(new GeoapifyGeocoder(process.env.GEOAPIFY_API_KEY));
  }
  
  if (process.env.CENSUS_API_KEY) {
    geocoderRegistry.register(new CensusGeocoder(process.env.CENSUS_API_KEY));
  }

  // Configure failover
  geocoderRegistry.setPrimary(process.env.GEOCODING_PRIMARY_PROVIDER || 'nominatim');
  geocoderRegistry.setFallbacks(
    (process.env.GEOCODING_FALLBACK_PROVIDERS || 'opencage,locationiq').split(',')
  );
}
```

## Database Integration

### Update Household on Successful Geocode
```typescript
// In geocoding service or job processor
const result = await geocodingService.geocode({ address, city, state, zipCode });
if (result) {
  await prisma.household.update({
    where: { id: householdId },
    data: {
      latitude: result.latitude,
      longitude: result.longitude,
      geocoded: true,
      geocodedAt: new Date(),
    },
  });
}
```

### Batch Geocoding Job
```typescript
// app/api/v1/gis/geocode/batch/route.ts
export async function POST(request: NextRequest) {
  const auth = await validateProtectedRoute(request);
  if (!auth.isValid) return auth.response;

  const { householdIds } = await request.json();

  // Create async job
  const job = await createJob('geocode_households', auth.user.userId, {
    householdIds,
  });

  // Queue it
  await getGeocodingQueue().add('batch-geocode', { jobId: job.id });

  return NextResponse.json({ success: true, jobId: job.id });
}
```

## Testing Strategy

```typescript
// lib/geocoding/__tests__/registry.test.ts
describe('GeocoderRegistry', () => {
  it('registers and retrieves providers', () => {
    const provider = new MockGeocoder();
    registry.register(provider);
    expect(registry.getProvider('mock')).toBe(provider);
  });

  it('prioritizes primary provider', () => {
    registry.setPrimary('opencage');
    expect(registry.primaryProvider).toBe('opencage');
  });
});

// lib/geocoding/__tests__/nominatim.test.ts
describe('NominatimGeocoder', () => {
  it('geocodes valid addresses', async () => {
    const result = await geocoder.geocode({
      address: '123 Main St',
      city: 'Oakland',
      state: 'CA',
    });
    expect(result?.latitude).toBeGreaterThan(0);
    expect(result?.longitude).toBeLessThan(0); // Western hemisphere
  });

  it('returns null for invalid addresses', async () => {
    const result = await geocoder.geocode({
      address: 'XYZ Invalid Address 12345',
    });
    expect(result).toBeNull();
  });
});
```

## Benefits

✅ **Pluggable**: Add providers by creating one file + registering  
✅ **Resilient**: Automatic fallback to secondary providers  
✅ **Cost-effective**: Use free tiers, easily add paid when needed  
✅ **Rate-limit aware**: Built-in delays and timeout handling  
✅ **Batch-ready**: Supports both native batch and sequential geocoding  
✅ **Testable**: Mock providers for testing  
✅ **Configurable**: Environment-based provider selection and ordering  

## Next Steps

1. Create `lib/geocoding/types.ts` with core interfaces
2. Create `lib/geocoding/registry.ts` with provider registry
3. Implement Nominatim provider (free, no auth required)
4. Implement LocationIQ provider (high free tier)
5. Create main `lib/geocoding/index.ts` service
6. Add API route for geocoding
7. Create job processor for batch geocoding
8. Add tests for each provider
9. Documentation with example usage
