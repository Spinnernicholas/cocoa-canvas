import bcryptjs from 'bcryptjs';

/**
 * Hash a password using bcryptjs with salt rounds of 12
 * @param password - Plain text password to hash
 * @returns Hash of the password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(12);
  return bcryptjs.hash(password, salt);
}

/**
 * Verify a password against its hash
 * @param password - Plain text password to verify
 * @param hash - Hash to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with valid flag and message
 */
export function validatePasswordStrength(
  password: string
): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  // Optionally: check for character variety
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  // For Phase 1, we allow simple passwords. Phase 2+ can enforce stricter rules
  return { valid: true };
}
