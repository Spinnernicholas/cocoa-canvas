/**
 * GET /api/v1/gis/households/stats
 * Get aggregate statistics for households
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

interface HouseholdStats {
  totalHouseholds: number;
  totalPeople: number;
  totalVoters: number;
  totalVolunteers: number;
  totalDonors: number;
  peoplePerHousehold: number;
  voterPercentage: number;
  volunteerPercentage: number;
  donorPercentage: number;
  cityCounts: Record<string, number>;
  zipCodes: Record<string, number>;
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

    // Parse bounds
    let bounds: Bounds | null = null;
    if (boundsParam) {
      try {
        bounds = JSON.parse(boundsParam);
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

    // Get household count
    const totalHouseholds = await prisma.household.count({ where });

    // Get statistics
    const households = await prisma.household.findMany({
      where,
      include: {
        people: {
          select: {
            id: true,
            voter: { select: { id: true } },
            volunteer: { select: { id: true } },
            donor: { select: { id: true } },
          },
        },
      },
    });

    // Calculate stats
    let totalPeople = 0;
    let totalVoters = 0;
    let totalVolunteers = 0;
    let totalDonors = 0;
    const cityCounts: Record<string, number> = {};
    const zipCounts: Record<string, number> = {};

    for (const h of households) {
      totalPeople += h.people.length;

      for (const p of h.people) {
        if (p.voter) totalVoters++;
        if (p.volunteer) totalVolunteers++;
        if (p.donor) totalDonors++;
      }

      if (h.city) cityCounts[h.city] = (cityCounts[h.city] || 0) + 1;
      if (h.zipCode) zipCounts[h.zipCode] = (zipCounts[h.zipCode] || 0) + 1;
    }

    const stats: HouseholdStats = {
      totalHouseholds,
      totalPeople,
      totalVoters,
      totalVolunteers,
      totalDonors,
      peoplePerHousehold: totalHouseholds > 0 ? totalPeople / totalHouseholds : 0,
      voterPercentage: totalPeople > 0 ? (totalVoters / totalPeople) * 100 : 0,
      volunteerPercentage: totalPeople > 0 ? (totalVolunteers / totalPeople) * 100 : 0,
      donorPercentage: totalPeople > 0 ? (totalDonors / totalPeople) * 100 : 0,
      cityCounts,
      zipCodes: zipCounts,
    };

    // Log audit event
    await auditLog(
      authResult.user?.userId || 'Unknown',
      'HOUSEHOLDS_STATS_QUERY',
      request,
      undefined,
      undefined,
      {
        bounds: !!bounds,
        city: city || undefined,
        zipCode: zipCode || undefined,
        county: county || undefined,
        totalRecords: totalHouseholds,
      }
    );

    return NextResponse.json(stats);
  } catch (err) {
    console.error('Households stats error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Stats calculation failed' },
      { status: 500 }
    );
  }
}
