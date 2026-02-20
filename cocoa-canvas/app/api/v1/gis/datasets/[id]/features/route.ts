import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/gis/datasets/[id]/features
 * 
 * Fetch features from a catalog dataset (paginated)
 * - If sourceTable exists: Query PostGIS table directly
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
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

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

    let features: any[] = [];
    let totalCount = 0;
    let fields: string[] = [];

    // If local PostGIS table exists, query it
    if (dataset.sourceTable) {
      try {
        // Get total count
        const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM ${dataset.sourceTable}`
        );
        totalCount = Number(countResult[0]?.count || 0);

        // Get column names
        const columnsResult = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = $1 
           AND column_name NOT IN ('id', 'geom', 'created_at')
           ORDER BY ordinal_position`,
          dataset.sourceTable
        );
        fields = columnsResult.map(r => r.column_name);

        // Get features with geometry as GeoJSON
        const featuresResult = await prisma.$queryRawUnsafe<any[]>(
          `SELECT 
            id,
            ${fields.map(f => `"${f}"`).join(', ')},
            ST_AsGeoJSON(geom) as geometry
           FROM ${dataset.sourceTable}
           ORDER BY id
           LIMIT ${limit} OFFSET ${offset}`
        );

        features = featuresResult.map(row => ({
          id: row.id,
          properties: fields.reduce((acc, field) => {
            acc[field] = row[field];
            return acc;
          }, {} as Record<string, any>),
          geometry: row.geometry ? JSON.parse(row.geometry) : null,
        }));
      } catch (error) {
        console.error('Error querying PostGIS table:', error);
        return NextResponse.json(
          { error: 'Failed to query local dataset' },
          { status: 500 }
        );
      }
    } 
    // Otherwise, fetch from remote service
    else if (dataset.sourceRemoteDataset) {
      try {
        const remoteDataset = dataset.sourceRemoteDataset;
        const featureUrl = `${remoteDataset.serviceUrl}/${remoteDataset.layerId}/query`;
        
        // Get total count
        const countResponse = await fetch(
          `${featureUrl}?where=1=1&returnCountOnly=true&f=json`
        );
        
        if (countResponse.ok) {
          const countData = await countResponse.json();
          totalCount = countData.count || 0;
        }

        // Fetch features
        const queryParams = new URLSearchParams({
          where: '1=1',
          outFields: '*',
          f: 'geojson',
          resultOffset: offset.toString(),
          resultRecordCount: limit.toString(),
        });

        const response = await fetch(`${featureUrl}?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`Remote service error: ${response.statusText}`);
        }

        const data = await response.json();
        const geoJsonFeatures = data.features || [];
        
        // Transform GeoJSON features to our format
        // Remote services return GeoJSON where features don't have a top-level 'id'
        // The OBJECTID or FID is typically in properties
        features = geoJsonFeatures.map((feature: any, index: number) => {
          // Try to extract an ID from common ESRI fields, fallback to index
          const objectId = feature.id || 
                          feature.properties?.OBJECTID || 
                          feature.properties?.FID || 
                          feature.properties?.objectid ||
                          index;
          
          return {
            id: objectId,
            properties: feature.properties || {},
            geometry: feature.geometry,
          };
        });
        
        // Extract field names from first feature
        if (features.length > 0 && features[0].properties) {
          fields = Object.keys(features[0].properties);
        }
      } catch (error) {
        console.error('Error fetching from remote service:', error);
        return NextResponse.json(
          { error: 'Failed to fetch from remote service' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Dataset has no data source (neither local table nor remote service)' },
        { status: 400 }
      );
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        features,
        fields,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        dataset: {
          id: dataset.id,
          name: dataset.name,
          description: dataset.description,
          datasetType: dataset.datasetType.name,
          geometryType: dataset.geometryType,
          isLocal: !!dataset.sourceTable,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      {
        error: `Failed to fetch features: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
