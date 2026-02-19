/**
 * GET /api/v1/gis/households
 * Query households with filtering and search
 * Supports city, state, zipCode, geocoded status filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

interface HouseholdResponse {
  id: string;
  houseNumber?: string;
  streetName: string;
  streetSuffix?: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
  personCount: number;
  latitude?: number;
  longitude?: number;
  geocoded: boolean;
  geocodedAt?: string;
  geocodingProvider?: string;
  createdAt: string;
  updatedAt: string;
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
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const zipCode = searchParams.get('zipCode');
    const geocodedStr = searchParams.get('geocoded');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    // Text search on full address fields
    if (search) {
      where.OR = [
        { houseNumber: { contains: search, mode: 'insensitive' } },
        { streetName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Exact/partial filters
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (zipCode) where.zipCode = { contains: zipCode };

    // Geocoding status filter
    if (geocodedStr !== null) {
      where.geocoded = geocodedStr === 'true';
    }

    // Fetch households with pagination
    const households = await prisma.household.findMany({
      where,
      select: {
        id: true,
        houseNumber: true,
        streetName: true,
        streetSuffix: true,
        city: true,
        state: true,
        zipCode: true,
        fullAddress: true,  
        latitude: true,
        longitude: true,
        geocoded: true,
        geocodedAt: true,
        geocodingProvider: true,
        createdAt: true,
        updatedAt: true,
        people: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Transform response
    const response: HouseholdResponse[] = households.map((h: any) => ({
      id: h.id,
      houseNumber: h.houseNumber || undefined,
      streetName: h.streetName,
      streetSuffix: h.streetSuffix || undefined,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
      fullAddress: h.fullAddress,
      personCount: h.people.length,
      latitude: h.latitude || undefined,
      longitude: h.longitude || undefined,
      geocoded: h.geocoded,
      geocodedAt: h.geocodedAt?.toISOString(),
      geocodingProvider: h.geocodingProvider || undefined,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    }));

    // Get total count for pagination
    const total = await prisma.household.count({ where });

    // Log audit event
    await auditLog(authResult.user?.userId || 'Unknown', 'HOUSEHOLDS_QUERY', request, undefined, undefined, {
      search: !!search,
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode || undefined,
      geocoded: geocodedStr || undefined,
      resultCount: response.length,
      totalAvailable: total,
    });

    return NextResponse.json({
      households: response,
      total,
      pagination: {
        limit,
        offset,
        remaining: Math.max(0, total - (offset + limit)),
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
