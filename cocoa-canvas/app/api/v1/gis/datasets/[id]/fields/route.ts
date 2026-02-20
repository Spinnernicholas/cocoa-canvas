import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/gis/datasets/[id]/fields
 * 
 * Get field names for a catalog dataset
 * - If sourceTable exists: Query PostGIS table schema
 * - If remote reference only: Fetch from remote service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const { id } = await params;

    // Get the dataset
    const dataset = await prisma.gISDataset.findUnique({
      where: { id },
      include: {
        datasetType: true,
        sourceRemoteDataset: true,
      },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    let fields: string[] = [];

    // If local PostGIS table exists, query it
    if (dataset.sourceTable) {
      try {
        // Get column names from information_schema
        const columnsResult = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = $1 
           AND column_name NOT IN ('id', 'geom', 'created_at', 'updated_at')
           ORDER BY ordinal_position`,
          dataset.sourceTable
        );
        fields = columnsResult.map(r => r.column_name);
      } catch (error) {
        console.error('Error querying PostGIS table schema:', error);
        return NextResponse.json(
          { error: 'Error reading table schema' },
          { status: 500 }
        );
      }
    }
    // If remote ESRI service, fetch fields from service
    else if (dataset.sourceRemoteDataset) {
      try {
        const { serviceUrl, layerId } = dataset.sourceRemoteDataset;
        
        // First try to get field info from layer metadata
        const metadataUrl = `${serviceUrl}/${layerId}?f=json`;
        const metadataResponse = await fetch(metadataUrl);
        
        if (!metadataResponse.ok) {
          throw new Error(`Remote service returned ${metadataResponse.status}`);
        }

        const metadata = await metadataResponse.json();
        
        if (metadata.fields && Array.isArray(metadata.fields)) {
          // Extract field names from metadata, excluding internal fields
          fields = metadata.fields
            .map((f: any) => f.name)
            .filter((name: string) => !['OBJECTID', 'FID', 'objectid', 'Shape', 'Shape_Length', 'Shape_Area'].includes(name));
        } else {
          // Fallback: query one feature and extract property names
          const queryUrl = `${serviceUrl}/${layerId}/query?where=1=1&outFields=*&f=geojson&resultRecordCount=1`;
          const queryResponse = await fetch(queryUrl);
          
          if (!queryResponse.ok) {
            throw new Error(`Remote query returned ${queryResponse.status}`);
          }

          const data = await queryResponse.json();
          
          if (data.features && data.features.length > 0) {
            const firstFeature = data.features[0];
            if (firstFeature.properties) {
              fields = Object.keys(firstFeature.properties)
                .filter(key => !['OBJECTID', 'FID', 'objectid', 'Shape', 'Shape_Length', 'Shape_Area'].includes(key));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching remote service fields:', error);
        return NextResponse.json(
          { error: 'Error fetching fields from remote service' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Dataset has no data source configured' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        datasetId: dataset.id,
        datasetName: dataset.name,
        fields,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Error fetching fields: ${errorMessage}` },
      { status: 500 }
    );
  }
}
