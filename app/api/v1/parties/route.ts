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

    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.party.count(),
    ]);

    return NextResponse.json({
      parties,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing parties:', error);
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
    const { name, abbr, description, color } = body;

    if (!name || !abbr) {
      return NextResponse.json({ error: 'Name and abbreviation are required' }, { status: 400 });
    }

    const party = await prisma.party.create({
      data: {
        name,
        abbr,
        description: description || null,
        color: color || null,
      },
    });

    return NextResponse.json(party, { status: 201 });
  } catch (error: any) {
    console.error('Error creating party:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Party with this name or abbreviation already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
