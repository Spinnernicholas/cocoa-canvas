import { generateToken, verifyToken, decodeToken, isTokenExpired, getTokenTimeRemaining } from '@/lib/auth/jwt';

describe('JWT Token Management', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user123';
      const email = 'user@example.com';
      const token = generateToken(userId, email);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user1', 'user1@example.com');
      const token2 = generateToken('user2', 'user2@example.com');
      
      expect(token1).not.toBe(token2);
    });

    it('should encode user information in token', () => {
      const userId = 'user123';
      const email = 'user@example.com';
      const token = generateToken(userId, email);
      const decoded = decodeToken(token);
      
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const userId = 'user123';
      const email = 'user@example.com';
      const token = generateToken(userId, email);
      const verified = verifyToken(token);
      
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(userId);
      expect(verified?.email).toBe(email);
    });

    it('should reject invalid token', () => {
      const verified = verifyToken('invalid.token.here');
      expect(verified).toBeNull();
    });

    it('should reject malformed token', () => {
      const verified = verifyToken('not-a-jwt');
      expect(verified).toBeNull();
    });

    it('should reject empty token', () => {
      const verified = verifyToken('');
      expect(verified).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const userId = 'user123';
      const email = 'user@example.com';
      const token = generateToken(userId, email);
      const decoded = decodeToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.email).toBe(email);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for fresh token', () => {
      const token = generateToken('user123', 'user@example.com');
      const expired = isTokenExpired(token);
      
      expect(expired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const expired = isTokenExpired('invalid.token');
      expect(expired).toBe(true);
    });
  });

  describe('getTokenTimeRemaining', () => {
    it('should return positive time for fresh token', () => {
      const token = generateToken('user123', 'user@example.com');
      const remaining = getTokenTimeRemaining(token);
      
      expect(remaining).toBeGreaterThan(0);
    });

    it('should return 0 for invalid token', () => {
      const remaining = getTokenTimeRemaining('invalid.token');
      expect(remaining).toBe(0);
    });

    it('should return less than 30 minutes for fresh token', () => {
      const token = generateToken('user123', 'user@example.com');
      const remaining = getTokenTimeRemaining(token);
      
      // 30 minutes = 1800 seconds
      expect(remaining).toBeLessThanOrEqual(1800);
      expect(remaining).toBeGreaterThan(0);
    });
  });
});
