import { NextResponse } from 'next/server';
import { isSetupNeeded, performAutoSetup } from '@/lib/auth/auto-setup';

export async function GET() {
  try {
    // Check if setup is needed and attempt auto-setup if env vars are configured
    const setupNeeded = await isSetupNeeded();
    let autoSetupAttempted = false;
    let autoSetupCompleted = false;

    if (setupNeeded) {
      // Try to auto-setup if ADMIN_EMAIL and ADMIN_PASSWORD are provided
      const result = await performAutoSetup();
      autoSetupAttempted = true;
      autoSetupCompleted = result.completed;

      if (autoSetupCompleted) {
        console.log('[Health Check] Auto-setup completed successfully');
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      setup: {
        needed: setupNeeded && !autoSetupCompleted,
        autoSetupAttempted,
        autoSetupCompleted,
      },
    });
  } catch (error) {
    console.error('[Health Check Error]', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
