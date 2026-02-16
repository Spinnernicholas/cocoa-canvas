import { NextRequest, NextResponse } from 'next/server';
import { extractToken, validateProtectedRoute } from '@/lib/middleware/auth';
import { invalidateSession } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit/logger';

/**
 * POST /api/v1/auth/logout
 * 
 * Logout user by invalidating their session
 * 
 * Authorization header required:
 * Authorization: Bearer <token>
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 * 
 * Error responses:
 * - 401: Missing or invalid token
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate token before logout
    const validation = await validateProtectedRoute(request);
    if (!validation.isValid) {
      return validation.response!;
    }

    // Extract and invalidate token
    const token = extractToken(request);
    if (token) {
      await invalidateSession(token);
    }

    // Log logout
    await auditLog(validation.user!.userId, 'logout', request, 'user', validation.user!.userId);

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth Logout Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
