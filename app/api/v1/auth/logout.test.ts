import type { Mock } from 'vitest';
import { POST } from '@/app/api/v1/auth/logout/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      deleteMany: vi.fn(() => Promise.resolve({ count: 1 })),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/middleware/auth', () => ({
  validateProtectedRoute: vi.fn(),
  extractToken: vi.fn(() => 'fake-token'),
}));

vi.mock('@/lib/audit/logger', () => ({
  auditLog: vi.fn(),
}));

const mockRequest = (token: string) => {
  const req = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Test Browser',
    },
  });
  return req;
};

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure mocks are properly set up
    (prisma.session.deleteMany as Mock).mockResolvedValue({ count: 1 });
  });

  it('should logout user successfully', async () => {
    // Mock successful validation
    const { validateProtectedRoute } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: true,
      user: {
        userId: 'user123',
        email: 'user@example.com',
      },
      response: null,
    });

    const request = mockRequest('fake-token');
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/logged out/i);
  });

  it('should reject unauthenticated requests', async () => {
    const { validateProtectedRoute } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const request = mockRequest('invalid-token');
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should handle session deletion', async () => {
    const { validateProtectedRoute, extractToken } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: true,
      user: {
        userId: 'user123',
        email: 'user@example.com',
      },
      response: null,
    });

    extractToken.mockReturnValue('fake-token');
    (prisma.session.deleteMany as Mock).mockResolvedValue({ count: 1 });

    const request = mockRequest('fake-token');
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(prisma.session.deleteMany).toHaveBeenCalled();
  });

  it('should create audit log on logout', async () => {
    const { validateProtectedRoute, extractToken } = require('@/lib/middleware/auth');
    const { auditLog } = require('@/lib/audit/logger');

    validateProtectedRoute.mockResolvedValue({
      isValid: true,
      user: {
        userId: 'user123',
        email: 'user@example.com',
      },
      response: null,
    });

    extractToken.mockReturnValue('fake-token');
    (prisma.session.deleteMany as Mock).mockResolvedValue({ count: 1 });

    const request = mockRequest('fake-token');
    await POST(request);

    expect(auditLog).toHaveBeenCalledWith(
      'user123',
      'logout',
      expect.any(Object),
      'user',
      'user123'
    );
  });
});

