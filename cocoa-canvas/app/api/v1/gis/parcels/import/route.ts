/**
 * POST /api/v1/gis/parcels/import
 * Import parcels from GeoJSON or CSV data
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/logger';
import { calculateCentroid } from '@/lib/gis/centroid';
import { linkParcelsToHouseholds } from '@/lib/gis/parcel-linker';
import { parseGeoJSON, parseCSV } from '@/lib/gis/parcel-parser';

interface ImportRequest {
  data: any; // GeoJSON or CSV string
  format?: 'geojson' | 'csv';
}

interface ImportResponse {
  success: boolean;
  message: string;
  stats: {
    imported: number;
    linked: number;
    notFound: number;
    errors: number;
  };
  errors: Array<{ index: number; error: string }>;
}

export async function POST(request: NextRequest): Promise<NextResponse<ImportResponse>> {
  try {
    // Validate auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', stats: { imported: 0, linked: 0, notFound: 0, errors: 0 }, errors: [] },
        { status: 401 }
      );
    }

    const body: ImportRequest = await request.json();

    if (!body.data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing data field',
          stats: { imported: 0, linked: 0, notFound: 0, errors: 0 },
          errors: [],
        },
        { status: 400 }
      );
    }

    // Determine format
    let parseResult;
    const format = body.format || (typeof body.data === 'string' ? 'csv' : 'geojson');

    if (format === 'csv' && typeof body.data === 'string') {
      parseResult = parseCSV(body.data);
    } else {
      parseResult = parseGeoJSON(body.data);
    }

    if (parseResult.parcels.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid parcels found in import data',
          stats: { imported: 0, linked: 0, notFound: 0, errors: parseResult.errors.length },
          errors: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // Enforce max features limit (10,000)
    if (parseResult.parcels.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Import limited to 10,000 parcels maximum',
          stats: { imported: 0, linked: 0, notFound: 0, errors: 0 },
          errors: [],
        },
        { status: 413 }
      );
    }

    // Import parcels
    const importErrors: Array<{ index: number; error: string }> = [...parseResult.errors];
    const createdParcelIds: string[] = [];

    for (let i = 0; i < parseResult.parcels.length; i++) {
      try {
        const parcel = parseResult.parcels[i];

        // Calculate centroid
        let centroid;
        try {
          centroid = calculateCentroid(parcel.geometry);
        } catch (err) {
          importErrors.push({
            index: i,
            error: `Failed to calculate centroid: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
          continue;
        }

        // Create parcel record
        const created = await prisma.parcel.create({
          data: {
            apn: parcel.apn || '',
            streetName: parcel.fullAddress?.split(',')[0] || 'Unknown',
            city: parcel.city || '',
            zipCode: parcel.zipCode || '',
            fullAddress: parcel.fullAddress || '',
            geometry: parcel.geometry ? JSON.stringify(parcel.geometry) : null,
            centroidLatitude: centroid.lat,
            centroidLongitude: centroid.lng,
          },
        });

        createdParcelIds.push(created.id);
      } catch (err) {
        importErrors.push({
          index: i,
          error: err instanceof Error ? err.message : 'Failed to create parcel',
        });
      }
    }

    // Link parcels to households
    let linkStats = { linked: 0, notFound: 0, errors: [] as any[] };
    if (createdParcelIds.length > 0) {
      linkStats = await linkParcelsToHouseholds(prisma, createdParcelIds);
      importErrors.push(...linkStats.errors);
    }

    // Log audit event
    await auditLog(
      authResult.user?.userId || 'System',
      'PARCEL_IMPORT',
      request,
      'parcel',
      undefined,
      {
        imported: createdParcelIds.length,
        linked: linkStats.linked,
        format,
        errorCount: importErrors.length,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Imported ${createdParcelIds.length} parcels, linked ${linkStats.linked}`,
      stats: {
        imported: createdParcelIds.length,
        linked: linkStats.linked,
        notFound: linkStats.notFound,
        errors: importErrors.length,
      },
      errors: importErrors,
    });
  } catch (err) {
    console.error('Parcel import error:', err);

    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Import failed',
        stats: { imported: 0, linked: 0, notFound: 0, errors: 1 },
        errors: [{ index: 0, error: err instanceof Error ? err.message : 'Unknown error' }],
      },
      { status: 500 }
    );
  }
}
