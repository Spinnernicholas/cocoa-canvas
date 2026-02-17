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
    const partyId = searchParams.get('partyId');
    const precinctId = searchParams.get('precinctId');
    const vbmStatus = searchParams.get('vbmStatus');
    const gender = searchParams.get('gender');
    const city = searchParams.get('city');
    const zipCode = searchParams.get('zipCode');
    const registrationDateFrom = searchParams.get('registrationDateFrom');
    const registrationDateTo = searchParams.get('registrationDateTo');
    const hasEmail = searchParams.get('hasEmail');
    const hasPhone = searchParams.get('hasPhone');

    // Build where clause
    const where: any = {};
    const personWhere: any = {};
    
    // Text search across name, email, phone
    if (search) {
      personWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { emails: { some: { address: { contains: search, mode: 'insensitive' } } } },
        { phones: { some: { number: { contains: search } } } },
      ];
    }

    // Gender filter
    if (gender) {
      personWhere.gender = gender;
    }

    // Contact info filters
    if (hasEmail === 'true') {
      personWhere.emails = { some: {} };
    }
    if (hasPhone === 'true') {
      personWhere.phones = { some: {} };
    }

    // City/Zip filters on addresses
    if (city || zipCode) {
      const addressFilter: any = {};
      if (city) addressFilter.city = { contains: city, mode: 'insensitive' };
      if (zipCode) addressFilter.zipCode = { contains: zipCode };
      personWhere.addresses = { some: addressFilter };
    }

    if (Object.keys(personWhere).length > 0) {
      where.person = personWhere;
    }

    // Party filter
    if (partyId) {
      where.partyId = partyId;
    }

    // Precinct filter
    if (precinctId) {
      where.precinctId = precinctId;
    }

    // VBM Status filter
    if (vbmStatus) {
      where.vbmStatus = vbmStatus === 'None' ? null : vbmStatus;
    }

    // Registration date range
    if (registrationDateFrom || registrationDateTo) {
      where.registrationDate = {};
      if (registrationDateFrom) {
        where.registrationDate.gte = new Date(registrationDateFrom);
      }
      if (registrationDateTo) {
        where.registrationDate.lte = new Date(registrationDateTo);
      }
    }

    // Get voters with person data
    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        include: {
          person: {
            include: {
              addresses: {
                include: {
                  location: true,
                },
              },
              phones: {
                include: {
                  location: true,
                },
              },
              emails: {
                include: {
                  location: true,
                },
              },
              contactLogs: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          party: true,
          precinct: true,
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

    // Create Person first
    const person = await prisma.person.create({
      data: {
        firstName,
        lastName,
        middleName: middleName || null,
        notes: notes || null,
      },
    });

    // Create Voter linked to Person
    const voter = await prisma.voter.create({
      data: {
        personId: person.id,
        registrationDate: new Date(),
      },
      include: {
        person: true,
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
