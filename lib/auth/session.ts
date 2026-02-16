import { prisma } from '@/lib/prisma';
import { SessionData } from './types';
import { verifyToken } from './jwt';

/**
 * Create a new session for a user
 * @param userId - User ID to create session for
 * @param token - JWT token
 * @param ipAddress - Optional IP address of requester
 * @param userAgent - Optional user agent of requester
 * @returns Created session
 */
export async function createSession(
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<SessionData> {
  // Sessions expire in 30 days (can be customized)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
    createdAt: session.createdAt,
  };
}

/**
 * Get a session by token
 * @param token - JWT token to look up
 * @returns Session if found and valid, or null
 */
export async function getSession(token: string): Promise<SessionData | null> {
  // Verify token is valid
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Get session from database
  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
    createdAt: session.createdAt,
  };
}

/**
 * Invalidate a session (logout)
 * @param token - JWT token to invalidate
 */
export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

/**
 * Cleanup expired sessions
 * @returns Number of deleted sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Get all sessions for a user
 * @param userId - User ID
 * @returns Array of sessions
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return sessions.map((s: any) => ({
    id: s.id,
    userId: s.userId,
    token: s.token,
    expiresAt: s.expiresAt,
    ipAddress: s.ipAddress || undefined,
    userAgent: s.userAgent || undefined,
    createdAt: s.createdAt,
  }));
}

/**
 * Invalidate all sessions for a user (logout all devices)
 * @param userId - User ID
 */
export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}
