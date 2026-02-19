'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';
import { formatOutputStats, getProgressFromStats } from '@/lib/queue/types';

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  totalItems?: number;
  processedItems?: number;
  outputStats?: any;
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

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');

      const params = new URLSearchParams({
        limit: (limit * 10).toString(),
        offset: '0',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/v1/jobs?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }
        setError('Failed to load jobs');
        return;
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Error loading jobs');
    } finally {
      setLoading(false);
    }
  }, [limit, router, statusFilter, typeFilter]);

  // Load user
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');

    if (!userStr || !token) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  // Fetch jobs
  useEffect(() => {
    if (!user) return;

    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [user, fetchJobs]);

  const handleJobControl = async (
    event: React.MouseEvent,
    jobId: string,
    action: 'pause' | 'resume' | 'cancel'
  ) => {
    event.stopPropagation();

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/jobs/${jobId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to ${action} job`);
      }

      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'paused':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-cocoa-100 dark:bg-cocoa-900/30 text-cocoa-800 dark:text-cocoa-300';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⚙️';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      case 'paused': return '⏸️';
      case 'cancelled': return '🚫';
      default: return '📊';
    }
  };

  const getTypeEmoji = (type: string) => {
    if (type.includes('import')) return '📥';
    if (type.includes('export')) return '📤';
    if (type.includes('process')) return '⚙️';
    if (type.includes('report')) return '📊';
    return '📋';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (startDate?: string, endDate?: string) => {
    if (!startDate) return '—';
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const diffMs = end - start;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    if (diffMins > 0) return `${diffMins}m ${diffSecs % 60}s`;
    return `${diffSecs}s`;
  };

  const uniqueTypes = Array.from(new Set(jobs.map(j => j.type)));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40">
        <Marshmallow size={40} animationDuration="3.8s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40">
        <Marshmallow size={42} animationDuration="4.5s" animationDelay="1s" />
      </div>
      <div className="hidden dark:block fixed top-[55%] left-[12%] opacity-40">
        <Marshmallow size={43} animationDuration="4.1s" animationDelay="0.6s" />
      </div>
      <div className="hidden dark:block fixed top-[15%] right-[15%] opacity-40">
        <Marshmallow size={44} animationDuration="3.7s" animationDelay="1.4s" />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40">
        <Marshmallow size={45} animationDuration="4.3s" animationDelay="0.8s" />
      </div>
      <div className="hidden dark:block fixed bottom-[25%] right-[12%] opacity-40">
        <Marshmallow size={41} animationDuration="3.9s" animationDelay="1.7s" />
      </div>
      <div className="hidden dark:block fixed bottom-[60%] right-[7%] opacity-40">
        <Marshmallow size={42} animationDuration="4.4s" animationDelay="1.2s" />
      </div>

      <Header userName={user.name} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50">⚙️ Job Queue</h1>
              <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">
                Monitor and manage background jobs
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/jobs/run"
                className="px-4 py-2 bg-cinnamon-500 hover:bg-cinnamon-600 text-cream-50 rounded-lg font-medium transition-colors"
              >
                + Run Job
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Total Jobs</p>
                <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{jobs.length}</p>
              </div>
              <span className="text-3xl">📊</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Processing</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {jobs.filter(j => j.status === 'processing').length}
                </p>
              </div>
              <span className="text-3xl">⚙️</span>
            </div>
          </div>

          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {jobs.filter(j => j.status === 'pending').length}
                </p>
              </div>
              <span className="text-3xl">⏳</span>
            </div>
          </div>

          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {jobs.filter(j => j.status === 'failed').length}
                </p>
              </div>
              <span className="text-3xl">❌</span>
            </div>
          </div>

          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Paused</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {jobs.filter(j => j.status === 'paused').length}
                </p>
              </div>
              <span className="text-3xl">⏸️</span>
            </div>
          </div>

          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Cancelled</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                  {jobs.filter(j => j.status === 'cancelled').length}
                </p>
              </div>
              <span className="text-3xl">🚫</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 mb-6 border border-cocoa-200 dark:border-cocoa-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg text-cocoa-700 dark:text-cocoa-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 font-medium transition-colors"
            >
              🔄 Clear Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Jobs Table */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-cocoa-600 dark:text-cocoa-300 text-lg">No jobs found</p>
              <p className="text-cocoa-500 dark:text-cocoa-400 text-sm mt-1">
                {statusFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting filters' : 'Jobs will appear here when created'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cocoa-200 dark:border-cocoa-700 bg-cocoa-50 dark:bg-cocoa-900/50">
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Type</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Progress</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Output</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Created</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Duration</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Created By</th>
                    <th className="px-6 py-3 text-left font-semibold text-cocoa-900 dark:text-cream-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cocoa-200 dark:divide-cocoa-700">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-cocoa-50 dark:hover:bg-cocoa-900/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTypeEmoji(job.type)}</span>
                          <span className="font-medium text-cocoa-900 dark:text-cream-50">{job.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(job.status)}`}>
                          {getStatusEmoji(job.status)} {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(job.status === 'processing' || job.status === 'pending') ? (
                          <div className="w-32">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-cocoa-600 dark:text-cocoa-300 font-semibold">{job.progress}%</span>
                            </div>
                            <div className="w-full bg-cocoa-200 dark:bg-cocoa-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-cinnamon-500 to-cinnamon-600 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-cocoa-700 dark:text-cocoa-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-cocoa-600 dark:text-cocoa-400 max-w-sm">
                          {job.outputStats ? (
                            (() => {
                              const stats = typeof job.outputStats === 'string' 
                                ? JSON.parse(job.outputStats) 
                                : job.outputStats;
                              return formatOutputStats(stats);
                            })()
                          ) : (
                            <span className="text-cocoa-500 dark:text-cocoa-500">No statistics</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">
                        {formatDuration(job.startedAt, job.completedAt)}
                      </td>
                      <td className="px-6 py-4 text-cocoa-700 dark:text-cocoa-300">
                        {job.createdBy?.name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {(job.status === 'pending' || job.status === 'processing') && (
                            <button
                              onClick={(e) => handleJobControl(e, job.id, 'pause')}
                              className="px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                            >
                              Pause
                            </button>
                          )}
                          {job.status === 'paused' && (
                            <button
                              onClick={(e) => handleJobControl(e, job.id, 'resume')}
                              className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                            >
                              Resume
                            </button>
                          )}
                          {(job.status === 'pending' || job.status === 'processing' || job.status === 'paused') && (
                            <button
                              onClick={(e) => handleJobControl(e, job.id, 'cancel')}
                              className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
