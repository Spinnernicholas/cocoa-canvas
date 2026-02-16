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
    const { contactType, outcome, notes, followUpNeeded, followUpDate } = body;

    if (!contactType) {
      return NextResponse.json({ error: 'Contact type is required' }, { status: 400 });
    }

    // Check if voter exists
    const voter = await prisma.voter.findUnique({
      where: { id },
    });

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Create contact log
    const contactLog = await prisma.contactLog.create({
      data: {
        voterId: id,
        contactType,
        outcome: outcome || null,
        notes: notes || null,
        followUpNeeded: followUpNeeded || false,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });

    // Update voter's last contact info
    await prisma.voter.update({
      where: { id },
      data: {
        lastContactDate: new Date(),
        lastContactMethod: contactType,
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

    // Check if voter exists
    const voter = await prisma.voter.findUnique({
      where: { id },
    });

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    const contactLogs = await prisma.contactLog.findMany({
      where: { voterId: id },
      orderBy: { createdAt: 'desc' },
    });

    await auditLog(authResult.user?.userId || '', 'CONTACT_LOG_LIST', request, 'voter', id);

    return NextResponse.json(contactLogs);
  } catch (error) {
    console.error('Error fetching contact logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
