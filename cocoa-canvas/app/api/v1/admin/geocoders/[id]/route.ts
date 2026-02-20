import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { id: providerId } = await params;

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

    // Update provider
    const updated = await prisma.geocoderProvider.update({
      where: { id: providerId },
      data: {
        providerName: body.providerName ?? provider.providerName,
        description: body.description ?? provider.description,
        isEnabled: body.isEnabled ?? provider.isEnabled,
        priority: body.priority ?? provider.priority,
        config: body.config ?? provider.config,
      },
    });

    return NextResponse.json({
      success: true,
      provider: updated,
    });
  } catch (error) {
    console.error('[Geocoders API Error]', error);
    return NextResponse.json(
      { error: 'Failed to update geocoder provider' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const { id: providerId } = await params;

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

    // Cannot delete the primary provider
    if (provider.isPrimary) {
      return NextResponse.json(
        { error: 'Cannot delete the primary provider. Set another provider as primary first.' },
        { status: 409 }
      );
    }

    // Delete provider
    await prisma.geocoderProvider.delete({
      where: { id: providerId },
    });

    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully',
    });
  } catch (error) {
    console.error('[Geocoders API Delete Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete geocoder provider';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
