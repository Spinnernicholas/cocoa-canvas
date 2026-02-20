import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/gis/datasets
 * 
 * Get all GIS catalog datasets
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const datasetTypeId = searchParams.get('datasetTypeId');
    const datasetTypeName = searchParams.get('datasetTypeName');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive') === 'true';
    const syncedToApp = searchParams.get('syncedToApp') === 'true';

    // Build query
    const where: any = {};
    if (datasetTypeId) {
      where.datasetTypeId = datasetTypeId;
    }
    if (datasetTypeName) {
      where.datasetType = {
        name: datasetTypeName,
      };
    }
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined && searchParams.has('isActive')) {
      where.isActive = isActive;
    }
    if (syncedToApp !== undefined && searchParams.has('syncedToApp')) {
      where.syncedToApp = syncedToApp;
    }

    const datasets = await prisma.gISDataset.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        datasetType: true,
        sourceRemoteDataset: {
          select: {
            id: true,
            serviceUrl: true,
            layerId: true,
            layerName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: datasets,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: `Error fetching datasets: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
