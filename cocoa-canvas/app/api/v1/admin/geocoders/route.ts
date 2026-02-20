import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const providers = await prisma.geocoderProvider.findMany({
      orderBy: [{ isPrimary: 'desc' }, { priority: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error('[Geocoders API Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch geocoder settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.providerId || !body.providerName) {
      return NextResponse.json(
        { error: 'providerId and providerName are required' },
        { status: 400 }
      );
    }

    // Check if provider already exists
    const existing = await prisma.geocoderProvider.findUnique({
      where: { providerId: body.providerId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Provider ID already exists' },
        { status: 409 }
      );
    }

    // Create provider
    const provider = await prisma.geocoderProvider.create({
      data: {
        providerId: body.providerId,
        providerName: body.providerName,
        description: body.description || null,
        isEnabled: body.isEnabled !== false,
        isPrimary: body.isPrimary === true,
        priority: body.priority || 0,
        config: body.config || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        provider,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Geocoders API Error]', error);
    return NextResponse.json(
      { error: 'Failed to create geocoder provider' },
      { status: 500 }
    );
  }
}
