import { NextRequest } from 'next/server';
import { POST as createVoter, GET as listVoters } from '@/app/api/v1/voters/route';
import { GET as getVoter, PUT as updateVoter, DELETE as deleteVoter } from '@/app/api/v1/voters/[id]/route';
import { POST as logContact } from '@/app/api/v1/voters/[id]/contact-log/route';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth/jwt';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
    voter: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contactLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    campaignVoter: {
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('Voter API Endpoints (Integration)', () => {
  let validToken: string;
  let userId = 'test-user-123';

  beforeAll(async () => {
    validToken = await generateToken({
      userId,
      email: 'test@example.com',
      role: 'admin',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      role: 'admin',
    });
    (prisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-123',
      userId,
      token: validToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  describe('POST /api/v1/voters', () => {
    it('should create a new voter with valid data', async () => {
      const newVoter = {
        id: 'voter-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        notes: null,
        contactStatus: 'pending',
        registrationDate: new Date(),
        lastContactDate: null,
        lastContactMethod: null,
        votingPreference: null,
        importedFrom: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.voter.create as jest.Mock).mockResolvedValue(newVoter);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address: '123 Main St',
        }),
      });

      const response = await createVoter(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('John Doe');
      expect(data.email).toBe('john@example.com');
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await createVoter(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should return 401 if not authenticated', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John Doe' }),
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
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          address: '123 Main St',
          contactStatus: 'pending',
          lastContactDate: null,
          lastContactMethod: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: null,
          registrationDate: null,
          votingPreference: null,
          importedFrom: null,
          contactLogs: [],
        },
      ];

      (prisma.voter.findMany as jest.Mock).mockResolvedValue(voters);
      (prisma.voter.count as jest.Mock).mockResolvedValue(1);

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
          name: 'John Doe',
          email: 'john@example.com',
          phone: null,
          address: null,
          contactStatus: 'pending',
          lastContactDate: null,
          lastContactMethod: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: null,
          registrationDate: null,
          votingPreference: null,
          importedFrom: null,
          contactLogs: [],
        },
      ];

      (prisma.voter.findMany as jest.Mock).mockResolvedValue(voters);
      (prisma.voter.count as jest.Mock).mockResolvedValue(1);

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
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        notes: 'Notes here',
        contactStatus: 'pending',
        lastContactDate: null,
        lastContactMethod: null,
        registrationDate: new Date(),
        votingPreference: null,
        importedFrom: null,
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

      (prisma.voter.findUnique as jest.Mock).mockResolvedValue(voter);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1'), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${validToken}` },
      });

      const response = await getVoter(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('John Doe');
      expect(data.contactLogs).toHaveLength(1);
    });

    it('should return 404 if voter not found', async () => {
      (prisma.voter.findUnique as jest.Mock).mockResolvedValue(null);

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
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-5678',
        address: '456 Oak St',
        notes: 'Updated notes',
        contactStatus: 'contacted',
        lastContactDate: null,
        lastContactMethod: null,
        registrationDate: new Date(),
        votingPreference: null,
        importedFrom: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contactLogs: [],
      };

      (prisma.voter.findUnique as jest.Mock).mockResolvedValue(updatedVoter);
      (prisma.voter.update as jest.Mock).mockResolvedValue(updatedVoter);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1'), {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-5678',
          address: '456 Oak St',
          notes: 'Updated notes',
          contactStatus: 'contacted',
        }),
      });

      const response = await updateVoter(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Jane Doe');
    });
  });

  describe('DELETE /api/v1/voters/[id]', () => {
    it('should delete a voter and related records', async () => {
      const voter = {
        id: 'voter-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        notes: null,
        contactStatus: 'pending',
        lastContactDate: null,
        lastContactMethod: null,
        registrationDate: new Date(),
        votingPreference: null,
        importedFrom: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.voter.findUnique as jest.Mock).mockResolvedValue(voter);
      (prisma.contactLog.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.campaignVoter.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.voter.delete as jest.Mock).mockResolvedValue(voter);

      const request = new NextRequest(new URL('http://localhost:3000/api/v1/voters/voter-1'), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${validToken}` },
      });

      const response = await deleteVoter(request, { params: Promise.resolve({ id: 'voter-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.contactLog.deleteMany).toHaveBeenCalled();
      expect(prisma.campaignVoter.deleteMany).toHaveBeenCalled();
      expect(prisma.voter.delete).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/voters/[id]/contact-log', () => {
    it('should create a new contact log', async () => {
      const voter = {
        id: 'voter-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        notes: null,
        contactStatus: 'pending',
        lastContactDate: null,
        lastContactMethod: null,
        registrationDate: new Date(),
        votingPreference: null,
        importedFrom: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const contactLog = {
        id: 'log-1',
        voterId: 'voter-1',
        contactType: 'call',
        outcome: 'contacted',
        notes: 'Had a good conversation',
        followUpNeeded: true,
        followUpDate: new Date('2025-02-20'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.voter.findUnique as jest.Mock).mockResolvedValue(voter);
      (prisma.contactLog.create as jest.Mock).mockResolvedValue(contactLog);
      (prisma.voter.update as jest.Mock).mockResolvedValue({ ...voter, lastContactDate: new Date() });

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
      expect(data.contactType).toBe('call');
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
      expect(data.error).toBe('Contact type is required');
    });
  });
});
