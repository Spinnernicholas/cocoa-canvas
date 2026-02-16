'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  totalItems?: number;
  processedItems?: number;
  data?: any;
  errorLog?: any[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load user
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');

    if (!userStr || !token) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userStr));
  }, [router]);

  // Load job details
  useEffect(() => {
    if (!user || !jobId) return;

    const fetchJob = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/v1/jobs/${jobId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (response.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }

        if (!response.ok) {
          setError('Failed to load job details');
          return;
        }

        const data = await response.json();
        if (data.success && data.job) {
          setJob(data.job);
          setLoading(false);
        } else {
          setError('Job not found');
          setLoading(false);
        }

        // Stop auto-refresh if job is completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          setAutoRefresh(false);
        }
      } catch (err) {
        console.error('Error loading job:', err);
        setError('Failed to load job details');
        setLoading(false);
      }
    };

    fetchJob();

    // Auto-refresh every 2 seconds if still processing
    if (autoRefresh && job?.status === 'processing') {
      const interval = setInterval(fetchJob, 2000);
      return () => clearInterval(interval);
    }
  }, [user, jobId, autoRefresh, router, job?.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'text-blue-600 dark:text-blue-400';
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-blue-100 dark:bg-blue-900';
      case 'completed': return 'bg-green-100 dark:bg-green-900';
      case 'failed': return 'bg-red-100 dark:bg-red-900';
      default: return 'bg-gray-100 dark:bg-gray-900';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start) return '-';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : new Date().getTime();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.round(duration / 60)}m`;
    return `${Math.round(duration / 3600)}h`;
  };

  if (!user) {
    return <Marshmallow />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header userName={user?.name || 'User'} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/jobs" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Jobs
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading job details...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        ) : job ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Job {job.id.substring(0, 8)}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {job.type === 'voter_import' ? 'Voter Import' : job.type}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold ${getStatusBgColor(job.status)} ${getStatusColor(job.status)}`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {job.status === 'processing' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{Math.round(job.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                {job.totalItems && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {job.processedItems || 0} of {job.totalItems} items processed
                  </p>
                )}
              </div>
            )}

            {/* Job Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Created</p>
                <p className="mt-2 text-sm text-gray-900 dark:text-white">{formatDate(job.createdAt)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Duration</p>
                <p className="mt-2 text-sm text-gray-900 dark:text-white">{calculateDuration(job.startedAt, job.completedAt)}</p>
              </div>
              {job.startedAt && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Started</p>
                  <p className="mt-2 text-sm text-gray-900 dark:text-white">{formatDate(job.startedAt)}</p>
                </div>
              )}
              {job.completedAt && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Completed</p>
                  <p className="mt-2 text-sm text-gray-900 dark:text-white">{formatDate(job.completedAt)}</p>
                </div>
              )}
            </div>

            {/* Import Job Details */}
            {job.type === 'voter_import' && job.data && (
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import Details</h3>
                <dl className="space-y-4">
                  {job.data.format && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Format</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.data.format}</dd>
                    </div>
                  )}
                  {job.data.importType && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Import Type</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.data.importType === 'full' ? 'Full Import' : 'Merge with Existing'}</dd>
                    </div>
                  )}
                  {job.totalItems && (
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{job.totalItems}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Error Log */}
            {job.errorLog && job.errorLog.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">Errors ({job.errorLog.length})</h3>
                <ul className="space-y-3">
                  {job.errorLog.slice(0, 10).map((error: any, idx: number) => (
                    <li key={idx} className="text-sm text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-800 p-3 rounded">
                      <p className="font-monospace break-words">{error.message || error}</p>
                      {error.row && <p className="text-xs mt-1 opacity-75">Row {error.row}</p>}
                    </li>
                  ))}
                  {job.errorLog.length > 10 && (
                    <p className="text-sm text-red-700 dark:text-red-300 italic">
                      ... and {job.errorLog.length - 10} more errors
                    </p>
                  )}
                </ul>
              </div>
            )}

            {/* Success Message */}
            {job.status === 'completed' && (
              <div className="bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">✓ Job Completed Successfully</h3>
                {job.type === 'voter_import' && (
                  <p>Your voter import has been completed. The voters have been added to the system.</p>
                )}
              </div>
            )}

            {/* Failed Message */}
            {job.status === 'failed' && (
              <div className="bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">✗ Job Failed</h3>
                <p>The job encountered errors and could not be completed. Review the error log above for details.</p>
              </div>
            )}

            {/* Back to Jobs Button */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link href="/jobs" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Back to Job Queue
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Job not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
