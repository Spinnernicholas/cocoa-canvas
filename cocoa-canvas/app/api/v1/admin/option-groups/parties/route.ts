import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

const prisma = new PrismaClient();

// GET /api/v1/admin/option-groups/parties - List all parties
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parties = await prisma.party.findMany({
      orderBy: { name: 'asc' },
    });

    await auditLog(authResult.user.userId, 'PARTY_LIST', request, 'party');

    return NextResponse.json(parties.map(p => ({
      id: p.id,
      name: p.name,
      abbr: p.abbr,
      description: p.description,
      color: p.color,
      isActive: true,
    })));
  } catch (error) {
    console.error('Error fetching parties:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/admin/option-groups/parties - Create new party
export async function POST(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, abbr, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const party = await prisma.party.create({
      data: {
        name,
        abbr: abbr || null,
        description: description || null,
        color: color || null,
      },
    });

    await auditLog(authResult.user.userId, 'PARTY_CREATE', request, 'party', party.id, { name, abbr });

    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    console.error('Error creating party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
