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
  importMode?: 'remote' | 'local'; // 'remote' = reference only, 'local' = download and store
}

/**
 * Convert ESRI or GeoJSON geometry types to PostGIS GeometryType enum
 */
function normalizeGeometryType(geometryType: string | null | undefined): string | null {
  if (!geometryType) return null;
  
  const type = geometryType.toLowerCase();
  
  // ESRI geometry types
  if (type.includes('point') && type.includes('multi')) return 'MULTIPOINT';
  if (type.includes('point')) return 'POINT';
  if (type.includes('polyline') || type.includes('linestring')) {
    if (type.includes('multi')) return 'MULTILINESTRING';
    return 'LINESTRING';
  }
  if (type.includes('polygon')) {
    if (type.includes('multi')) return 'MULTIPOLYGON';
    return 'POLYGON';
  }
  if (type.includes('geometrycollection')) return 'GEOMETRYCOLLECTION';
  
  // GeoJSON geometry types (used in local imports)
  if (type === 'point') return 'POINT';
  if (type === 'multipoint') return 'MULTIPOINT';
  if (type === 'linestring') return 'LINESTRING';
  if (type === 'multilinestring') return 'MULTILINESTRING';
  if (type === 'polygon') return 'POLYGON';
  if (type === 'multipolygon') return 'MULTIPOLYGON';
  if (type === 'geometrycollection') return 'GEOMETRYCOLLECTION';
  
  return null;
}

/**
 * Import a remote GIS dataset into the catalog
 * Supports two modes:
 * - 'remote': Creates a GISDataset that references the remote service (no data download)
 * - 'local': Downloads all features and stores them in a PostGIS table
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

    const importMode = body.importMode || 'remote';

    // Handle local import: Download features and store in PostGIS
    if (importMode === 'local') {
      try {
        // Construct the feature service URL
        const featureUrl = `${remoteDataset.serviceUrl}/${remoteDataset.layerId}/query`;
        
        // Fetch all features (with pagination handling)
        const features: any[] = [];
        let offset = 0;
        const limit = 1000; // ESRI services typically have limits
        
        while (true) {
          const queryParams = new URLSearchParams({
            where: '1=1',
            outFields: '*',
            f: 'geojson',
            resultOffset: offset.toString(),
            resultRecordCount: limit.toString(),
          });
          
          const response = await fetch(`${featureUrl}?${queryParams}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch features: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            features.push(...data.features);
            offset += data.features.length;
            
            // If we got fewer than the limit, we've reached the end
            if (data.features.length < limit) {
              break;
            }
          } else {
            break;
          }
        }

        if (features.length === 0) {
          return NextResponse.json(
            {
              error: 'No features found in the remote layer',
            },
            { status: 400 }
          );
        }

        // Generate a unique table name
        const tableName = `gis_${body.catalogName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        
        // Determine geometry type from first feature
        const firstGeom = features[0]?.geometry;
        let geometryType = 'GEOMETRY';
        if (firstGeom) {
          switch (firstGeom.type) {
            case 'Point':
            case 'MultiPoint':
              geometryType = 'POINT';
              break;
            case 'LineString':
            case 'MultiLineString':
              geometryType = 'LINESTRING';
              break;
            case 'Polygon':
            case 'MultiPolygon':
              geometryType = 'POLYGON';
              break;
          }
        }

        // Extract field names from first feature properties
        const sampleProperties = features[0]?.properties || {};
        const fieldNames = Object.keys(sampleProperties);

        // Create the PostGIS table
        const createTableSQL = `
          CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            ${fieldNames.map(field => `"${field}" TEXT`).join(',\n            ')},
            geom GEOMETRY(${geometryType}, 4326),
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX ${tableName}_geom_idx ON ${tableName} USING GIST(geom);
        `;

        await prisma.$executeRawUnsafe(createTableSQL);

        // Insert features in batches
        const batchSize = 100;
        for (let i = 0; i < features.length; i += batchSize) {
          const batch = features.slice(i, i + batchSize);
          
          for (const feature of batch) {
            const properties = feature.properties || {};
            const geometry = feature.geometry ? JSON.stringify(feature.geometry) : null;
            
            const fieldValues = fieldNames.map(field => {
              const val = properties[field];
              return val !== null && val !== undefined ? String(val) : null;
            });
            
            const fieldPlaceholders = fieldNames.map((_, idx) => `$${idx + 1}`).join(', ');
            const geomPlaceholder = geometry ? `ST_GeomFromGeoJSON($${fieldNames.length + 1})` : 'NULL';
            
            const insertSQL = `
              INSERT INTO ${tableName} (${fieldNames.map(f => `"${f}"`).join(', ')}, geom)
              VALUES (${fieldPlaceholders}, ${geomPlaceholder})
            `;
            
            if (geometry) {
              await prisma.$executeRawUnsafe(insertSQL, ...fieldValues, geometry);
            } else {
              await prisma.$executeRawUnsafe(insertSQL, ...fieldValues);
            }
          }
        }

        // Calculate bounding box
        const bboxResult = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            ST_XMin(ST_Extent(geom)) as xmin,
            ST_YMin(ST_Extent(geom)) as ymin,
            ST_XMax(ST_Extent(geom)) as xmax,
            ST_YMax(ST_Extent(geom)) as ymax
          FROM ${tableName}
        `);
        
        const bbox = bboxResult[0] || null;

        // Create catalog dataset with local storage
        const catalogDataset = await prisma.gISDataset.create({
          data: {
            name: body.catalogName,
            description: body.catalogDescription,
            datasetTypeId: body.datasetTypeId,
            sourceTable: tableName,
            geometryColumn: 'geom',
            geometryType: normalizeGeometryType(geometryType) as any,
            srid: 4326,
            boundingBox: bbox ? {
              minX: bbox.xmin,
              minY: bbox.ymin,
              maxX: bbox.xmax,
              maxY: bbox.ymax,
            } : null,
            recordCount: features.length,
            tags: body.tags || [],
            category: body.category,
            isPublic: body.isPublic || false,
            isActive: true,
            syncedToApp: false,
            createdById: authResult.user!.userId,
            // Still link to remote dataset for reference
            sourceRemoteDataset: {
              connect: { id: body.remoteDatasetId },
            },
          },
        });

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
            importMode: 'local',
            recordsImported: features.length,
            tableName,
          },
        });
      } catch (localImportError) {
        console.error('Local import error:', localImportError);
        return NextResponse.json(
          {
            error: `Local import failed: ${localImportError instanceof Error ? localImportError.message : 'Unknown error'}`,
          },
          { status: 500 }
        );
      }
    }

    // Remote mode: Create a reference-only catalog dataset

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
          geometryType: normalizeGeometryType(remoteDataset.geometryType) as any,
          srid: remoteDataset.srid || 4326,
          tags: body.tags || [],
          category: body.category,
          isPublic: body.isPublic || false,
          isActive: true,
          syncedToApp: false,
          createdById: authResult.user!.userId,
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
