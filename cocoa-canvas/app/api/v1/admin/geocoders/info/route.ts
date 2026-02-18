/**
 * GET /api/v1/admin/geocoders/info
 * Get information about available geocoding providers and their custom properties
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { geocoderRegistry } from '@/lib/geocoding/registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status (rough check - ideally validate against admin table)
    if (authResult.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all registered providers and their custom properties
    const providers = geocoderRegistry.listProviders();
    
    const info = providers.map((provider) => ({
      providerId: provider.providerId,
      providerName: provider.providerName,
      customProperties: provider.getCustomProperties?.() || [],
    }));

    return NextResponse.json({ providers: info });
  } catch (err) {
    console.error('Error fetching provider info:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch provider info' },
      { status: 500 }
    );
  }
}
