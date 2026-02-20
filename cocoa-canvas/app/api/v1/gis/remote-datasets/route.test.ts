import { NextRequest } from 'next/server';
import { validateProtectedRoute } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/v1/gis/remote-datasets/route';
import { POST as importRemoteDataset } from '@/app/api/v1/gis/remote-datasets/import/route';

vi.mock('@/lib/middleware/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    remoteGISDataset: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    datasetType: {
      findUnique: vi.fn(),
    },
    gISDataset: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('GIS remote datasets routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth response when unauthorized', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/v1/gis/remote-datasets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serviceUrl: 'https://example.com', layerId: 1, layerName: 'Parcels' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 when required remote dataset fields are missing', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/v1/gis/remote-datasets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serviceUrl: 'https://example.com' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('creates remote dataset with spatial reference SRID', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.remoteGISDataset.findUnique as any).mockResolvedValue(null);
    vi.mocked(prisma.remoteGISDataset.create as any).mockResolvedValue({ id: 'remote-1' });

    const request = new NextRequest('http://localhost:3000/api/v1/gis/remote-datasets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceUrl: 'https://example.com/arcgis/rest/services/Demo/MapServer',
        layerId: 2,
        layerName: 'Demo Layer',
        spatialReference: { wkid: 3857 },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(prisma.remoteGISDataset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          srid: 3857,
        }),
      })
    );
  });

  it('updates existing remote dataset without forcing null JSON fields', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.remoteGISDataset.findUnique as any).mockResolvedValue({
      id: 'remote-1',
      fields: null,
      extent: null,
    });
    vi.mocked(prisma.remoteGISDataset.update as any).mockResolvedValue({ id: 'remote-1' });

    const request = new NextRequest('http://localhost:3000/api/v1/gis/remote-datasets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceUrl: 'https://example.com/arcgis/rest/services/Demo/MapServer',
        layerId: 2,
        layerName: 'Demo Layer',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(prisma.remoteGISDataset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fields: undefined,
          extent: undefined,
        }),
      })
    );
  });

  it('returns 400 when import route body is missing required fields', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/v1/gis/remote-datasets/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ remoteDatasetId: 'remote-1' }),
    });

    const response = await importRemoteDataset(request);

    expect(response.status).toBe(400);
  });

  it('returns 404 when remote dataset does not exist in import route', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.remoteGISDataset.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/v1/gis/remote-datasets/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        remoteDatasetId: 'missing-remote',
        catalogName: 'Catalog A',
        datasetTypeId: 'dataset-type-1',
      }),
    });

    const response = await importRemoteDataset(request);

    expect(response.status).toBe(404);
  });

  it('returns 404 when dataset type does not exist in import route', async () => {
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId: 'user-1' },
      response: null,
    } as any);
    vi.mocked(prisma.remoteGISDataset.findUnique as any).mockResolvedValue({
      id: 'remote-1',
      serviceUrl: 'https://example.com/arcgis/rest/services/Demo/MapServer',
      layerId: 2,
      geometryType: 'Polygon',
      srid: 4326,
    });
    vi.mocked(prisma.datasetType.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/v1/gis/remote-datasets/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        remoteDatasetId: 'remote-1',
        catalogName: 'Catalog A',
        datasetTypeId: 'missing-dataset-type',
      }),
    });

    const response = await importRemoteDataset(request);

    expect(response.status).toBe(404);
  });
});
