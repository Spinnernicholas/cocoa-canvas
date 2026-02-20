import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RemoteLayerDiscovery {
  serviceUrl: string;
  layerId: number;
  layerName: string;
  layerType?: string;
  geometryType?: string;
  serviceType?: string;
  serviceTitle?: string;
  layerDescription?: string;
  fields?: any[];
  spatialReference?: any;
  extent?: any;
}

interface RemoteDatasetResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Save a discovered remote GIS layer as a RemoteGISDataset
 * This allows users to track remote services and import them into the catalog
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const body: RemoteLayerDiscovery = await request.json();

    if (!body.serviceUrl || body.layerId === undefined || !body.layerName) {
      return NextResponse.json(
        {
          error: 'Missing required fields: serviceUrl, layerId, layerName',
        },
        { status: 400 }
      );
    }

    // Check if this remote dataset already exists
    let remoteDataset = await prisma.remoteGISDataset.findUnique({
      where: {
        serviceUrl_layerId: {
          serviceUrl: body.serviceUrl,
          layerId: body.layerId,
        },
      },
    });

    if (!remoteDataset) {
      // Derive SRID from spatial reference if available
      let srid = 4326; // Default to WGS84
      if (body.spatialReference?.latestWkid) {
        srid = body.spatialReference.latestWkid;
      } else if (body.spatialReference?.wkid) {
        srid = body.spatialReference.wkid;
      }

      // Create new remote dataset
      remoteDataset = await prisma.remoteGISDataset.create({
        data: {
          serviceUrl: body.serviceUrl,
          layerId: body.layerId,
          layerName: body.layerName,
          layerType: body.layerType,
          geometryType: body.geometryType,
          serviceType: body.serviceType,
          serviceTitle: body.serviceTitle,
          layerDescription: body.layerDescription,
          fields: body.fields ? body.fields : undefined,
          spatialReference: body.spatialReference ? body.spatialReference : undefined,
          srid,
          extent: body.extent ? body.extent : undefined,
          discoveredBy: 'map_explorer',
          createdBy: authResult.user
            ? {
                connect: { id: authResult.user.userId },
              }
            : undefined,
        },
      });
    } else {
      // Update existing if metadata changed
      remoteDataset = await prisma.remoteGISDataset.update({
        where: {
          serviceUrl_layerId: {
            serviceUrl: body.serviceUrl,
            layerId: body.layerId,
          },
        },
        data: {
          lastValidatedAt: new Date(),
          isAccessible: true,
          fields: body.fields !== undefined ? body.fields : undefined,
          extent: body.extent !== undefined ? body.extent : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: remoteDataset,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: `Error saving remote dataset: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * Get discovered remote datasets
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const serviceUrl = searchParams.get('serviceUrl');
    const layerId = searchParams.get('layerId');
    const accessible = searchParams.get('accessible') === 'true';

    // Build query
    const where: any = {};
    if (serviceUrl) {
      where.serviceUrl = serviceUrl;
    }
    if (layerId) {
      where.layerId = parseInt(layerId);
    }
    if (accessible) {
      where.isAccessible = true;
    }

    const datasets = await prisma.remoteGISDataset.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        importedDataset: {
          select: {
            id: true,
            name: true,
            datasetTypeId: true,
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
        error: `Error fetching remote datasets: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
