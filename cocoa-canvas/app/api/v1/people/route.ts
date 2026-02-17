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
    const filter = searchParams.get('filter'); // 'all', 'voters', 'volunteers', 'donors'
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
    const voterWhere: any = {};

    if (search) {
      personWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { emails: { some: { address: { contains: search, mode: 'insensitive' } } } },
        { phones: { some: { number: { contains: search } } } },
      ];
    }

    if (gender) {
      personWhere.gender = gender;
    }

    if (hasEmail === 'true') {
      personWhere.emails = { some: {} };
    }
    if (hasPhone === 'true') {
      personWhere.phones = { some: {} };
    }

    if (city || zipCode) {
      const addressFilter: any = {};
      if (city) addressFilter.city = { contains: city, mode: 'insensitive' };
      if (zipCode) addressFilter.zipCode = { contains: zipCode };
      personWhere.addresses = { some: addressFilter };
    }

    if (Object.keys(personWhere).length > 0) {
      Object.assign(where, personWhere);
    }

    // Filter by person type
    if (filter === 'voters') {
      where.voter = { isNot: null };
    } else if (filter === 'volunteers') {
      where.volunteer = { isNot: null };
    } else if (filter === 'donors') {
      where.donor = { isNot: null };
    }

    if (partyId) {
      voterWhere.partyId = partyId;
    }

    if (precinctId) {
      voterWhere.precinctId = precinctId;
    }

    if (vbmStatus) {
      voterWhere.vbmStatus = vbmStatus === 'None' ? null : vbmStatus;
    }

    if (registrationDateFrom || registrationDateTo) {
      voterWhere.registrationDate = {};
      if (registrationDateFrom) {
        voterWhere.registrationDate.gte = new Date(registrationDateFrom);
      }
      if (registrationDateTo) {
        voterWhere.registrationDate.lte = new Date(registrationDateTo);
      }
    }

    if (Object.keys(voterWhere).length > 0) {
      where.voter = { is: voterWhere };
    }

    // Get people with optional voter/volunteer/donor data
    const [people, total] = await Promise.all([
      prisma.person.findMany({
        where,
        include: {
          voter: { include: { party: true,precinct: true } },
          volunteer: true,
          donor: true,
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.person.count({ where }),
    ]);

    await auditLog(authResult.user?.userId || '', 'PEOPLE_LIST', request);

    return NextResponse.json({
      people,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing people:', error);
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
    const { firstName, lastName, middleName, notes, createVoter } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    // Create Person
    const person = await prisma.person.create({
      data: {
        firstName,
        lastName,
        middleName: middleName || null,
        notes: notes || null,
        ...(createVoter && {
          voter: {
            create: {},
          },
        }),
      },
      include: {
        voter: true,
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
      },
    });

    await auditLog(authResult.user?.userId || '', 'PERSON_CREATE', request, 'person', person.id);

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
