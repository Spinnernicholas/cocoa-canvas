import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';

interface SetupRequest {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
}

interface SetupResponse {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * POST /api/v1/auth/setup
 * 
 * One-time endpoint to create the initial admin user
 * Only works if no users exist yet
 * 
 * Request body:
 * {
 *   "email": "admin@example.com",
 *   "password": "SecurePassword123!",
 *   "passwordConfirm": "SecurePassword123!",
 *   "name": "Admin Name"
 * }
 * 
 * Success response (200):
 * {
 *   "success": true,
 *   "message": "Admin user created successfully",
 *   "token": "eyJhbGc...",
 *   "user": {
 *     "id": "uuid",
 *     "email": "admin@example.com",
 *     "name": "Admin Name"
 *   }
 * }
 * 
 * Error responses:
 * - 400: Setup already complete (users exist)
 * - 400: Missing or invalid fields
 * - 400: Passwords don't match
 * - 400: Password too weak
 * - 400: Email already exists
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<SetupResponse>> {
  try {
    // Check if setup is already complete (users exist)
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Setup is already complete. Database already contains users.',
        },
        { status: 400 }
      );
    }

    // Parse request body
    let body: SetupRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate required fields
    const { email, password, passwordConfirm, name } = body;
    if (!email || !password || !passwordConfirm) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, password, and password confirmation are required',
        },
        { status: 400 }
      );
    }

    // Validate passwords match
    if (password !== passwordConfirm) {
      return NextResponse.json(
        {
          success: false,
          error: 'Passwords do not match',
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: strengthCheck.message,
        },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists (shouldn't happen since user count is 0)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already exists',
        },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || 'Admin',
        isActive: true,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Create session in database
    await createSession(
      user.id,
      token,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined
    );

    // Create initial setting for setup completion timestamp
    await prisma.setting.upsert({
      where: { key: 'setup_completed_at' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'setup_completed_at',
        value: new Date().toISOString(),
      },
    });

    const response: SetupResponse = {
      success: true,
      message: 'Admin user created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Auth Setup Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
