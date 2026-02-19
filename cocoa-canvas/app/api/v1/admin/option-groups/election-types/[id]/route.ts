import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT /api/v1/admin/option-groups/election-types/[id] - Update election type
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const electionType = await prisma.electionType.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        isActive: isActive !== false,
      },
    });

    await auditLog(authResult.user.userId, 'ELECTION_TYPE_UPDATE', request, 'election_type', electionType.id, { name });

    return NextResponse.json(electionType);
  } catch (error) {
    console.error('Error updating election type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/option-groups/election-types/[id] - Delete election type
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.electionType.delete({
      where: { id: params.id },
    });

    await auditLog(authResult.user.userId, 'ELECTION_TYPE_DELETE', request, 'election_type', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting election type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
