import { NextRequest } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/v1/admin/geocoders/[id]/primary/route';

vi.mock('@/lib/middleware/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    geocoderProvider: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Admin geocoders [id]/primary route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when provider is not found', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.geocoderProvider.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1/primary', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'provider-1' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Provider not found');
  });

  it('returns 400 when provider is disabled', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.geocoderProvider.findUnique as any).mockResolvedValue({
      id: 'provider-1',
      providerName: 'Provider 1',
      isEnabled: false,
    });

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1/primary', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'provider-1' }) });

    expect(response.status).toBe(400);
    expect(prisma.geocoderProvider.updateMany).not.toHaveBeenCalled();
  });

  it('sets provider as primary when enabled', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.geocoderProvider.findUnique as any).mockResolvedValue({
      id: 'provider-1',
      providerName: 'Provider 1',
      isEnabled: true,
    });
    vi.mocked(prisma.geocoderProvider.updateMany as any).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.geocoderProvider.update as any).mockResolvedValue({
      id: 'provider-1',
      isPrimary: true,
    });

    const request = new NextRequest('http://localhost:3000/api/v1/admin/geocoders/provider-1/primary', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'provider-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.geocoderProvider.updateMany).toHaveBeenCalledWith({
      where: {},
      data: { isPrimary: false },
    });
    expect(prisma.geocoderProvider.update).toHaveBeenCalledWith({
      where: { id: 'provider-1' },
      data: { isPrimary: true },
    });
  });
});
