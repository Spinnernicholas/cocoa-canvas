import { NextRequest, NextResponse } from 'next/server';

/**
 * ArcGIS proxy endpoint
 * Proxies requests to ArcGIS REST services to avoid CORS issues
 * Query params:
 * - url: The ArcGIS REST service URL to proxy
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // Trim whitespace
    targetUrl = targetUrl.trim();
    console.log('Proxy request for URL:', targetUrl);

    // Validate it's an ArcGIS URL to prevent abuse
    if (!targetUrl.includes('arcgis') && !targetUrl.includes('esri')) {
      return NextResponse.json(
        { error: 'Invalid service URL - must be an ArcGIS or ESRI service' },
        { status: 400 }
      );
    }

    // Ensure proper URL format
    let urlToFetch = targetUrl;
    let isImageRequest = false;
    try {
      const url = new URL(targetUrl);
      // Check if this is an image request
      isImageRequest = url.searchParams.get('f') === 'image' || 
                       url.pathname.includes('/export');
      
      // Only add f=json if not already present and not an image request
      if (!url.searchParams.has('f') && !isImageRequest) {
        url.searchParams.set('f', 'json');
      }
      urlToFetch = url.toString();
      console.log('Final URL to fetch:', urlToFetch, 'isImageRequest:', isImageRequest);
    } catch (urlError) {
      console.error('URL parsing error:', urlError, 'targetUrl:', targetUrl);
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch from ArcGIS service with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response;
    try {
      response = await fetch(urlToFetch, {
        method: 'GET',
        headers: {
          'User-Agent': 'cocoa-canvas/1.0',
          'Accept': isImageRequest ? 'image/png,image/*' : 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error('Fetch error:', fetchErr, 'URL:', urlToFetch);
      throw fetchErr;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ArcGIS service error (${response.status} ${response.statusText}):`, errorText.substring(0, 200), 'URL:', urlToFetch);
      
      return NextResponse.json(
        { 
          error: `Service error: ${response.statusText}`,
          details: errorText.substring(0, 500),
          statusCode: response.status

        },
        { status: response.status }
      );
    }

    // Handle image responses
    if (isImageRequest) {
      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/png';
      
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600', // 1 hour cache for tiles
        },
      });
    }

    // Handle JSON responses
    let data;
    try {
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from service');
      }
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Response parsing error:', parseError, 'URL:', targetUrl);
      return NextResponse.json(
        { error: 'Invalid JSON response from service' },
        { status: 502 }
      );
    }

    // Add CORS headers to allow client access
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Proxy request failed';
    console.error('ArcGIS proxy error:', errorMessage, error);
    
    // Handle abort/timeout
    if (errorMessage.includes('abort')) {
      return NextResponse.json(
        { error: 'Request timeout - service took too long to respond' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
