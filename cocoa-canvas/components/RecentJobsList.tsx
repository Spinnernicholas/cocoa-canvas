'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Job {
  id: string;
  type: string;
  status: string;
  isDynamic?: boolean;
  progress: number;
  createdAt: string;
  processedItems?: number;
  totalItems?: number;
}

export default function RecentJobsList() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/jobs?limit=5', {
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
          setError('Failed to fetch jobs');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setJobs((data.jobs || []).slice(0, 5));
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Error loading jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🚫';
      default:
        return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'cancelled':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-cocoa-600 dark:text-cocoa-400';
    }
  };

  const getJobTypeEmoji = (type: string) => {
    switch (type.toLowerCase()) {
      case 'import':
        return '📥';
      case 'export':
        return '📤';
      case 'process':
        return '⚙️';
      case 'report':
        return '📊';
      default:
        return '📋';
    }
  };

  return (
    <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 overflow-hidden">
      <div className="p-6 border-b border-cocoa-200 dark:border-cocoa-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50">📋 Recent Jobs</h3>
          <Link
            href="/jobs"
            className="text-sm text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 font-medium"
          >
            View All →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center">
          <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-cocoa-600 dark:text-cocoa-300 mt-2 text-sm">Loading jobs...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-cocoa-600 dark:text-cocoa-300 text-sm">No jobs yet</p>
        </div>
      ) : (
        <div className="divide-y divide-cocoa-200 dark:divide-cocoa-700">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="p-4 hover:bg-cocoa-50 dark:hover:bg-cocoa-900/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg">{getJobTypeEmoji(job.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-cocoa-900 dark:text-cream-50 capitalize">
                      {job.type} Job
                    </p>
                    <p className="text-xs text-cocoa-500 dark:text-cocoa-400">
                      {formatDate(job.createdAt)} • {job.isDynamic ? 'Dynamic' : 'Static'}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                  {getStatusEmoji(job.status)} {job.status}
                </span>
              </div>

              {(job.status === 'processing' || job.status === 'pending') && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-cocoa-500 dark:text-cocoa-400">Progress</span>
                    <span className="text-xs text-cocoa-600 dark:text-cocoa-300 font-semibold">{job.progress}%</span>
                  </div>
                  <div className="w-full bg-cocoa-200 dark:bg-cocoa-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cinnamon-500 to-cinnamon-600 h-2 rounded-full transition-all"
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {(job.processedItems !== undefined && job.totalItems !== undefined) && (
                <p className="text-xs text-cocoa-600 dark:text-cocoa-300 mt-2">
                  {job.processedItems} / {job.totalItems} items processed
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
