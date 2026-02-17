/**
 * GET /api/v1/gis/households/[id]
 * Get a single household with all details
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/audit/logger';

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

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        people: {
          include: {
            addresses: true,
            phones: true,
            emails: true,
            voter: true,
            volunteer: true,
            donor: true,
          },
        },
        parcel: true,
      },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Transform people to show roles
    const peopleWithRoles = household.people.map((p: any) => ({
      ...p,
      roles: [
        p.voter ? 'voter' : null,
        p.volunteer ? 'volunteer' : null,
        p.donor ? 'donor' : null,
      ].filter(Boolean),
    }));

    const response = {
      ...household,
      people: peopleWithRoles,
      memberCount: household.people.length,
    };

    // Log audit event
    await auditLog(authResult.user?.userId || 'Unknown', 'HOUSEHOLD_VIEW', request, 'household', householdId, {
      memberCount: household.people.length,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('Household fetch error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch household' },
      { status: 500 }
    );
  }
}
