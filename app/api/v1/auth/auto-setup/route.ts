import { NextRequest, NextResponse } from 'next/server';
import { performAutoSetup } from '@/lib/auth/auto-setup';

interface AutoSetupResponse {
  success: boolean;
  message: string;
  completed?: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
}

/**
 * POST /api/v1/auth/auto-setup
 * 
 * Attempts to automatically set up the admin user based on environment variables.
 * This endpoint can be called by the client to trigger auto-setup, or it can be
 * called automatically by other endpoints (like health check).
 * 
 * Returns:
 * - 200: Setup completed or already complete
 * - 400: Setup requirements not met (no env vars, or setup already done)
 * - 500: Internal error
 */
export async function POST(request: NextRequest): Promise<NextResponse<AutoSetupResponse>> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await performAutoSetup(ipAddress, userAgent);

    const statusCode = result.completed ? 200 : 400;
    const success = result.completed;

    return NextResponse.json(
      {
        success,
        message: result.message,
        completed: result.completed,
        user: result.user,
        token: result.token,
        error: result.error,
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('[Auto-Setup Endpoint Error]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/auth/auto-setup
 * 
 * Returns the current auto-setup status without performing setup.
 * Useful for the client to check if auto-setup is available.
 */
export async function GET(request: NextRequest): Promise<NextResponse<AutoSetupResponse>> {
  try {
    // Check if required env vars are available
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    const isConfigured = !!(adminEmail && adminPassword);
    const isEnabled = process.env.AUTO_SETUP_ENABLED !== 'false';

    if (!isConfigured || !isEnabled) {
      return NextResponse.json(
        {
          success: true,
          message: 'Auto-setup is not configured',
          completed: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Auto-setup is configured and ready to be triggered',
        completed: false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auto-Setup Status Error]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
