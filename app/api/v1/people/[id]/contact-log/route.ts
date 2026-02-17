import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

export async function POST(
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
      select: { id: true, voter: { select: { id: true } } },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const body = await request.json();
    const { contactType, method, outcome, notes, followUpNeeded, followUpDate } = body;

    // Create contact log for the person
    const contactLog = await prisma.contactLog.create({
      data: {
        personId: person.id,
        method: method || contactType || undefined, // Support both field names
        outcome,
        notes,
        followUpNeeded: followUpNeeded || false,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      },
    });

    // Update voter's lastContactDate and lastContactMethod if they are a voter
    if (person.voter && method) {
      await prisma.voter.update({
        where: { id: person.voter.id },
        data: {
          lastContactDate: new Date(),
          lastContactMethod: method,
        },
      });
    }

    await auditLog(authResult.user?.userId || '', 'CONTACT_LOG_CREATE', request, 'person', person.id);

    return NextResponse.json(contactLog, { status: 201 });
  } catch (error) {
    console.error('Error creating contact log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const contactLogs = await prisma.contactLog.findMany({
      where: { personId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ contactLogs });
  } catch (error) {
    console.error('Error fetching contact logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
