import { NextRequest } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { PUT, DELETE } from '@/app/api/v1/admin/geocoders/[id]/route';

vi.mock('@/lib/middleware/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    geocoderProvider: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Admin geocoders [id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth response when unauthorized', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'provider-1' }) });

    expect(response.status).toBe(401);
  });

  it('returns 404 when provider is not found on PUT', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.geocoderProvider.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerName: 'Updated Name' }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: 'provider-1' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Provider not found');
  });

  it('updates provider on PUT', async () => {
    const existingProvider = {
      id: 'provider-1',
      providerName: 'Old Name',
      description: 'Old Description',
      isEnabled: true,
      priority: 1,
      config: '{}',
    };

    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.geocoderProvider.findUnique as any).mockResolvedValue(existingProvider);
    vi.mocked(prisma.geocoderProvider.update as any).mockResolvedValue({
      ...existingProvider,
      providerName: 'New Name',
    });

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ providerName: 'New Name' }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: 'provider-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.geocoderProvider.update).toHaveBeenCalledWith({
      where: { id: 'provider-1' },
      data: {
        providerName: 'New Name',
        description: 'Old Description',
        isEnabled: true,
        priority: 1,
        config: '{}',
      },
    });
  });

  it('returns 409 when deleting primary provider', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.geocoderProvider.findUnique as any).mockResolvedValue({
      id: 'provider-1',
      isPrimary: true,
    });

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'provider-1' }) });

    expect(response.status).toBe(409);
    expect(prisma.geocoderProvider.delete).not.toHaveBeenCalled();
  });

  it('deletes provider on DELETE', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.geocoderProvider.findUnique as any).mockResolvedValue({
      id: 'provider-1',
      isPrimary: false,
    });
    vi.mocked(prisma.geocoderProvider.delete as any).mockResolvedValue({ id: 'provider-1' });

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'provider-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.geocoderProvider.delete).toHaveBeenCalledWith({
      where: { id: 'provider-1' },
    });
  });
});
