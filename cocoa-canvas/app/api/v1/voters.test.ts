import type { Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createVoter, GET as listVoters } from '@/app/api/v1/voters/route';
import { GET as getVoter, PUT as updateVoter, DELETE as deleteVoter } from '@/app/api/v1/voters/[id]/route';
import { POST as logContact } from '@/app/api/v1/voters/[id]/contact-log/route';
import { prisma } from '@/lib/prisma';
import { validateProtectedRoute } from '@/lib/middleware/auth';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
    person: {
      create: vi.fn(),
      update: vi.fn(),
    },
    voter: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contactLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/middleware/auth');

describe('Voter API Endpoints (Integration)', () => {
  let validToken: string;
  let userId = 'test-user-123';

  beforeAll(async () => {
    validToken = 'fake-token';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateProtectedRoute).mockResolvedValue({
      isValid: true,
      user: { userId, email: 'test@example.com', role: 'admin' },
      response: null,
    });
  });

  describe('POST /api/v1/voters', () => {
    it('should create a new voter with valid data', async () => {
      const person = {
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        middleName: null,
        notes: null,
      };
      const newVoter = {
        id: 'voter-1',
        registrationDate: new Date(),
        personId: person.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        person,
      };

      (prisma.person.create as Mock).mockResolvedValue(person);
      (prisma.voter.create as Mock).mockResolvedValue(newVoter);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
        }),
      });

      const response = await createVoter(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.person.firstName).toBe('John');
      expect(data.person.lastName).toBe('Doe');
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'John' }),
      });

      const response = await createVoter(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('First name and last name are required');
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(validateProtectedRoute).mockResolvedValue({
        isValid: false,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      });

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'John', lastName: 'Doe' }),
      });

      const response = await createVoter(request);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/voters', () => {
    it('should list voters with pagination', async () => {
      const voters = [
        {
          id: 'voter-1',
          person: {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          registrationDate: null,
        },
      ];

      (prisma.voter.findMany as Mock).mockResolvedValue(voters);
      (prisma.voter.count as Mock).mockResolvedValue(1);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/v1/voters?limit=20&offset=0'),
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${validToken}` },
        }
      );

      const response = await listVoters(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.voters).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should search voters by name', async () => {
      const voters = [
        {
          id: 'voter-1',
          person: {
            id: 'person-1',
            firstName: 'John',
            lastName: 'Doe',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          registrationDate: null,
        },
      ];

      (prisma.voter.findMany as Mock).mockResolvedValue(voters);
      (prisma.voter.count as Mock).mockResolvedValue(1);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/v1/voters?search=John&limit=20&offset=0'),
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${validToken}` },
        }
      );

      const response = await listVoters(request);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/voters/[id]', () => {
    it('should retrieve a single voter with contact logs', async () => {
      const voter = {
        id: 'voter-1',
        person: {
          id: 'person-1',
          firstName: 'John',
          lastName: 'Doe',
          notes: 'Notes here',
        },
        registrationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        contactLogs: [
          {
            id: 'log-1',
            voterId: 'voter-1',
            contactType: 'call',
            outcome: 'contacted',
            notes: 'Spoke with John',
            followUpNeeded: false,
            followUpDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      (prisma.voter.findUnique as Mock).mockResolvedValue(voter);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1'), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validToken}` },
      });

      const response = await getVoter(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.person.firstName).toBe('John');
      expect(data.contactLogs).toHaveLength(1);
    });

    it('should return 404 if voter not found', async () => {
      (prisma.voter.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/nonexistent'), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validToken}` },
      });

      const response = await getVoter(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/voters/[id]', () => {
    it('should update voter details', async () => {
      const updatedVoter = {
        id: 'voter-1',
        person: {
          id: 'person-1',
          firstName: 'Jane',
          lastName: 'Doe',
          notes: 'Updated notes',
        },
        registrationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingVoter = {
        id: 'voter-1',
        personId: 'person-1',
        person: {
          id: 'person-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      (prisma.voter.findUnique as Mock)
        .mockResolvedValueOnce(existingVoter)
        .mockResolvedValueOnce(updatedVoter);
      (prisma.person.update as Mock).mockResolvedValue(updatedVoter.person);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1'), {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          notes: 'Updated notes',
        }),
      });

      const response = await updateVoter(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.person.firstName).toBe('Jane');
    });
  });

  describe('DELETE /api/v1/voters/[id]', () => {
    it('should delete a voter and related records', async () => {
      const voter = {
        id: 'voter-1',
        registrationDate: new Date(),
        personId: 'person-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.voter.findUnique as Mock).mockResolvedValue({ personId: voter.personId });
      (prisma.contactLog.deleteMany as Mock).mockResolvedValue({ count: 0 });
      (prisma.voter.delete as Mock).mockResolvedValue(voter);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1'), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${validToken}` },
      });

      const response = await deleteVoter(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.contactLog.deleteMany).toHaveBeenCalled();
      expect(prisma.voter.delete).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/voters/[id]/contact-log', () => {
    it('should create a new contact log', async () => {
      const voter = {
        id: 'voter-1',
        registrationDate: new Date(),
        personId: 'person-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const contactLog = {
        id: 'log-1',
        voterId: 'voter-1',
        method: 'call',
        outcome: 'contacted',
        notes: 'Had a good conversation',
        followUpNeeded: true,
        followUpDate: new Date('2025-02-20'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.voter.findUnique as Mock).mockResolvedValue({ person: { id: 'person-1' }, personId: 'person-1' });
      (prisma.contactLog.create as Mock).mockResolvedValue(contactLog);
      (prisma.voter.update as Mock).mockResolvedValue({ ...voter, lastContactDate: new Date() });

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1/contact-log'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactType: 'call',
          outcome: 'contacted',
          notes: 'Had a good conversation',
          followUpNeeded: true,
          followUpDate: '2025-02-20',
        }),
      });

      const response = await logContact(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.method).toBe('call');
      expect(data.outcome).toBe('contacted');
    });

    it('should return 400 if contact type is missing', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1/contact-log'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'contacted' }),
      });

      const response = await logContact(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Contact method is required');
    });
  });
});
