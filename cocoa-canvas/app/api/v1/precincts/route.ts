import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [precincts, total] = await Promise.all([
      prisma.precinct.findMany({
        orderBy: { number: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.precinct.count(),
    ]);

    return NextResponse.json({
      precincts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing precincts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { number, name, description, pollingPlace } = body;

    if (!number) {
      return NextResponse.json({ error: 'Precinct number is required' }, { status: 400 });
    }

    const precinct = await prisma.precinct.create({
      data: {
        number,
        name: name || null,
        description: description || null,
        pollingPlace: pollingPlace || null,
      },
    });

    return NextResponse.json(precinct, { status: 201 });
  } catch (error: any) {
    console.error('Error creating precinct:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Precinct with this number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
