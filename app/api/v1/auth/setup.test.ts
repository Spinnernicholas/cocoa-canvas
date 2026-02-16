import { POST } from '@/app/api/v1/auth/setup/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit/logger', () => ({
  auditLog: jest.fn(),
}));

describe('POST /api/v1/auth/setup', () => {
  const mockRequest = (body: any) => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/setup', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
      },
    });
    return req;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject if users already exist', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const request = mockRequest({
      email: 'admin@example.com',
      password: 'TestPassword123',
      passwordConfirm: 'TestPassword123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should reject if passwords do not match', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    const request = mockRequest({
      email: 'admin@example.com',
      password: 'TestPassword123',
      passwordConfirm: 'DifferentPassword123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('do not match');
  });

  it('should reject missing required fields', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    const request = mockRequest({
      email: 'admin@example.com',
      // missing password and passwordConfirm
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should reject invalid JSON', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/v1/auth/setup', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });
});
