import { GET, POST } from '@/app/api/v1/jobs/route';
import { NextRequest } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { createJob, getJobProgress, getJobs } from '@/lib/queue/runner';

vi.mock('@/lib/middleware/auth');
vi.mock('@/lib/queue/runner', () => ({
  createJob: vi.fn(),
  getJobProgress: vi.fn(),
  getJobs: vi.fn(),
}));
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
        errorLog: '[]',
        data: '{}',
        createdById: 'user123',
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        createdBy: { id: 'user123', email: 'user@example.com', name: 'User' },
      },
    ];

    vi.mocked(getJobs).mockResolvedValue(mockJobs);
    vi.mocked(getJobProgress).mockReturnValue(0);

    const request = mockRequest('GET');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.jobs)).toBe(true);
  });

  it('should filter jobs by status', async () => {
    vi.mocked(getJobs).mockResolvedValue([]);

    const request = mockRequest('GET', 'status=pending');
    await GET(request);

    expect(getJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
      })
    );
  });

  it('should filter jobs by type', async () => {
    vi.mocked(getJobs).mockResolvedValue([]);

    const request = mockRequest('GET', 'type=import_voters');
    await GET(request);

    expect(getJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'import_voters',
      })
    );
  });

  it('should handle pagination', async () => {
    vi.mocked(getJobs).mockResolvedValue([]);

    const request = mockRequest('GET', 'limit=10&offset=20');
    await GET(request);

    expect(getJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 20,
      })
    );
  });

  it('should cap limit at 200', async () => {
    vi.mocked(getJobs).mockResolvedValue([]);

    const request = mockRequest('GET', 'limit=500');
    await GET(request);

    expect(getJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 200,
      })
    );
  });
});

describe('POST /api/v1/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new job', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
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

    vi.mocked(createJob).mockResolvedValue(mockJob);
    vi.mocked(getJobProgress).mockReturnValue(0);

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

  it('should pass isDynamic to job creation', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user123' },
      response: null,
    });

    const mockJob = {
      id: 'job789',
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
      isDynamic: true,
      createdBy: { id: 'user123', email: 'user@example.com', name: 'User' },
    };

    vi.mocked(createJob).mockResolvedValue(mockJob as any);
    vi.mocked(getJobProgress).mockReturnValue(0);

    const req = new NextRequest('http://localhost:3000/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'import_voters',
        data: { filePath: 'test.csv' },
        isDynamic: true,
      }),
      headers: {
        authorization: 'Bearer fake-token',
        'content-type': 'application/json',
      },
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(createJob).toHaveBeenCalledWith(
      'import_voters',
      'user123',
      { filePath: 'test.csv' },
      { isDynamic: true }
    );
  });

  it('should reject unauthenticated requests', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
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
    vi.mocked(validateProtectedRoute).mockResolvedValue({
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
    expect(data.error).toBe('Job type is required');
  });

  it('should reject invalid JSON', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
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
    expect(data.error).toBe('Invalid JSON in request body');
  });

  it('should handle creation errors', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user123' },
      response: null,
    });

    vi.mocked(createJob).mockResolvedValue(null);

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
