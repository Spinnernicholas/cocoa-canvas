import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';

export interface AutoSetupResult {
  completed: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
}

/**
 * Automatically set up the initial admin user if:
 * 1. No users exist in the database yet
 * 2. Required environment variables are provided
 * 
 * Required env vars:
 * - ADMIN_EMAIL: Email for the admin user
 * - ADMIN_PASSWORD: Password for the admin user
 * 
 * Optional env vars:
 * - ADMIN_NAME: Display name for admin user (defaults to "Admin")
 */
export async function performAutoSetup(ipAddress?: string, userAgent?: string): Promise<AutoSetupResult> {
  try {
    // Check if setup is already complete
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return {
        completed: false,
        message: 'Setup already completed - users exist in database',
      };
    }

    // Check if required env vars are provided
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (!adminEmail || !adminPassword) {
      return {
        completed: false,
        message: 'Auto-setup disabled - required environment variables not set (ADMIN_EMAIL, ADMIN_PASSWORD)',
      };
    }

    // Check if AUTO_SETUP is explicitly disabled
    if (process.env.AUTO_SETUP_ENABLED === 'false') {
      return {
        completed: false,
        message: 'Auto-setup is disabled via AUTO_SETUP_ENABLED=false',
      };
    }

    // Validate password strength
    const strengthCheck = validatePasswordStrength(adminPassword);
    if (!strengthCheck.valid) {
      return {
        completed: false,
        error: `Auto-setup failed: ${strengthCheck.message}`,
        message: 'Setup aborted - provided password does not meet strength requirements',
      };
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return {
        completed: false,
        error: 'Auto-setup failed: Invalid email format',
        message: 'Setup aborted - provided email is invalid',
      };
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });

    if (existingUser) {
      return {
        completed: false,
        error: 'Email already exists',
        message: 'Setup aborted - provided email already exists in database',
      };
    }

    // Hash password
    const passwordHash = await hashPassword(adminPassword);

    // Get optional admin name
    const adminName = process.env.ADMIN_NAME?.trim() || 'Admin';

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        name: adminName,
        isActive: true,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Create session in database
    await createSession(
      user.id,
      token,
      ipAddress,
      userAgent
    );

    // Record setup completion
    await prisma.setting.upsert({
      where: { key: 'setup_completed_at' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'setup_completed_at',
        value: new Date().toISOString(),
      },
    });

    return {
      completed: true,
      message: 'Admin user created successfully via auto-setup',
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin',
      },
      token,
    };
  } catch (error) {
    console.error('[Auto-Setup Error]', error);
    return {
      completed: false,
      message: 'Auto-setup failed with an unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if setup is needed (no users in database)
 */
export async function isSetupNeeded(): Promise<boolean> {
  try {
    const userCount = await prisma.user.count();
    return userCount === 0;
  } catch (error) {
    console.error('[Setup Check Error]', error);
    return false;
  }
}
