/**
 * Example API Route Implementation for ArcGIS Web App Scraping
 * 
 * This file demonstrates how to implement an API endpoint
 * in cocoa-canvas's API routes that uses the arcgis library
 * to scrape web app structure and serve it for frontend use.
 * 
 * Location in cocoa-canvas:
 * app/api/v1/gis/arcgis/scrape/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveArcGIS, normalizeArcGISUrl } from '@/lib/gis/arcgis/index';
import type { ResolveResult } from '@/lib/gis/arcgis/types';

/**
 * POST /api/v1/gis/arcgis/scrape
 * 
 * Scrapes an ArcGIS web app and returns its structure
 * 
 * Request body:
 * {
 *   "url": "https://www.arcgis.com/apps/webappviewer/index.html?id=..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "root": "...",
 *     "lists": { items: [], services: [], layers: [], tables: [], resources: [] },
 *     "warnings": []
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    // Validate input
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "url" parameter' },
        { status: 400 }
      );
    }

    // Validate it's a proper URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Scrape the web app
    const result = await resolveArcGIS(url, {
      concurrency: 8,
    });

    // Return the structure
    return NextResponse.json({
      success: true,
      data: {
        root: result.root,
        summary: {
          items: result.lists.items.length,
          services: result.lists.services.length,
          layers: result.lists.layers.length,
          tables: result.lists.tables.length,
          resources: result.lists.resources.length,
        },
        lists: result.lists,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    console.error('ArcGIS scrape error:', error);

    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Failed to scrape ArcGIS web app',
        details: message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/gis/arcgis/normalize?url=...
 * 
 * Normalize an ArcGIS URL to identify its type and get the REST endpoint
 * 
 * Query parameters:
 * - url: The ArcGIS URL to normalize
 * 
 * Response:
 * {
 *   "success": true,
 *   "targets": [
 *     {
 *       "kind": "item|service",
 *       "url": "REST endpoint URL",
 *       "portalBaseUrl": "Portal base URL",
 *       "itemId": "item ID (if item)"
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing "url" query parameter' },
        { status: 400 }
      );
    }

    const targets = normalizeArcGISUrl(url);

    return NextResponse.json({
      success: true,
      targets: targets,
    });
  } catch (error) {
    console.error('URL normalization error:', error);

    return NextResponse.json(
      {
        error: 'Failed to normalize URL',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Usage Examples:
 * 
 * 1. Scrape a web app:
 * 
 * ```typescript
 * const response = await fetch('/api/v1/gis/arcgis/scrape', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     url: 'https://www.arcgis.com/apps/webappviewer/?id=92d542bcb39247e8b558021bd0446d18'
 *   })
 * });
 * const result = await response.json();
 * ```
 * 
 * 2. Normalize a URL:
 * 
 * ```typescript
 * const response = await fetch(
 *   '/api/v1/gis/arcgis/normalize?url=' + 
 *   encodeURIComponent('https://example.com/home/item.html?id=abc123')
 * );
 * const result = await response.json();
 * ```
 * 
 * 3. In a component, build a Leaflet map from scraped data:
 * 
 * ```typescript
 * 'use client';
 * 
 * import { useEffect, useRef } from 'react';
 * import L from 'leaflet';
 * 
 * export function LeafletMapFromWebApp({ webAppUrl }: { webAppUrl: string }) {
 *   const mapRef = useRef<HTMLDivElement>(null);
 * 
 *   useEffect(() => {
 *     const map = L.map(mapRef.current!).setView([39.8, -98.6], 4);
 *     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
 * 
 *     fetch('/api/v1/gis/arcgis/scrape', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ url: webAppUrl })
 *     })
 *     .then(r => r.json())
 *     .then(({ data }) => {
 *       // Add layers to map
 *       data.lists.layers.forEach(layer => {
 *         if ('serviceUrl' in layer && layer.serviceUrl) {
 *           const layerId = 'layerId' in layer ? layer.layerId : 0;
 *           L.tileLayer.wms(layer.serviceUrl, {
 *             layers: [layerId],
 *             transparent: true,
 *             format: 'image/png'
 *           }).addTo(map);
 *         }
 *       });
 *     });
 *   }, [webAppUrl]);
 * 
 *   return <div ref={mapRef} style={{ height: '100vh', width: '100%' }} />;
 * }
 * ```
 * 
 * 4. Store scraped data in the database:
 * 
 * ```typescript
 * const response = await fetch('/api/v1/gis/arcgis/scrape', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ url: webAppUrl })
 * });
 * 
 * const { data } = await response.json();
 * 
 * // Store in database
 * await db.gisWebApp.create({
 *   sourceUrl: data.root,
 *   layerCount: data.summary.layers,
 *   serviceCount: data.summary.services,
 *   scrapedData: JSON.stringify(data.lists),
 *   warnings: data.warnings.join('\n')
 * });
 * ```
 */
