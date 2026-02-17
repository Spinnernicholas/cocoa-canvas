/**
 * GET /api/v1/gis/households
 * Query households with geographic bounds filtering
 * Supports administrative and category filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/logger';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface HouseholdQuery {
  bounds?: Bounds | string; // JSON string or object
  city?: string;
  zipCode?: string;
  precinctNumber?: string;
  county?: string;
  votersOnly?: boolean;
  volunteersOnly?: boolean;
  donorsOnly?: boolean;
  limit?: number;
  offset?: number;
}

interface HouseholdResponse {
  id: string;
  address: {
    street: string;
    city?: string;
    zipCode?: string;
    county?: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  memberCount: number;
  members: Array<{
    id: string;
    name: string;
    roles: string[];
  }>;
  parcelId?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const boundsParam = searchParams.get('bounds');
    const city = searchParams.get('city');
    const zipCode = searchParams.get('zipCode');
    const county = searchParams.get('county');
    const votersOnly = searchParams.get('votersOnly') === 'true';
    const volunteersOnly = searchParams.get('volunteersOnly') === 'true';
    const donorsOnly = searchParams.get('donorsOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 10000);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Parse bounds
    let bounds: Bounds | null = null;
    if (boundsParam) {
      try {
        const parsedBounds = JSON.parse(boundsParam);
        if (parsedBounds && parsedBounds.north && parsedBounds.south && parsedBounds.east && parsedBounds.west) {
          bounds = parsedBounds;
        } else {
          return NextResponse.json(
            { error: 'Bounds must include north, south, east, west' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json({ error: 'Invalid bounds JSON' }, { status: 400 });
      }
    }

    // Build where clause
    const where: any = {};

    if (bounds) {
      where.parcel = {
        centroidLatitude: { gte: bounds.south, lte: bounds.north },
        centroidLongitude: { gte: bounds.west, lte: bounds.east },
      };
    }

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (zipCode) where.zipCode = zipCode;
    if (county) where.county = { contains: county, mode: 'insensitive' };

    // Apply category filters
    if (votersOnly || volunteersOnly || donorsOnly) {
      const OR: any[] = [];
      if (votersOnly) OR.push({ members: { some: { voter: { isNot: null } } } });
      if (volunteersOnly) OR.push({ members: { some: { volunteer: { isNot: null } } } });
      if (donorsOnly) OR.push({ members: { some: { donor: { isNot: null } } } });
      where.OR = OR;
    }

    // Fetch households with pagination
    const households = await prisma.household.findMany({
      where,
      include: {
        people: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            voter: { select: { id: true } },
            volunteer: { select: { id: true } },
            donor: { select: { id: true } },
          },
        },
        parcel: {
          select: {
            centroidLatitude: true,
            centroidLongitude: true,
          },
        },
      },
      take: limit,
      skip: offset,
    });

    // Transform response
    const response: HouseholdResponse[] = households.map((h: any) => {
      const members = h.people.map((p: any) => {
        const roles: string[] = [];
        if (p.voter) roles.push('voter');
        if (p.volunteer) roles.push('volunteer');
        if (p.donor) roles.push('donor');

        return {
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          roles,
        };
      });

      return {
        id: h.id,
        address: {
          street: h.fullAddress || '',
          city: h.city || undefined,
          zipCode: h.zipCode || undefined,
          county: h.county || undefined,
        },
        location: {
          lat: h.parcel?.centroidLatitude || 0,
          lng: h.parcel?.centroidLongitude || 0,
        },
        memberCount: members.length,
        members,
        parcelId: h.parcelId || undefined,
      };
    });

    // Get total count for pagination
    const total = await prisma.household.count({ where });

    // Log audit event
    await auditLog(authResult.user?.userId || 'Unknown', 'HOUSEHOLDS_QUERY', request, undefined, undefined, {
      bounds: !!bounds,
      city: city || undefined,
      zipCode: zipCode || undefined,
      county: county || undefined,
      votersOnly,
      volunteersOnly,
      donorsOnly,
      resultCount: response.length,
      totalAvailable: total,
    });

    return NextResponse.json({
      households: response,
      pagination: {
        limit,
        offset,
        total,
        returned: response.length,
      },
    });
  } catch (err) {
    console.error('Households query error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Query failed' },
      { status: 500 }
    );
  }
}
