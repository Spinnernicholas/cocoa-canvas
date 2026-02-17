import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

const prisma = new PrismaClient();

// GET /api/v1/admin/option-groups/locations - List all locations
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });

    await auditLog(authResult.user.userId, 'LOCATION_LIST', request, 'location');

    return NextResponse.json(locations.map(l => ({
      id: l.id,
      name: l.name,
      category: l.category,
      description: l.description,
      isActive: l.isActive,
    })));
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/admin/option-groups/locations - Create new location
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        name,
        category: category || null,
        description: description || null,
        isActive: true,
      },
    });

    await auditLog(authResult.user.userId, 'LOCATION_CREATE', request, 'location', location.id, { name, category });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
