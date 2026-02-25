/**
 * ArcGIS Library Integration Examples for Cocoa Canvas
 * 
 * This file demonstrates how to use the @/lib/gis/arcgis library
 * in the cocoa-canvas application for scraping ArcGIS web apps.
 */

import { resolveArcGIS, normalizeArcGISUrl } from '@/lib/gis/arcgis/index';

/**
 * Example 1: Scraping a Web App Viewer
 * 
 * This shows how to extract the structure of an ArcGIS Web App
 * for use with custom Leaflet maps or other viewers.
 */
export async function scrapeWebAppStructure(webAppUrl: string) {
  try {
    const result = await resolveArcGIS(webAppUrl, {
      concurrency: 8,
    });

    console.log('Web App Structure:');
    console.log(`- Items: ${result.lists.items.length}`);
    console.log(`- Services: ${result.lists.services.length}`);
    console.log(`- Layers: ${result.lists.layers.length}`);
    console.log(`- Warnings: ${result.warnings.length}`);

    // Access the flattened structure for processing
    return {
      items: result.lists.items,
      services: result.lists.services,
      layers: result.lists.layers,
      warnings: result.warnings,
    };
  } catch (error) {
    console.error('Failed to scrape web app:', error);
    throw error;
  }
}

/**
 * Example 2: URL Normalization
 * 
 * Shows how to normalize different ArcGIS URL formats
 * (item pages, REST endpoints, web app viewer URLs, etc.)
 */
export function normalizeAndParseUrl(url: string) {
  const targets = normalizeArcGISUrl(url);

  console.log(`Normalized ${targets.length} target(s) from URL:`);

  for (const target of targets) {
    console.log(`- Kind: ${target.kind}`);
    console.log(`  Portal: ${target.portalBaseUrl}`);

    if (target.kind === 'item' && target.itemId) {
      console.log(`  Item ID: ${target.itemId}`);
    }

    if ('serviceUrl' in target) {
      console.log(`  Service URL: ${target.serviceUrl}`);
    }
  }

  return targets;
}

/**
 * Example 3: Integration with API Route
 * 
 * This shows how to create an API endpoint that scrapes
 * a web app and returns the structure as JSON.
 * 
 * Usage in an API route:
 * 
 * ```typescript
 * // app/api/arcgis/scrape/route.ts
 * import { scrapeWebAppStructure } from '@/lib/gis/arcgis/examples';
 * 
 * export async function POST(request: Request) {
 *   const { url } = await request.json();
 *   
 *   try {
 *     const structure = await scrapeWebAppStructure(url);
 *     return Response.json(structure);
 *   } catch (error) {
 *     return Response.json(
 *       { error: String(error) },
 *       { status: 500 }
 *     );
 *   }
 * }
 * ```
 */

/**
 * Example 4: Processing Results for Database Storage
 * 
 * Shows how to transform the scraped structure into
 * a format suitable for storing in the database
 */
export async function processArcGISResultsForDatabase(webAppUrl: string) {
  const result = await resolveArcGIS(webAppUrl, {
    concurrency: 8,
  });

  const processedLayers = result.lists.layers.map((layer) => ({
    id: layer.id,
    label: layer.label,
    serviceUrl: layer.serviceUrl,
    layerId: layer.layerId,
    url: layer.url,
  }));

  const processedServices = result.lists.services.map((service) => ({
    id: service.id,
    label: service.label,
    serviceUrl: 'serviceUrl' in service ? service.serviceUrl : undefined,
    type: 'serviceType' in service ? service.serviceType : undefined,
  }));

  return {
    sourceUrl: webAppUrl,
    scrapedAt: new Date().toISOString(),
    summary: {
      itemCount: result.lists.items.length,
      serviceCount: result.lists.services.length,
      layerCount: result.lists.layers.length,
      tableCount: result.lists.tables.length,
      warningCount: result.warnings.length,
    },
    layers: processedLayers,
    services: processedServices,
    warnings: result.warnings,
  };
}

/**
 * Example 5: Leaflet Integration Pattern
 * 
 * This shows how to use the scraped data to build
 * a Leaflet map without cloning the original UI.
 * 
 * Usage in a client component:
 * 
 * ```typescript
 * // app/maps/custom-map/page.tsx
 * 'use client';
 * 
 * import { useEffect, useRef } from 'react';
 * import L from 'leaflet';
 * 
 * export default function CustomMap() {
 *   const mapRef = useRef<L.Map | null>(null);
 * 
 *   useEffect(() => {
 *     const map = L.map('map').setView([37.7749, -122.4194], 10);
 *     
 *     // Fetch scraped data from your API
 *     fetch('/api/arcgis/scrape', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         url: 'https://www.arcgis.com/apps/webappviewer/...'
 *       })
 *     })
 *     .then(r => r.json())
 *     .then(data => {
 *       // Add layers to map from scraped structure
 *       data.layers.forEach(layer => {
 *         if (layer.serviceUrl) {
 *           L.tileLayer.wms(layer.serviceUrl, {
 *             layers: [layer.layerId].filter(Boolean),
 *             transparent: true
 *           }).addTo(map);
 *         }
 *       });
 *     });
 * 
 *     return () => map.remove();
 *   }, []);
 * 
 *   return <div id="map" style={{ height: '100vh' }} />;
 * }
 * ```
 */

export type { ResolveResult } from '@/lib/gis/arcgis/types';
