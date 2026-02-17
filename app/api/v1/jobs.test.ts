import type { Mock } from 'vitest';
import { GET, POST } from '@/app/api/v1/jobs/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/middleware/auth');
vi.mock('@/lib/audit/logger', () => ({
  auditLog: vi.fn(),
}));

const mockRequest = (method: string, query?: string) => {
  const url = query
    ? `http://localhost:3000/api/v1/jobs?${query}`
    : 'http://localhost:3000/api/v1/jobs';

  const req = new NextRequest(url, {
    method,
    headers: {
      authorization: 'Bearer fake-token',
      'content-type': 'application/json',
    },
  });
  return req;
};

describe('GET /api/v1/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all jobs', async () => {
    const mockJobs = [
      {
        id: 'job1',
        type: 'import_voters',
        status: 'pending',
        totalItems: 0,
        processedItems: 0,
        errorLog: null,
        data: '{}',
        createdById: 'user123',
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        createdBy: { id: 'user123', email: 'user@example.com', name: 'User' },
      },
    ];

    (prisma.job.findMany as Mock).mockResolvedValue(mockJobs);

    const request = mockRequest('GET');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.jobs)).toBe(true);
  });

  it('should filter jobs by status', async () => {
    (prisma.job.findMany as Mock).mockResolvedValue([]);

    const request = mockRequest('GET', 'status=pending');
    await GET(request);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'pending' }),
      })
    );
  });

  it('should filter jobs by type', async () => {
    (prisma.job.findMany as Mock).mockResolvedValue([]);

    const request = mockRequest('GET', 'type=import_voters');
    await GET(request);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'import_voters' }),
      })
    );
  });

  it('should handle pagination', async () => {
    (prisma.job.findMany as Mock).mockResolvedValue([]);

    const request = mockRequest('GET', 'limit=10&offset=20');
    await GET(request);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    );
  });

  it('should cap limit at 200', async () => {
    (prisma.job.findMany as Mock).mockResolvedValue([]);

    const request = mockRequest('GET', 'limit=500');
    await GET(request);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
      })
    );
  });
});

describe('POST /api/v1/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new job', async () => {
    const { validateProtectedRoute } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: true,
      user: { userId: 'user123' },
      response: null,
    });

    const mockJob = {
      id: 'job456',
      type: 'import_voters',
      status: 'pending',
      totalItems: 0,
      processedItems: 0,
      errorLog: '[]',
      data: JSON.stringify({ filePath: 'test.csv' }),
      createdById: 'user123',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      createdBy: { id: 'user123', email: 'user@example.com', name: 'User' },
    };

    (prisma.job.create as Mock).mockResolvedValue(mockJob);

    const req = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'import_voters',
        data: { filePath: 'test.csv' },
      }),
      headers: {
        authorization: 'Bearer fake-token',
        'content-type': 'application/json',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.job?.type).toBe('import_voters');
  });

  it('should reject unauthenticated requests', async () => {
    const { validateProtectedRoute } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const req = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify({ type: 'import_voters' }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(req);

    expect(response.status).toBe(401);
  });

  it('should reject missing job type', async () => {
    const { validateProtectedRoute } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: true,
      user: { userId: 'user123' },
      response: null,
    });

    const req = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify({ data: { filePath: 'test.csv' } }),
      headers: {
        authorization: 'Bearer fake-token',
        'content-type': 'application/json',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('type');
  });

  it('should reject invalid JSON', async () => {
    const { validateProtectedRoute } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: true,
      user: { userId: 'user123' },
      response: null,
    });

    const req = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        authorization: 'Bearer fake-token',
        'content-type': 'application/json',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should handle creation errors', async () => {
    const { validateProtectedRoute } = require('@/lib/middleware/auth');
    validateProtectedRoute.mockResolvedValue({
      isValid: true,
      user: { userId: 'user123' },
      response: null,
    });

    (prisma.job.create as Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify({ type: 'import_voters' }),
      headers: {
        authorization: 'Bearer fake-token',
        'content-type': 'application/json',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
