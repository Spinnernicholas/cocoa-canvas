'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface JobStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  paused: number;
  cancelled: number;
}

export default function JobQueueStatus() {
  const router = useRouter();
  const [stats, setStats] = useState<JobStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJobStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/jobs?limit=1000', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Authentication failed - redirect to login
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            router.push('/login');
            return;
          }
          setError('Failed to fetch job stats');
          setLoading(false);
          return;
        }

        const data = await response.json();
        const jobs = data.jobs || [];

        const newStats = {
          total: jobs.length,
          pending: jobs.filter((j: any) => j.status === 'pending').length,
          processing: jobs.filter((j: any) => j.status === 'processing').length,
          completed: jobs.filter((j: any) => j.status === 'completed').length,
          failed: jobs.filter((j: any) => j.status === 'failed').length,
          paused: jobs.filter((j: any) => j.status === 'paused').length,
          cancelled: jobs.filter((j: any) => j.status === 'cancelled').length,
        };

        setStats(newStats);
      } catch (err) {
        console.error('Error fetching job stats:', err);
        setError('Error loading job statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchJobStats();
    const interval = setInterval(fetchJobStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border border-cocoa-200 dark:border-cocoa-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50">⚙️ Job Queue Status</h3>
        <Link
          href="/jobs"
          className="text-sm text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 font-medium"
        >
          View All →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-cocoa-600 dark:text-cocoa-300 mt-2 text-sm">Loading jobs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Total Jobs */}
          <div className="bg-cocoa-50 dark:bg-cocoa-900/50 rounded p-4">
            <p className="text-cocoa-600 dark:text-cocoa-300 text-xs font-medium uppercase">Total</p>
            <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mt-1">{stats.total}</p>
          </div>

          {/* Pending */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-4 border border-yellow-200 dark:border-yellow-800">
            <p className="text-yellow-700 dark:text-yellow-300 text-xs font-medium uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">{stats.pending}</p>
          </div>

          {/* Processing */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase">Processing</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{stats.processing}</p>
          </div>

          {/* Completed */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded p-4 border border-green-200 dark:border-green-800">
            <p className="text-green-700 dark:text-green-300 text-xs font-medium uppercase">Completed</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">{stats.completed}</p>
          </div>

          {/* Failed */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded p-4 border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 text-xs font-medium uppercase">Failed</p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-200 mt-1">{stats.failed}</p>
          </div>

          {/* Paused */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-4 border border-amber-200 dark:border-amber-800">
            <p className="text-amber-700 dark:text-amber-300 text-xs font-medium uppercase">Paused</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-1">{stats.paused}</p>
          </div>

          {/* Cancelled */}
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase">Cancelled</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-200 mt-1">{stats.cancelled}</p>
          </div>
        </div>
      )}
    </div>
  );
}
