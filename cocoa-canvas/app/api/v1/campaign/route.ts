import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { auditLog } from '@/lib/audit/logger';

/**
 * GET /api/v1/campaign
 * Get the single campaign with statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the single campaign
    const campaign = await prisma.campaign.findFirst();

    if (!campaign) {
      return NextResponse.json(
        {
          error: 'Campaign not found',
          message: 'No campaign has been created yet. Please create one using PUT /api/v1/campaign',
        },
        { status: 404 }
      );
    }

    // Calculate statistics
    const householdCount = await prisma.household.count();
    const personCount = await prisma.person.count();
    const voterCount = await prisma.voter.count();
    const volunteerCount = await prisma.volunteer.count();
    const donorCount = await prisma.donor.count();

    const stats = {
      households: householdCount,
      people: personCount,
      voters: voterCount,
      volunteers: volunteerCount,
      donors: donorCount,
    };

    // Audit log
    await auditLog(
      authResult.user?.userId || 'Unknown',
      'GET_CAMPAIGN',
      request,
      'campaign',
      campaign.id
    );

    return NextResponse.json({
      campaign,
      stats,
    });
  } catch (error) {
    console.error('[Campaign GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/campaign
 * Update campaign details or create if doesn't exist
 */
export async function PUT(request: NextRequest) {
  try {
    // Check auth
    const authResult = await validateProtectedRoute(request);
    if (!authResult.isValid) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, startDate, endDate, targetArea, color, logoUrl } = body;

    // Validate required fields
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate, endDate' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return NextResponse.json(
        { error: 'Invalid dates: startDate must be before endDate' },
        { status: 400 }
      );
    }

    // Get or create the single campaign
    let campaign = await prisma.campaign.findFirst();

    if (campaign) {
      // Update existing campaign
      campaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          name,
          description: description || undefined,
          startDate: start,
          endDate: end,
          targetArea: targetArea || undefined,
          color: color || '#6B4423',
          logoUrl: logoUrl || undefined,
        },
      });

      // Audit log
      await auditLog(
        authResult.user?.userId || 'Unknown',
        'UPDATE_CAMPAIGN',
        request,
        'campaign',
        campaign.id,
        {
          name,
          startDate,
          endDate,
        }
      );
    } else {
      // Create new campaign
      campaign = await prisma.campaign.create({
        data: {
          name,
          description: description || undefined,
          startDate: start,
          endDate: end,
          targetArea: targetArea || undefined,
          color: color || '#6B4423',
          logoUrl: logoUrl || undefined,
        },
      });

      // Audit log
      await auditLog(
        authResult.user?.userId || 'Unknown',
        'CREATE_CAMPAIGN',
        request,
        'campaign',
        campaign.id,
        {
          name,
          startDate,
          endDate,
        }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('[Campaign PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
