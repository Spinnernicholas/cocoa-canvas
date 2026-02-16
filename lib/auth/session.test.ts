import { createSession, getSession, invalidateSession } from '@/lib/auth/session';
import { generateToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Mock JWT verification
jest.mock('@/lib/auth/jwt', () => ({
  generateToken: jest.fn(() => 'fake-jwt-token'),
  verifyToken: jest.fn((token) => {
    if (token === 'fake-jwt-token' || token === 'valid-token') {
      return { userId: 'user123', email: 'user@example.com' };
    }
    return null;
  }),
  decodeToken: jest.fn(),
  isTokenExpired: jest.fn(),
  getTokenTimeRemaining: jest.fn(),
}));

describe('Session Management', () => {
  const mockUserId = 'user123';
  const mockToken = 'fake-jwt-token';
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session', async () => {
      const mockSession = {
        id: 'session123',
        userId: mockUserId,
        token: mockToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        createdAt: new Date(),
      };

      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const session = await createSession(mockUserId, mockToken, mockIpAddress, mockUserAgent);

      expect(session).toBeDefined();
      expect(session?.userId).toBe(mockUserId);
      expect(session?.token).toBe(mockToken);
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('should handle creation without IP and user agent', async () => {
      const mockSession = {
        id: 'session123',
        userId: mockUserId,
        token: mockToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const session = await createSession(mockUserId, mockToken);

      expect(session).toBeDefined();
      expect(session?.ipAddress).toBeUndefined();
      expect(session?.userAgent).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should retrieve a valid session', async () => {
      const mockSession = {
        id: 'session123',
        userId: mockUserId,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        createdAt: new Date(),
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      const session = await getSession('valid-token');

      expect(session).toBeDefined();
      expect(session?.token).toBe('valid-token');
      expect(prisma.session.findUnique).toHaveBeenCalled();
    });

    it('should return null for non-existent session', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

      const session = await getSession('nonexistent-token');

      expect(session).toBeNull();
    });

    it('should return null for invalid token', async () => {
      const session = await getSession('invalid-token');
      expect(session).toBeNull();
    });

    it('should return null for expired session', async () => {
      const mockSession = {
        id: 'session123',
        userId: mockUserId,
        token: 'valid-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

      const session = await getSession('valid-token');

      expect(session).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('should delete a session', async () => {
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await invalidateSession(mockToken);

      expect(result).toBeUndefined();
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
    });

    it('should handle deleteMany for multiple matching tokens', async () => {
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await invalidateSession(mockToken);

      expect(result).toBeUndefined();
      expect(prisma.session.deleteMany).toHaveBeenCalled();
    });
  });

  describe('Session Expiry', () => {
    it('should create session with future expiry', async () => {
      const mockSession = {
        id: 'session123',
        userId: mockUserId,
        token: mockToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      (prisma.session.create as jest.Mock).mockResolvedValue(mockSession);

      const session = await createSession(mockUserId, mockToken);

      expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
