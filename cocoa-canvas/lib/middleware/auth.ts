import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { getSession } from '@/lib/auth/session';
import { AuthPayload } from '@/lib/auth/types';

/**
 * Protected route response with user data
 */
export interface ProtectedRouteResult {
  isValid: boolean;
  user?: AuthPayload;
  error?: string;
  response?: NextResponse;
}

/**
 * Extract JWT token from Authorization header
 * Supports both "Authorization: Bearer <token>" format
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Validate a protected route by checking JWT token
 * @param request - Next.js request object
 * @returns Result with validation status and user data
 */
export async function validateProtectedRoute(
  request: NextRequest
): Promise<ProtectedRouteResult> {
  const token = extractToken(request);

  if (!token) {
    return {
      isValid: false,
      error: 'Missing or invalid Authorization header',
      response: NextResponse.json(
        { error: 'Unauthorized: Missing token' },
        { status: 401 }
      ),
    };
  }

  // Verify JWT signature and expiry
  const payload = verifyToken(token);
  if (!payload) {
    return {
      isValid: false,
      error: 'Invalid or expired token',
      response: NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      ),
    };
  }

  // Verify session exists in database
  const session = await getSession(token);
  if (!session) {
    return {
      isValid: false,
      error: 'Session not found or expired',
      response: NextResponse.json(
        { error: 'Unauthorized: Session expired' },
        { status: 401 }
      ),
    };
  }

  return {
    isValid: true,
    user: payload,
  };
}

/**
 * Create an error response for unauthorized requests
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create an error response for forbidden requests
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
