'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

interface JobsConfig {
  maxWorkers: number;
  importWorkers: number;
  geocodeWorkers: number;
  scheduledWorkers: number;
}

interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface RedisStatusData {
  redis: {
    connected: boolean;
    pingResponse: string | null;
    clientStatus: string;
  };
  bullmq: {
    healthy: boolean;
    activeWorkers: number;
  };
  workers: {
    activeWorkers: number;
    workerNames: string[];
    pool?: {
      maxWorkers: number;
      activeWorkers: number;
      waitingJobs: number;
      maxByType: {
        import: number;
        geocode: number;
        scheduled: number;
      };
      activeByType: {
        import: number;
        geocode: number;
        scheduled: number;
      };
    } | null;
  };
  queues: {
    voterImport: QueueCounts;
    geocode: QueueCounts;
    scheduled: QueueCounts;
  };
  timestamp: string;
}

const DEFAULT_CONFIG: JobsConfig = {
  maxWorkers: 5,
  importWorkers: 1,
  geocodeWorkers: 1,
  scheduledWorkers: 3,
};

export default function AdminJobsConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [loadingRedisStatus, setLoadingRedisStatus] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<JobsConfig>(DEFAULT_CONFIG);
  const [redisStatus, setRedisStatus] = useState<RedisStatusData | null>(null);

  const fetchRedisStatus = async (silent = false) => {
    try {
      if (!silent) {
        setLoadingRedisStatus(true);
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/jobs/redis-status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load Redis status');
        return;
      }

      const data = await response.json();
      setRedisStatus(data);
    } catch (err) {
      console.error('Failed to fetch Redis status', err);
      setError('Failed to load Redis status');
    } finally {
      if (!silent) {
        setLoadingRedisStatus(false);
      }
    }
  };

  const formatTimestamp = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');

    if (!userStr || !token) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userStr));
    } catch {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/admin/jobs-config', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            router.push('/login');
            return;
          }

          setError('Failed to load jobs configuration');
          return;
        }

        const data = await response.json();
        setConfig(data.config || DEFAULT_CONFIG);
      } catch (err) {
        console.error('Failed to fetch jobs config', err);
        setError('Failed to load jobs configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    fetchRedisStatus(true);
  }, [router, user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/jobs-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save jobs configuration');
        return;
      }

      const data = await response.json();
      setConfig(data.config || DEFAULT_CONFIG);
      setSuccess('Jobs configuration saved successfully. Restart the app to apply new worker counts.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to save jobs config', err);
      setError('Failed to save jobs configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateWorkerCount = (key: keyof JobsConfig, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const normalized = Math.max(1, Math.min(10, Math.floor(parsed)));
    setConfig((prev) => ({ ...prev, [key]: normalized }));
  };

  const handleRecoverJobs = async () => {
    try {
      setRecovering(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/admin/jobs/recovery', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to run job recovery');
        return;
      }

      const data = await response.json();
      const summary = data.summary || {};
      setSuccess(
        `Recovery complete: scanned ${summary.scanned || 0}, pending requeued ${summary.pendingRequeued || 0}, processing recovered ${summary.processingRecovered || 0}, failed ${summary.failed || 0}, skipped ${summary.skipped || 0}.`
      );
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      console.error('Failed to run job recovery', err);
      setError('Failed to run job recovery');
    } finally {
      setRecovering(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
      <Header userName={user.name || user.email} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/admin" className="text-cinnamon-600 dark:text-cinnamon-400 hover:underline text-sm mb-4 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">⚙️ Jobs Configuration</h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">
            Configure background job processing limits for imports, geocoding, and scheduled tasks.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-800 dark:text-green-300 rounded-lg">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-cocoa-600 dark:text-cocoa-300">Loading jobs configuration...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Worker Limits</h2>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300 mb-4">
                  Configure the global worker pool size and max workers per job type.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-cocoa-200 dark:border-cocoa-600 rounded-lg overflow-hidden">
                    <thead className="bg-cocoa-50 dark:bg-cocoa-700/40">
                      <tr>
                        <th className="text-left px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Setting</th>
                        <th className="text-left px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Description</th>
                        <th className="text-right px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Max Workers</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-cocoa-200 dark:border-cocoa-600">
                        <td className="px-3 py-2 text-cocoa-900 dark:text-cream-50">Global Pool</td>
                        <td className="px-3 py-2 text-cocoa-600 dark:text-cocoa-300">Total workers available across all job types.</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={config.maxWorkers}
                            onChange={(e) => updateWorkerCount('maxWorkers', e.target.value)}
                            className="w-24 px-2 py-1 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 text-right"
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-cocoa-200 dark:border-cocoa-600">
                        <td className="px-3 py-2 text-cocoa-900 dark:text-cream-50">Import</td>
                        <td className="px-3 py-2 text-cocoa-600 dark:text-cocoa-300">Voter import jobs.</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={config.importWorkers}
                            onChange={(e) => updateWorkerCount('importWorkers', e.target.value)}
                            className="w-24 px-2 py-1 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 text-right"
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-cocoa-200 dark:border-cocoa-600">
                        <td className="px-3 py-2 text-cocoa-900 dark:text-cream-50">Geocoding</td>
                        <td className="px-3 py-2 text-cocoa-600 dark:text-cocoa-300">Household geocoding jobs.</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={config.geocodeWorkers}
                            onChange={(e) => updateWorkerCount('geocodeWorkers', e.target.value)}
                            className="w-24 px-2 py-1 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 text-right"
                          />
                        </td>
                      </tr>
                      <tr className="border-t border-cocoa-200 dark:border-cocoa-600">
                        <td className="px-3 py-2 text-cocoa-900 dark:text-cream-50">Scheduled</td>
                        <td className="px-3 py-2 text-cocoa-600 dark:text-cocoa-300">Scheduled and maintenance jobs.</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={config.scheduledWorkers}
                            onChange={(e) => updateWorkerCount('scheduledWorkers', e.target.value)}
                            className="w-24 px-2 py-1 border border-cocoa-300 dark:border-cocoa-600 rounded bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 text-right"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-5 py-2 rounded-lg font-medium text-white ${
                    saving
                      ? 'bg-cocoa-400 cursor-not-allowed'
                      : 'bg-cinnamon-600 hover:bg-cinnamon-700'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700">
              <h2 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Maintenance</h2>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300 mb-4">
                Run manual recovery to requeue pending jobs and recover interrupted processing jobs.
              </p>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRecoverJobs}
                  disabled={recovering}
                  className={`px-5 py-2 rounded-lg font-medium text-white ${
                    recovering
                      ? 'bg-cocoa-400 cursor-not-allowed'
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {recovering ? 'Recovering...' : 'Recover Jobs'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50">Jobs System Status</h2>
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-300">View Redis connection and BullMQ health, plus queue depth by type.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchRedisStatus(false)}
                  disabled={loadingRedisStatus}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    loadingRedisStatus
                      ? 'bg-cocoa-400 cursor-not-allowed'
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {loadingRedisStatus ? 'Refreshing...' : 'Refresh Status'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-cocoa-50 dark:bg-cocoa-700/40">
                  <p className="text-cocoa-600 dark:text-cocoa-300">Redis Connection</p>
                  <p className={`font-semibold ${redisStatus?.redis.connected ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {redisStatus ? (redisStatus.redis.connected ? 'Yes' : 'No') : '—'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-cocoa-50 dark:bg-cocoa-700/40">
                  <p className="text-cocoa-600 dark:text-cocoa-300">BullMQ Status</p>
                  <p className={`font-semibold ${redisStatus?.bullmq.healthy ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {redisStatus ? (redisStatus.bullmq.healthy ? 'Healthy' : 'Degraded') : '—'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-cocoa-50 dark:bg-cocoa-700/40">
                  <p className="text-cocoa-600 dark:text-cocoa-300">Redis Client State</p>
                  <p className="font-semibold text-cocoa-900 dark:text-cream-50">{redisStatus?.redis.clientStatus || '—'}</p>
                </div>

                <div className="p-3 rounded-lg bg-cocoa-50 dark:bg-cocoa-700/40">
                  <p className="text-cocoa-600 dark:text-cocoa-300">Pool Usage</p>
                  <p className="font-semibold text-cocoa-900 dark:text-cream-50">
                    {redisStatus?.workers.pool
                      ? `${redisStatus.workers.pool.activeWorkers}/${redisStatus.workers.pool.maxWorkers}`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-cocoa-600 dark:text-cocoa-300">
                Queue Wait (pool): {redisStatus?.workers.pool?.waitingJobs ?? '—'}
              </div>

              <div className="text-xs text-cocoa-600 dark:text-cocoa-300">
                Last Refresh: {formatTimestamp(redisStatus?.timestamp)}
              </div>

              {redisStatus && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-cocoa-200 dark:border-cocoa-600 rounded-lg overflow-hidden">
                    <thead className="bg-cocoa-50 dark:bg-cocoa-700/40">
                      <tr>
                        <th className="text-left px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Queue</th>
                        <th className="text-right px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Waiting</th>
                        <th className="text-right px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Active</th>
                        <th className="text-right px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Failed</th>
                        <th className="text-right px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Delayed</th>
                        <th className="text-right px-3 py-2 text-cocoa-700 dark:text-cocoa-300">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-cocoa-200 dark:border-cocoa-600">
                        <td className="px-3 py-2 text-cocoa-900 dark:text-cream-50">Voter Import</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.voterImport.waiting}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.voterImport.active}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.voterImport.failed}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.voterImport.delayed}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.voterImport.completed}</td>
                      </tr>
                      <tr className="border-t border-cocoa-200 dark:border-cocoa-600">
                        <td className="px-3 py-2 text-cocoa-900 dark:text-cream-50">Geocode</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.geocode.waiting}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.geocode.active}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.geocode.failed}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.geocode.delayed}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.geocode.completed}</td>
                      </tr>
                      <tr className="border-t border-cocoa-200 dark:border-cocoa-600">
                        <td className="px-3 py-2 text-cocoa-900 dark:text-cream-50">Scheduled</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.scheduled.waiting}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.scheduled.active}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.scheduled.failed}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.scheduled.delayed}</td>
                        <td className="px-3 py-2 text-right text-cocoa-700 dark:text-cocoa-300">{redisStatus.queues.scheduled.completed}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
