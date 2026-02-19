import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/gis/datasets/[id]
 * 
 * Delete a GIS catalog dataset
 * If the dataset has a local PostGIS table (sourceTable), it will be dropped
 * If the dataset is linked to a remote dataset, the link is removed
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const { id } = params;

    // Check if the dataset exists
    const dataset = await prisma.gISDataset.findUnique({
      where: { id },
      include: {
        sourceRemoteDataset: true,
      },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // If dataset has a local PostGIS table, drop it
    if (dataset.sourceTable) {
      try {
        // Drop the table and its indexes
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${dataset.sourceTable} CASCADE`);
      } catch (tableError) {
        console.error('Error dropping PostGIS table:', tableError);
        // Continue with deletion even if table drop fails
      }
    }

    // If there's a linked remote dataset, clear the link
    if (dataset.sourceRemoteDataset) {
      await prisma.remoteGISDataset.update({
        where: { id: dataset.sourceRemoteDataset.id },
        data: {
          importedDatasetId: null,
        },
      });
    }

    // Delete the catalog dataset
    await prisma.gISDataset.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully',
      droppedTable: dataset.sourceTable || null,
    });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return NextResponse.json(
      {
        error: `Failed to delete dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/gis/datasets/[id]
 * 
 * Get a single GIS catalog dataset by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const { id } = params;

    const dataset = await prisma.gISDataset.findUnique({
      where: { id },
      include: {
        datasetType: true,
        sourceRemoteDataset: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json(
      {
        error: `Failed to fetch dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
