import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/auth/password';

describe('Password Authentication', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'VeryLongPasswordWith123456789!@#$%^&*()' + 'x'.repeat(100);
      const hash = await hashPassword(longPassword);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword123!', hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty passwords', async () => {
      const hash = await hashPassword('TestPassword123!');
      const isValid = await verifyPassword('', hash);
      
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('testpassword123!', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept valid password', () => {
      const result = validatePasswordStrength('validpassword123');
      expect(result.valid).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 8');
    });

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'a'.repeat(129);
      const result = validatePasswordStrength(longPassword);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('less than 128');
    });

    it('should reject empty password', () => {
      const result = validatePasswordStrength('');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('required');
    });

    it('should accept password with 8 characters minimum', () => {
      const result = validatePasswordStrength('12345678');
      expect(result.valid).toBe(true);
    });

    it('should be lenient with character variety', () => {
      // Phase 1 is lenient - only checks length
      const result1 = validatePasswordStrength('8charmin');
      const result2 = validatePasswordStrength('ALLUPPERCASE8');
      const result3 = validatePasswordStrength('alllowercase8');
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(true);
    });
  });
});
