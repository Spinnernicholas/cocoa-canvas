# Geocoding Providers

This directory contains geocoding provider implementations for Cocoa Canvas. Providers connect to external geocoding APIs to convert addresses into latitude/longitude coordinates.

## Available Providers

### US Census Geocoder (`census`)

**Status:** ✅ Implemented and enabled by default

- **Provider:** US Census Bureau
- **API:** https://geocoding.geo.census.gov/geocoder/
- **Cost:** Free, no API key required
- **Coverage:** United States only
- **Features:**
  - Single address geocoding
  - Batch geocoding (up to 10,000 addresses per request)
  - High accuracy for US addresses
- **Rate Limits:** Generous (exact limits not published)
- **Implementation:** `providers/census.ts`

**Configuration:**
```json
{
  "baseUrl": "https://geocoding.geo.census.gov/geocoder",
  "benchmark": "Public_AR_Current",
  "vintage": "Current_Current",
  "maxBatchSize": 10000
}
```

**Usage:**
- No setup required - works out of the box
- Best for US-based political campaigns
- Recommended as primary provider for US addresses

### Nominatim (OpenStreetMap) - Coming Soon

- **Provider:** OpenStreetMap
- **Cost:** Free, no API key required
- **Coverage:** Worldwide
- **Rate Limits:** 1 request per second

### LocationIQ - Coming Soon

- **Provider:** LocationIQ
- **Cost:** Free tier available (requires API key)
- **Coverage:** Worldwide
- **Rate Limits:** 2 requests per second (free tier)

## Adding a New Provider

To add a new geocoding provider:

1. **Create provider file** in `providers/` directory:
   ```typescript
   import { GeocoderProvider, GeocodeRequest, GeocodeResult } from '../types';
   
   export class MyGeocoderProvider implements GeocoderProvider {
     providerId = 'my-geocoder';
     providerName = 'My Geocoder Service';
     
     async isAvailable(): Promise<boolean> {
       // Check if provider is accessible
       return true;
     }
     
     async geocode(request: GeocodeRequest): Promise<GeocodeResult | null> {
       // Implement single address geocoding
     }
     
     async batchGeocode?(requests: GeocodeRequest[]): Promise<(GeocodeResult | null)[]> {
       // Optional: Implement batch geocoding
     }
   }
   
   export const myGeocoder = new MyGeocoderProvider();
   ```

2. **Register provider** in `registry.ts`:
   ```typescript
   import { myGeocoder } from './providers/my-geocoder';
   
   constructor() {
     this.register(censusGeocoder);
     this.register(myGeocoder); // Add this line
   }
   ```

3. **Export provider** in `index.ts`:
   ```typescript
   export { myGeocoder } from './providers/my-geocoder';
   ```

4. **Add to database** via Admin UI or seed script:
   ```typescript
   await prisma.geocoderProvider.create({
     data: {
       providerId: 'my-geocoder',
       providerName: 'My Geocoder Service',
       description: 'Description of the service',
       isEnabled: true,
       isPrimary: false,
       priority: 10,
       config: JSON.stringify({
         apiKey: 'your-api-key',
         baseUrl: 'https://api.example.com',
       }),
     },
   });
   ```

## Managing Providers

### Via Admin UI

1. Navigate to **Admin → Integrations → Geocoder Settings**
2. View all configured providers
3. Add new providers with custom configuration
4. Set primary provider (used by default for geocoding jobs)
5. Enable/disable providers without deleting them
6. View usage statistics

### Via Code

```typescript
import { geocoderRegistry, geocodingService } from '@/lib/geocoding';

// List all providers
const providers = geocoderRegistry.listProviders();

// Get primary provider
const primary = geocoderRegistry.getPrimary();

// Geocode using specific provider
const result = await geocodingService.geocode(
  { address: '1600 Pennsylvania Ave', city: 'Washington', state: 'DC' },
  { providerId: 'census' }
);

// Batch geocode
const results = await geocodingService.batchGeocode([
  { address: '1 Main St', city: 'Boston', state: 'MA' },
  { address: '2 Market St', city: 'San Francisco', state: 'CA' },
]);
```

## Testing Providers

Test provider availability:

```typescript
const isAvailable = await censusGeocoder.isAvailable();
console.log('Census geocoder available:', isAvailable);
```

## Seeding Default Providers

Run the seed script to set up default providers in the database:

```bash
npx tsx prisma/seeds/geocoders.ts
```

This creates:
- US Census Geocoder (enabled, primary)
- Nominatim (disabled, placeholder)
- LocationIQ (disabled, placeholder)

## Architecture

```
lib/geocoding/
├── index.ts              # Main service and exports
├── registry.ts           # Provider registry
├── types.ts             # TypeScript interfaces
└── providers/
    ├── census.ts        # US Census implementation
    ├── nominatim.ts     # Coming soon
    └── locationiq.ts    # Coming soon
```

**Flow:**
1. User creates geocoding job via UI
2. Job processor calls `geocodingService.batchGeocode()`
3. Service looks up provider from registry
4. Provider makes API call to external service
5. Results saved to database with provider tracking

## Best Practices

1. **Use batch geocoding** when processing large datasets (more efficient)
2. **Set fallback providers** for redundancy
3. **Monitor usage statistics** in Admin UI
4. **Respect rate limits** - Census has generous limits but not unlimited
5. **Cache results** - Don't re-geocode addresses unnecessarily (marked with `geocoded: true`)
6. **Handle failures gracefully** - Log errors but don't stop entire job

## Troubleshooting

**Problem:** Geocoding job fails with "No provider found"

**Solution:** Check that:
- Provider is registered in code (`registry.ts`)
- Provider exists in database (`GeocoderProvider` table)
- Provider is enabled (`isEnabled: true`)

**Problem:** Census geocoder returns no results

**Solution:**
- Verify address format (US addresses only)
- Check address components are valid
- Test address manually: https://geocoding.geo.census.gov/geocoder/

**Problem:** Rate limit errors

**Solution:**
- Increase delay between requests in job processor
- Switch to batch API for bulk operations
- Use provider with higher rate limits
