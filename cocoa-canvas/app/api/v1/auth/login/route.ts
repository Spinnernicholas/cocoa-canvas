import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';
import { auditLog } from '@/lib/audit/logger';
import { LoginRequest, LoginResponse } from '@/lib/auth/types';

/**
 * POST /api/v1/auth/login
 * 
 * Authenticate a user with email and password
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "token": "eyJhbGc...",
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "name": "User Name"
 *   }
 * }
 * 
 * Error responses:
 * - 400: Missing email or password
 * - 401: Invalid email or password
 * - 401: Account is disabled
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: LoginRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: (user.loginAttempts || 0) + 1,
          lockedUntil:
            (user.loginAttempts || 0) >= 4 // Lock after 5 failed attempts
              ? new Date(Date.now() + 15 * 60 * 1000) // 15 minute lockout
              : null,
        },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Account is temporarily locked. Try again later.' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Create session in database
    await createSession(
      user.id,
      token,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined
    );

    // Reset login attempts and lock on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    // Log successful login
    await auditLog(user.id, 'login', request, 'user', user.id);

    const response: LoginResponse = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'User',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Auth Login Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
