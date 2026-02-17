import { NextRequest, NextResponse } from 'next/server';
import { extractToken, validateProtectedRoute } from '@/lib/middleware/auth';
import { generateToken } from '@/lib/auth/jwt';
import { createSession, invalidateSession } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit/logger';

interface RefreshResponse {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * POST /api/v1/auth/refresh
 * 
 * Refresh the authentication token (extend session)
 * Requires a valid token in Authorization header
 * 
 * Authorization header required:
 * Authorization: Bearer <token>
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "token": "eyJhbGc..."
 * }
 * 
 * Error responses:
 * - 401: Missing or invalid token
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<RefreshResponse>> {
  try {
    // Validate current token
    const validation = await validateProtectedRoute(request);
    if (!validation.isValid) {
      return validation.response as NextResponse<RefreshResponse>;
    }

    const user = validation.user!;
    const oldToken = extractToken(request)!;

    // Generate new token
    const newToken = generateToken(user.userId, user.email);

    // Create new session
    await createSession(
      user.userId,
      newToken,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined
    );

    // Optionally invalidate old token (can be changed to allow concurrent sessions)
    await invalidateSession(oldToken);

    // Log token refresh
    await auditLog(user.userId, 'refresh_token', request, 'user', user.userId);

    return NextResponse.json(
      {
        success: true,
        token: newToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth Refresh Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
