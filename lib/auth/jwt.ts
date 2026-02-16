import jwt from 'jsonwebtoken';
import { AuthPayload } from './types';

const SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production';
const EXPIRY = process.env.JWT_EXPIRY || '30m';

/**
 * Generate a JWT token for a user
 * @param userId - User ID to encode in token
 * @param email - User email to encode in token
 * @returns JWT token string
 */
export function generateToken(userId: string, email: string): string {
  const payload: Omit<AuthPayload, 'iat' | 'exp'> = {
    userId,
    email,
  };

  return jwt.sign(payload, SECRET, {
    expiresIn: EXPIRY,
  });
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload as AuthPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a token without verifying signature (use with caution)
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid
 */
export function decodeToken(token: string): AuthPayload | null {
  try {
    const payload = jwt.decode(token);
    return payload as AuthPayload | null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token - JWT token to check
 * @returns True if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Get time remaining on a token in seconds
 * @param token - JWT token to check
 * @returns Seconds remaining, or 0 if expired
 */
export function getTokenTimeRemaining(token: string): number {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;
  return Math.max(0, remaining);
}
