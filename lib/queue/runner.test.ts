import {
  createJob,
  getJob,
  getJobs,
  startJob,
  updateJobProgress,
  addJobError,
  completeJob,
  failJob,
  cancelJob,
  getJobProgress,
  parseJobData,
  parseJobErrors,
} from '@/lib/queue/runner';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('Job Queue System', () => {
  const mockUserId = 'user123';
  const mockJobId = 'job456';
  const mockJob = {
    id: mockJobId,
    type: 'import_voters',
    status: 'pending',
    totalItems: 0,
    processedItems: 0,
    errorLog: null,
    data: JSON.stringify({ filePath: 'test.csv' }),
    createdById: mockUserId,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    createdBy: {
      id: mockUserId,
      email: 'user@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new job', async () => {
      (prisma.job.create as jest.Mock).mockResolvedValue(mockJob);

      const job = await createJob('import_voters', mockUserId, { filePath: 'test.csv' });

      expect(job).toBeDefined();
      expect(job?.type).toBe('import_voters');
      expect(job?.status).toBe('pending');
      expect(prisma.job.create).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      (prisma.job.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const job = await createJob('import_voters', mockUserId);

      expect(job).toBeNull();
    });

    it('should create job with custom data', async () => {
      const jobWithData = { ...mockJob, data: JSON.stringify({ filePath: 'voters.csv', type: 'import' }) };
      (prisma.job.create as jest.Mock).mockResolvedValue(jobWithData);

      const job = await createJob('import_voters', mockUserId, { filePath: 'voters.csv', type: 'import' });

      expect(job?.data).toBeDefined();
      expect(prisma.job.create).toHaveBeenCalled();
    });
  });

  describe('getJob', () => {
    it('should retrieve a job by ID', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);

      const job = await getJob(mockJobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(mockJobId);
      expect(prisma.job.findUnique).toHaveBeenCalledWith({
        where: { id: mockJobId },
        include: { createdBy: { select: { id: true, email: true, name: true } } },
      });
    });

    it('should return null for non-existent job', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      const job = await getJob('nonexistent');

      expect(job).toBeNull();
    });

    it('should handle lookup errors', async () => {
      (prisma.job.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const job = await getJob(mockJobId);

      expect(job).toBeNull();
    });
  });

  describe('getJobs', () => {
    it('should retrieve jobs list', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([mockJob]);

      const jobs = await getJobs();

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(prisma.job.findMany).toHaveBeenCalled();
    });

    it('should filter jobs by status', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

      await getJobs({ status: 'pending' });

      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        })
      );
    });

    it('should filter jobs by type', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

      await getJobs({ type: 'import_voters' });

      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'import_voters' }),
        })
      );
    });

    it('should handle retrieval errors', async () => {
      (prisma.job.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      const jobs = await getJobs();

      expect(jobs).toEqual([]);
    });
  });

  describe('startJob', () => {
    it('should update job status to processing', async () => {
      const processingJob = { ...mockJob, status: 'processing', startedAt: new Date() };
      (prisma.job.update as jest.Mock).mockResolvedValue(processingJob);

      const job = await startJob(mockJobId);

      expect(job?.status).toBe('processing');
      expect(job?.startedAt).toBeDefined();
      expect(prisma.job.update).toHaveBeenCalled();
    });
  });

  describe('updateJobProgress', () => {
    it('should update processed items', async () => {
      const progressJob = { ...mockJob, processedItems: 50 };
      (prisma.job.update as jest.Mock).mockResolvedValue(progressJob);

      const job = await updateJobProgress(mockJobId, 50);

      expect(job?.processedItems).toBe(50);
      expect(prisma.job.update).toHaveBeenCalled();
    });

    it('should update total items if provided', async () => {
      const progressJob = { ...mockJob, processedItems: 50, totalItems: 100 };
      (prisma.job.update as jest.Mock).mockResolvedValue(progressJob);

      const job = await updateJobProgress(mockJobId, 50, 100);

      expect(job?.totalItems).toBe(100);
    });
  });

  describe('completeJob', () => {
    it('should mark job as completed', async () => {
      const completedJob = { ...mockJob, status: 'completed', completedAt: new Date() };
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.job.update as jest.Mock).mockResolvedValue(completedJob);

      const job = await completeJob(mockJobId);

      expect(job?.status).toBe('completed');
      expect(job?.completedAt).toBeDefined();
    });
  });

  describe('failJob', () => {
    it('should mark job as failed', async () => {
      const failedJob = { 
        ...mockJob, 
        status: 'failed', 
        completedAt: new Date(),
        errorLog: JSON.stringify([{ timestamp: new Date().toISOString(), message: 'Job failed' }])
      };
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.job.update as jest.Mock).mockResolvedValue(failedJob);

      const job = await failJob(mockJobId, 'Job failed');

      expect(job?.status).toBe('failed');
    });
  });

  describe('cancelJob', () => {
    it('should cancel a pending job', async () => {
      const cancelledJob = { ...mockJob, status: 'failed', completedAt: new Date() };
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.job.update as jest.Mock).mockResolvedValue(cancelledJob);

      const job = await cancelJob(mockJobId);

      expect(job?.status).toBe('failed');
      expect(prisma.job.update).toHaveBeenCalled();
    });

    it('should not cancel processing job', async () => {
      const processingJob = { ...mockJob, status: 'processing' };
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(processingJob);

      const job = await cancelJob(mockJobId);

      expect(job?.status).toBe('processing');
      expect(prisma.job.update).not.toHaveBeenCalled();
    });
  });

  describe('getJobProgress', () => {
    it('should return 0 for no items', () => {
      const progress = getJobProgress({ status: 'processing', totalItems: 0, processedItems: 0 });
      expect(progress).toBe(0);
    });

    it('should calculate correct percentage', () => {
      const progress = getJobProgress({ status: 'processing', totalItems: 100, processedItems: 25 });
      expect(progress).toBe(25);
    });

    it('should return 100 for completed job', () => {
      const progress = getJobProgress({ status: 'completed', totalItems: 100, processedItems: 100 });
      expect(progress).toBe(100);
    });

    it('should return 100 for failed job', () => {
      const progress = getJobProgress({ status: 'failed', totalItems: 100, processedItems: 50 });
      expect(progress).toBe(100);
    });

    it('should cap at 99% until completion', () => {
      const progress = getJobProgress({ status: 'processing', totalItems: 100, processedItems: 99 });
      expect(progress).toBeLessThanOrEqual(99);
    });
  });

  describe('parseJobData', () => {
    it('should parse valid JSON data', () => {
      const data = parseJobData(JSON.stringify({ filePath: 'test.csv' }));
      expect(data).toEqual({ filePath: 'test.csv' });
    });

    it('should return empty object for null', () => {
      const data = parseJobData(null);
      expect(data).toEqual({});
    });

    it('should return empty object for invalid JSON', () => {
      const data = parseJobData('invalid json');
      expect(data).toEqual({});
    });
  });

  describe('parseJobErrors', () => {
    it('should parse error log', () => {
      const errors = parseJobErrors(JSON.stringify([{ message: 'Test error' }]));
      expect(Array.isArray(errors)).toBe(true);
      expect(errors[0].message).toBe('Test error');
    });

    it('should return empty array for null', () => {
      const errors = parseJobErrors(null);
      expect(errors).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      const errors = parseJobErrors('invalid json');
      expect(errors).toEqual([]);
    });
  });
});
