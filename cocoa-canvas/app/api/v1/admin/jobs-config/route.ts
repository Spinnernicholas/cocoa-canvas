import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { getJobsConfig, saveJobsConfig } from '@/lib/queue/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const config = await getJobsConfig();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[Jobs Config API Error][GET]', error);
    return NextResponse.json(
      { error: 'Failed to load jobs configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const config = await saveJobsConfig({
      maxWorkers: body?.maxWorkers,
      importWorkers: body?.importWorkers,
      geocodeWorkers: body?.geocodeWorkers,
      scheduledWorkers: body?.scheduledWorkers,
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[Jobs Config API Error][PUT]', error);
    return NextResponse.json(
      { error: 'Failed to save jobs configuration' },
      { status: 500 }
    );
  }
}
