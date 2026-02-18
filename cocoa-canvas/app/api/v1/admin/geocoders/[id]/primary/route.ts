import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const providerId = (await params).id ?? params.id;

    // Check if provider exists
    const provider = await prisma.geocoderProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Check if provider is enabled
    if (!provider.isEnabled) {
      return NextResponse.json(
        { error: 'Cannot set a disabled provider as primary' },
        { status: 400 }
      );
    }

    // Update: Set all providers to not primary, then set this one as primary
    await prisma.geocoderProvider.updateMany({
      where: {},
      data: { isPrimary: false },
    });

    await prisma.geocoderProvider.update({
      where: { id: providerId },
      data: { isPrimary: true },
    });

    return NextResponse.json({
      success: true,
      message: `${provider.providerName} is now the primary geocoder`,
    });
  } catch (error) {
    console.error('[Geocoders API Error]', error);
    return NextResponse.json(
      { error: 'Failed to set primary provider' },
      { status: 500 }
    );
  }
}
