import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/v1/admin/option-groups/dataset-types - List all dataset types
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const datasetTypes = await prisma.datasetType.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    await auditLog(authResult.user.userId, 'DATASET_TYPE_LIST', request, 'dataset_type');

    return NextResponse.json(datasetTypes.map(dt => ({
      id: dt.id,
      name: dt.name,
      description: dt.description,
      category: dt.category,
      isActive: dt.isActive,
    })));
  } catch (error) {
    console.error('Error fetching dataset types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/admin/option-groups/dataset-types - Create new dataset type
export async function POST(request: NextRequest) {
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

    // Get the highest displayOrder
    const lastType = await prisma.datasetType.findFirst({
      orderBy: { displayOrder: 'desc' },
    });
    const nextOrder = (lastType?.displayOrder || 0) + 1;

    const datasetType = await prisma.datasetType.create({
      data: {
        name,
        description: description || null,
        category: category || null,
        isActive: isActive !== false,
        displayOrder: nextOrder,
      },
    });

    await auditLog(authResult.user.userId, 'DATASET_TYPE_CREATE', request, 'dataset_type', datasetType.id, { name });

    return NextResponse.json(datasetType, { status: 201 });
  } catch (error) {
    console.error('Error creating dataset type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
