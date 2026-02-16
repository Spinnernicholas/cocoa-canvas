import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.contactStatus = status;
    }

    // Get voters
    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        include: {
          contactLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.voter.count({ where }),
    ]);

    await auditLog(authResult.user?.userId || '', 'VOTER_LIST', request);

    return NextResponse.json({
      voters,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing voters:', error);
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
    const { firstName, lastName, middleName, email, phone, address, city, zipCode, notes } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    const voter = await prisma.voter.create({
      data: {
        firstName,
        lastName,
        middleName: middleName || null,
        notes: notes || null,
        contactStatus: 'pending',
        registrationDate: new Date(),
      },
    });

    await auditLog(authResult.user?.userId || '', 'VOTER_CREATE', request, 'voter', voter.id);

    return NextResponse.json(voter, { status: 201 });
  } catch (error: any) {
    console.error('Error creating voter:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate voter record' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
