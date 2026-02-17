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

    const body = await request.json();
    const { contactType, method, outcome, notes, followUpNeeded, followUpDate } = body;

    const contactMethod = method || contactType; // Support both field names for backwards compatibility

    if (!contactMethod) {
      return NextResponse.json({ error: 'Contact method is required' }, { status: 400 });
    }

    // Check if voter exists
    const voter = await prisma.voter.findUnique({
      where: { id },
      include: { person: true },
    });

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Create contact log (linked to Person)
    const contactLog = await prisma.contactLog.create({
      data: {
        personId: voter.personId,
        method: contactMethod,
        outcome: outcome || null,
        notes: notes || null,
        followUpNeeded: followUpNeeded || false,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });

    await auditLog(authResult.user?.userId || '', 'CONTACT_LOG_CREATE', request, 'contact_log', contactLog.id);

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

    // Check if voter exists and get their personId
    const voter = await prisma.voter.findUnique({
      where: { id },
      select: { personId: true },
    });

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    const contactLogs = await prisma.contactLog.findMany({
      where: { personId: voter.personId },
      orderBy: { createdAt: 'desc' },
    });

    await auditLog(authResult.user?.userId || '', 'CONTACT_LOG_LIST', request, 'voter', id);

    return NextResponse.json(contactLogs);
  } catch (error) {
    console.error('Error fetching contact logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
