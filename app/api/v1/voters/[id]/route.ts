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

    const voter = await prisma.voter.findUnique({
      where: { id },
      include: {
        person: true,
        party: true,
        precinct: true,
        contactLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    await auditLog(authResult.user?.userId || '', 'VOTER_VIEW', request, 'voter', voter.id);

    return NextResponse.json(voter);
  } catch (error) {
    console.error('Error fetching voter:', error);
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
    const { firstName, lastName, middleName, notes, contactStatus } = body;

    // Check if voter exists
    const existingVoter = await prisma.voter.findUnique({
      where: { id },
      include: { person: true },
    });

    if (!existingVoter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Update Person if name fields provided
    if (firstName || lastName || middleName !== undefined || notes !== undefined) {
      await prisma.person.update({
        where: { id: existingVoter.personId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(middleName !== undefined && { middleName: middleName || null }),
          ...(notes !== undefined && { notes: notes || null }),
        },
      });
    }

    // Update Voter
    const voter = await prisma.voter.update({
      where: { id },
      data: {
        ...(contactStatus && { contactStatus }),
      },
      include: {
        person: true,
        party: true,
        precinct: true,
        contactLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await auditLog(authResult.user?.userId || '', 'VOTER_UPDATE', request, 'voter', voter.id);

    return NextResponse.json(voter);
  } catch (error: any) {
    console.error('Error updating voter:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email or phone already exists' },
        { status: 409 }
      );
    }

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

    // Check if voter exists
    const voter = await prisma.voter.findUnique({
      where: { id },
    });

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Delete related contact logs
    await prisma.contactLog.deleteMany({
      where: { voterId: id },
    });

    // Delete voter
    await prisma.voter.delete({
      where: { id },
    });

    await auditLog(authResult.user?.userId || '', 'VOTER_DELETE', request, 'voter', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting voter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
