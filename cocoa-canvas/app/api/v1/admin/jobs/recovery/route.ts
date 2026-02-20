import { NextRequest, NextResponse } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { recoverJobsOnStartup } from '@/lib/queue/recovery';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await validateProtectedRoute(request);
  if (!authResult.isValid) {
    return authResult.response;
  }

  try {
    const summary = await recoverJobsOnStartup();

    return NextResponse.json({
      success: true,
      summary,
      message: 'Job recovery run completed',
    });
  } catch (error) {
    console.error('[Jobs Recovery API Error][POST]', error);
    return NextResponse.json(
      { error: 'Failed to run job recovery' },
      { status: 500 }
    );
  }
}
