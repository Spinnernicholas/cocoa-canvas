import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/gis/dataset-types
 * 
 * Fetch available GIS dataset types for dropdown selection
 * when importing remote layers to the catalog.
 */
export async function GET(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const datasetTypes = await prisma.datasetType.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: datasetTypes,
    });
  } catch (error) {
    console.error('Error fetching dataset types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset types' },
      { status: 500 }
    );
  }
}
