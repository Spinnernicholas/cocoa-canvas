import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        voter: {
          include: {
            party: true,
            precinct: true,
          },
        },
        volunteer: true,
        donor: true,
        contactInfo: {
          include: {
            location: true,
          },
        },
        contactLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    await auditLog(authResult.user?.userId || '', 'PERSON_VIEW', request, 'person', person.id);

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, middleName, notes } = body;

    // Update Person
    const person = await prisma.person.update({
      where: { id },
      data: {
        firstName,
        lastName,
        middleName: middleName || null,
        notes: notes || null,
      },
      include: {
        voter: {
          include: {
            party: true,
            precinct: true,
          },
        },
        volunteer: true,
        donor: true,
        contactInfo: {
          include: {
            location: true,
          },
        },
        contactLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await auditLog(authResult.user?.userId || '', 'PERSON_UPDATE', request, 'person', person.id);

    return NextResponse.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete person (cascades to voter, contactInfo, contactLogs)
    await prisma.person.delete({
      where: { id },
    });

    await auditLog(authResult.user?.userId || '', 'PERSON_DELETE', request, 'person', id);

    return NextResponse.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Error deleting person:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
