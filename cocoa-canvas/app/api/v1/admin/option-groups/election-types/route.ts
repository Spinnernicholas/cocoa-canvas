import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/v1/admin/option-groups/election-types - List all election types
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const electionTypes = await prisma.electionType.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    await auditLog(authResult.user.userId, 'ELECTION_TYPE_LIST', request, 'election_type');

    return NextResponse.json(electionTypes.map(et => ({
      id: et.id,
      name: et.name,
      description: et.description,
      isActive: et.isActive,
    })));
  } catch (error) {
    console.error('Error fetching election types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/admin/option-groups/election-types - Create new election type
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get the highest displayOrder
    const lastType = await prisma.electionType.findFirst({
      orderBy: { displayOrder: 'desc' },
    });
    const nextOrder = (lastType?.displayOrder || 0) + 1;

    const electionType = await prisma.electionType.create({
      data: {
        name,
        description: description || null,
        isActive: isActive !== false,
        displayOrder: nextOrder,
      },
    });

    await auditLog(authResult.user.userId, 'ELECTION_TYPE_CREATE', request, 'election_type', electionType.id, { name });

    return NextResponse.json(electionType, { status: 201 });
  } catch (error) {
    console.error('Error creating election type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
