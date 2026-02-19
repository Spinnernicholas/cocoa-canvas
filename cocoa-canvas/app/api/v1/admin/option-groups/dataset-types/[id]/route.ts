import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT /api/v1/admin/option-groups/dataset-types/[id] - Update dataset type
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const datasetType = await prisma.datasetType.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        category: category || null,
        isActive: isActive !== false,
      },
    });

    await auditLog(authResult.user.userId, 'DATASET_TYPE_UPDATE', request, 'dataset_type', datasetType.id, { name });

    return NextResponse.json(datasetType);
  } catch (error) {
    console.error('Error updating dataset type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/option-groups/dataset-types/[id] - Delete dataset type
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.datasetType.delete({
      where: { id: params.id },
    });

    await auditLog(authResult.user.userId, 'DATASET_TYPE_DELETE', request, 'dataset_type', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dataset type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
