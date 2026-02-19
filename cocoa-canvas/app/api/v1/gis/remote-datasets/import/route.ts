import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ImportRemoteDatasetRequest {
  remoteDatasetId: string;
  catalogName: string;
  catalogDescription?: string;
  datasetTypeId: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
}

/**
 * Import a remote GIS dataset into the catalog
 * Creates or links a GISDataset record that references the remote service
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const body: ImportRemoteDatasetRequest = await request.json();

    if (
      !body.remoteDatasetId ||
      !body.catalogName ||
      !body.datasetTypeId
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: remoteDatasetId, catalogName, datasetTypeId',
        },
        { status: 400 }
      );
    }

    // Get the remote dataset
    const remoteDataset = await prisma.remoteGISDataset.findUnique({
      where: { id: body.remoteDatasetId },
    });

    if (!remoteDataset) {
      return NextResponse.json(
        {
          error: 'Remote dataset not found',
        },
        { status: 404 }
      );
    }

    // Check if dataset type exists
    const datasetType = await prisma.datasetType.findUnique({
      where: { id: body.datasetTypeId },
    });

    if (!datasetType) {
      return NextResponse.json(
        {
          error: 'Dataset type not found',
        },
        { status: 404 }
      );
    }

    // Create or update catalog dataset
    let catalogDataset = await prisma.gISDataset.findUnique({
      where: { name: body.catalogName },
    });

    if (catalogDataset) {
      // Update existing
      catalogDataset = await prisma.gISDataset.update({
        where: { id: catalogDataset.id },
        data: {
          sourceRemoteDataset: {
            connect: { id: body.remoteDatasetId },
          },
          description: body.catalogDescription || catalogDataset.description,
          tags: body.tags || catalogDataset.tags,
          category: body.category || catalogDataset.category,
          isPublic: body.isPublic !== undefined ? body.isPublic : catalogDataset.isPublic,
        },
      });
    } else {
      // Create new
      catalogDataset = await prisma.gISDataset.create({
        data: {
          name: body.catalogName,
          description: body.catalogDescription,
          datasetTypeId: body.datasetTypeId,
          sourceRemoteDataset: {
            connect: { id: body.remoteDatasetId },
          },
          geometryType: (remoteDataset.geometryType as any) || undefined,
          srid: remoteDataset.srid || 4326,
          tags: body.tags || [],
          category: body.category,
          isPublic: body.isPublic || false,
          isActive: true,
          syncedToApp: false,
          createdBy: {
            connect: { id: authResult.user!.userId },
          },
        },
      });
    }

    // Update the remote dataset's link
    await prisma.remoteGISDataset.update({
      where: { id: body.remoteDatasetId },
      data: {
        importedDatasetId: catalogDataset.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        catalogDataset,
        remoteDataset,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Error importing remote dataset:', error);
    return NextResponse.json(
      {
        error: `Error importing remote dataset: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
