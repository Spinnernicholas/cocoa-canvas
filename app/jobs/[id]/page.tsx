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
      case 'processing': return 'text-blue-700 dark:text-blue-300';
      case 'completed': return 'text-green-700 dark:text-green-300';
      case 'failed': return 'text-red-700 dark:text-red-300';
      default: return 'text-cocoa-700 dark:text-cocoa-300';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'completed': return 'bg-green-100 dark:bg-green-900/30';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30';
      default: return 'bg-cocoa-100 dark:bg-cocoa-900/30';
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
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.8s' }}>
        <Marshmallow size={50} animationDuration="3.8s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.5s', animationDelay: '1s' }}>
        <Marshmallow size={34} animationDuration="4.5s" />
      </div>
      <div className="hidden dark:block fixed top-[55%] left-[12%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.1s', animationDelay: '0.6s' }}>
        <Marshmallow size={54} animationDuration="4.1s" />
      </div>
      <div className="hidden dark:block fixed top-[15%] right-[15%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.7s', animationDelay: '1.4s' }}>
        <Marshmallow size={44} animationDuration="3.7s" />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.3s', animationDelay: '0.8s' }}>
        <Marshmallow size={52} animationDuration="4.3s" />
      </div>
      <div className="hidden dark:block fixed bottom-[25%] right-[12%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.9s', animationDelay: '1.7s' }}>
        <Marshmallow size={28} animationDuration="3.9s" />
      </div>
      <div className="hidden dark:block fixed bottom-[60%] right-[7%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.4s', animationDelay: '1.2s' }}>
        <Marshmallow size={60} animationDuration="4.4s" />
      </div>

      <Header userName={user?.name || 'User'} />
      
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <Link href="/jobs" className="text-cinnamon-600 dark:text-cinnamon-400 hover:underline">
            ← Back to Jobs
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-cocoa-600 dark:text-cocoa-400">Loading job details...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-4 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        ) : job ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50">
                    Job {job.id.substring(0, 8)}
                  </h1>
                  <p className="text-cocoa-600 dark:text-cocoa-400 text-sm mt-1">
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
              <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-cocoa-700 dark:text-cocoa-300">Progress</span>
                  <span className="text-sm font-semibold text-cocoa-900 dark:text-cream-50">{Math.round(job.progress)}%</span>
                </div>
                <div className="w-full bg-cocoa-200 dark:bg-cocoa-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-cocoa-600 to-cinnamon-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                {job.totalItems && (
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-400">
                    {job.processedItems || 0} of {job.totalItems} items processed
                  </p>
                )}
              </div>
            )}

            {/* Job Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700">
                <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Created</p>
                <p className="mt-2 text-sm text-cocoa-900 dark:text-cream-50">{formatDate(job.createdAt)}</p>
              </div>
              <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700">
                <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Duration</p>
                <p className="mt-2 text-sm text-cocoa-900 dark:text-cream-50">{calculateDuration(job.startedAt, job.completedAt)}</p>
              </div>
              {job.startedAt && (
                <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700">
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Started</p>
                  <p className="mt-2 text-sm text-cocoa-900 dark:text-cream-50">{formatDate(job.startedAt)}</p>
                </div>
              )}
              {job.completedAt && (
                <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700">
                  <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase tracking-wide">Completed</p>
                  <p className="mt-2 text-sm text-cocoa-900 dark:text-cream-50">{formatDate(job.completedAt)}</p>
                </div>
              )}
            </div>

            {/* Import Job Details */}
            {job.type === 'voter_import' && job.data && (
              <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6">
                <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Import Details</h3>
                <dl className="space-y-4">
                  {job.data.format && (
                    <div>
                      <dt className="text-sm font-medium text-cocoa-600 dark:text-cocoa-400">Format</dt>
                      <dd className="mt-1 text-sm text-cocoa-900 dark:text-cream-50">{job.data.format}</dd>
                    </div>
                  )}
                  {job.data.importType && (
                    <div>
                      <dt className="text-sm font-medium text-cocoa-600 dark:text-cocoa-400">Import Type</dt>
                      <dd className="mt-1 text-sm text-cocoa-900 dark:text-cream-50">{job.data.importType === 'full' ? 'Full Import' : 'Merge with Existing'}</dd>
                    </div>
                  )}
                  {job.totalItems && (
                    <div>
                      <dt className="text-sm font-medium text-cocoa-600 dark:text-cocoa-400">Total Items</dt>
                      <dd className="mt-1 text-sm text-cocoa-900 dark:text-cream-50">{job.totalItems}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Error Log */}
            {job.errorLog && job.errorLog.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">Errors ({job.errorLog.length})</h3>
                <ul className="space-y-3">
                  {job.errorLog.slice(0, 10).map((error: any, idx: number) => (
                    <li key={idx} className="text-sm text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-800/50 p-3 rounded">
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
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-100 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-2">✓ Job Completed Successfully</h3>
                {job.type === 'voter_import' && (
                  <p>Your voter import has been completed. The voters have been added to the system.</p>
                )}
              </div>
            )}

            {/* Failed Message */}
            {job.status === 'failed' && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-100 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-2">✗ Job Failed</h3>
                <p>The job encountered errors and could not be completed. Review the error log above for details.</p>
              </div>
            )}

            {/* Back to Jobs Button */}
            <div className="pt-6">
              <Link href="/jobs" className="inline-block px-6 py-2 bg-gradient-to-r from-cocoa-600 to-cinnamon-600 text-white rounded-lg hover:from-cocoa-700 hover:to-cinnamon-700 font-medium transition-colors shadow-sm">
                Back to Job Queue
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-cocoa-600 dark:text-cocoa-400">Job not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
