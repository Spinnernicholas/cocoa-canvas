/**
 * GET /api/v1/gis/households/[id]
 * Get a single household with all details
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Validate auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: householdId } = await params;

    if (!householdId) {
      return NextResponse.json({ error: 'Household ID is required' }, { status: 400 });
    }

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        people: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            voter: true,
            volunteer: true,
            donor: true,
          },
        },
      },
    });

    if (!household) {
      console.warn(`Household not found: ${householdId}`);
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Transform people to include roles
    const peopleWithRoles = (household as any).people.map((p: any) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone,
      voter: !!p.voter,
      volunteer: !!p.volunteer,
      donor: !!p.donor,
    }));

    const response = {
      household: {
        id: household.id,
        houseNumber: household.houseNumber,
        streetName: household.streetName,
        streetSuffix: household.streetSuffix,
        city: household.city,
        state: household.state,
        zipCode: household.zipCode,
        fullAddress: household.fullAddress,
        latitude: household.latitude,
        longitude: household.longitude,
        geocoded: household.geocoded,
        geocodedAt: household.geocodedAt?.toISOString(),
        geocodingProvider: household.geocodingProvider,
        createdAt: household.createdAt.toISOString(),
        updatedAt: household.updatedAt.toISOString(),
        people: peopleWithRoles,
      },
    };

    // Log audit event
    await auditLog(authResult.user?.userId || 'Unknown', 'HOUSEHOLD_VIEW', request, 'household', householdId, {
      memberCount: peopleWithRoles.length,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('Household fetch error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch household';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
