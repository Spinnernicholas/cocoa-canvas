import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

const prisma = new PrismaClient();

// PUT /api/v1/admin/option-groups/parties/[id] - Update party
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, abbr, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const party = await prisma.party.update({
      where: { id },
      data: {
        name,
        abbr: abbr || null,
        description: description || null,
        color: color || null,
      },
    });

    await auditLog(authResult.user.userId, 'PARTY_UPDATE', request, 'party', party.id, { name, abbr });

    return NextResponse.json(party);
  } catch (error) {
    console.error('Error updating party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/option-groups/parties/[id] - Delete party
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.party.delete({
      where: { id },
    });

    await auditLog(authResult.user.userId, 'PARTY_DELETE', request, 'party', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting party:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
