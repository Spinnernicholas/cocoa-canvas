import type { Mock } from 'vitest';
import { POST } from '@/app/api/v1/auth/login/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth/jwt';
import { verifyPassword } from '@/lib/auth/password';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit/logger', () => ({
  auditLog: vi.fn(),
}));

vi.mock('@/lib/auth/password');
vi.mock('@/lib/auth/jwt');
vi.mock('@/lib/auth/session');

const mockRequest = (body: any) => {
  const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Test Browser',
    },
  });
  return req;
};

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should login user successfully', async () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'hashedpassword',
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
    };

    (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
    (prisma.user.update as Mock).mockResolvedValue(mockUser);
    (prisma.session.create as Mock).mockResolvedValue({
      id: 'session123',
      token: 'fake-jwt-token',
    });

    // Mock the password verification
    vi.mocked(verifyPassword).mockResolvedValue(true);

    // Mock token generation
    vi.mocked(generateToken).mockReturnValue('fake-jwt-token');

    const request = mockRequest({
      email: 'user@example.com',
      password: 'TestPassword123!',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user?.email).toBe('user@example.com');
    expect(data.token).toBeDefined();
  });

  it('should reject invalid email', async () => {
    (prisma.user.findUnique as Mock).mockResolvedValue(null);

    const request = mockRequest({
      email: 'nonexistent@example.com',
      password: 'TestPassword123!',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Invalid');
  });

  it('should reject incorrect password', async () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'hashedpassword',
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
    };

    (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
    (prisma.user.update as Mock).mockResolvedValue(mockUser);

    // Mock failed password verification
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const request = mockRequest({
      email: 'user@example.com',
      password: 'WrongPassword123!',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Invalid');
  });

  it('should reject disabled account', async () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'hashedpassword',
      isActive: false,
      loginAttempts: 0,
      lockedUntil: null,
    };

    (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);

    const request = mockRequest({
      email: 'user@example.com',
      password: 'TestPassword123!',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('disabled');
  });

  it('should reject missing email', async () => {
    const request = mockRequest({
      password: 'TestPassword123!',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should reject missing password', async () => {
    const request = mockRequest({
      email: 'user@example.com',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should reject invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
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

  it('should track failed login attempts', async () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      name: 'Test User',
      passwordHash: 'hashedpassword',
      isActive: true,
      loginAttempts: 3,
      lockedUntil: null,
    };

    (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
    (prisma.user.update as Mock).mockResolvedValue({
      ...mockUser,
      loginAttempts: 4,
    });

    vi.mocked(verifyPassword).mockResolvedValue(false);

    const request = mockRequest({
      email: 'user@example.com',
      password: 'WrongPassword123!',
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
