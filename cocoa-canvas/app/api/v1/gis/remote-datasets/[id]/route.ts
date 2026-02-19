import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/gis/remote-datasets/[id]
 * 
 * Delete a remote GIS dataset
 * This removes the reference to the remote service from the catalog
 * Does NOT delete the imported catalog dataset if one exists
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
    const dataset = await prisma.remoteGISDataset.findUnique({
      where: { id },
      include: {
        importedDataset: true,
      },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Remote dataset not found' },
        { status: 404 }
      );
    }

    // Delete the remote dataset
    await prisma.remoteGISDataset.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Remote dataset deleted successfully',
      hadImportedDataset: !!dataset.importedDataset,
    });
  } catch (error) {
    console.error('Error deleting remote dataset:', error);
    return NextResponse.json(
      {
        error: `Failed to delete remote dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
