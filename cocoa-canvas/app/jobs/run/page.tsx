'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';
import PeopleImportModal from '@/components/PeopleImportModal';
import Link from 'next/link';

type JobType = 'geocoding' | 'people_import';

interface GeocodeFilters {
  city?: string;
  state?: string;
  zipCode?: string;
  skipGeocoded?: boolean;
  limit?: number;
}

export default function RunJobPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasProviders, setHasProviders] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  // Geocoding filters
  const [geocodeFilters, setGeocodeFilters] = useState<GeocodeFilters>({
    city: '',
    state: '',
    zipCode: '',
    skipGeocoded: true,
    limit: 10000,
  });

  // Load user and check for providers
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
      
      // Fetch providers to check if any are configured
      const fetchProviders = async () => {
        try {
          const response = await fetch('/api/v1/admin/geocoders', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          
          if (response.ok) {
            const data = await response.json();
            const enabledProviders = (data.providers || []).filter((p: any) => p.isEnabled);
            setHasProviders(enabledProviders.length > 0);
          }
        } catch (err) {
          console.error('Error fetching providers:', err);
          setHasProviders(false);
        } finally {
          setProvidersLoading(false);
        }
      };
      
      fetchProviders();
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const handleStartGeocoding = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('authToken');

      // Prepare filters (only include non-empty values)
      const filters: any = {};
      if (geocodeFilters.city?.trim()) filters.city = geocodeFilters.city;
      if (geocodeFilters.state?.trim()) filters.state = geocodeFilters.state;
      if (geocodeFilters.zipCode?.trim()) filters.zipCode = geocodeFilters.zipCode;

      const response = await fetch('/api/v1/jobs/geocoding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          filters,
          skipGeocoded: geocodeFilters.skipGeocoded,
          limit: geocodeFilters.limit,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          router.push('/login');
          return;
        }
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start geocoding job');
        return;
      }

      const data = await response.json();
      setSuccess(`Geocoding job started! Job ID: ${data.jobId}`);
      
      // Redirect to jobs page after 2 seconds
      setTimeout(() => {
        router.push('/jobs');
      }, 2000);
    } catch (err) {
      console.error('Error starting geocoding job:', err);
      setError('Failed to start geocoding job');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
        <Header userName="" />
        <main>
          <Marshmallow />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
      <Header userName={user.name || user.email} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/jobs" className="text-cinnamon-600 dark:text-cinnamon-400 hover:underline text-sm">
            ← Back to Jobs
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Sidebar Menu */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <h2 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">
                Available Jobs
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedJob('geocoding');
                    setError('');
                    setSuccess('');
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedJob === 'geocoding'
                      ? 'bg-cinnamon-500 text-cream-50'
                      : 'bg-cocoa-200 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 hover:bg-cocoa-300 dark:hover:bg-cocoa-600'
                  }`}
                >
                  <div className="font-medium">Geocoding</div>
                  <div className="text-xs mt-1 opacity-75">
                    Geocode household addresses
                  </div>
                </button>
                <button
                  onClick={() => {
                    setSelectedJob('people_import');
                    setError('');
                    setSuccess('');
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedJob === 'people_import'
                      ? 'bg-cinnamon-500 text-cream-50'
                      : 'bg-cocoa-200 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 hover:bg-cocoa-300 dark:hover:bg-cocoa-600'
                  }`}
                >
                  <div className="font-medium">Import People</div>
                  <div className="text-xs mt-1 opacity-75">
                    Upload voter files and create people
                  </div>
                </button>

                {/* Future job types can be added here */}
                {/* 
                <button
                  disabled
                  className="w-full text-left px-4 py-3 rounded-lg bg-cocoa-100 dark:bg-cocoa-800 text-cocoa-600 dark:text-cocoa-400 cursor-not-allowed opacity-50"
                >
                  <div className="font-medium">Data Export</div>
                  <div className="text-xs mt-1">Coming soon</div>
                </button>
                */}
              </div>
            </div>

            {/* Job Configuration */}
            <div className="md:col-span-3">
              {!selectedJob && (
                <div className="bg-cocoa-50 dark:bg-cocoa-800 border-2 border-dashed border-cocoa-300 dark:border-cocoa-600 rounded-lg p-8 text-center">
                  <p className="text-cocoa-600 dark:text-cocoa-300">
                    Select a job from the menu to get started
                  </p>
                </div>
              )}

              {selectedJob === 'geocoding' && (
                <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-6">
                    Geocoding Configuration
                  </h3>

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

                  <div className="space-y-4 mb-6">
                    {/* City Filter */}
                    <div>
                      <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                        City (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., San Francisco"
                        value={geocodeFilters.city || ''}
                        onChange={(e) =>
                          setGeocodeFilters({ ...geocodeFilters, city: e.target.value })
                        }
                        disabled={loading}
                        className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                      />
                    </div>

                    {/* State Filter */}
                    <div>
                      <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                        State (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., CA"
                        value={geocodeFilters.state || ''}
                        onChange={(e) =>
                          setGeocodeFilters({ ...geocodeFilters, state: e.target.value })
                        }
                        disabled={loading}
                        maxLength={2}
                        className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                      />
                    </div>

                    {/* ZIP Code Filter */}
                    <div>
                      <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                        ZIP Code (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 94102"
                        value={geocodeFilters.zipCode || ''}
                        onChange={(e) =>
                          setGeocodeFilters({ ...geocodeFilters, zipCode: e.target.value })
                        }
                        disabled={loading}
                        className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                      />
                    </div>

                    {/* Limit */}
                    <div>
                      <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                        Records to Process (max)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50000"
                        value={geocodeFilters.limit || 10000}
                        onChange={(e) =>
                          setGeocodeFilters({
                            ...geocodeFilters,
                            limit: parseInt(e.target.value) || 10000,
                          })
                        }
                        disabled={loading}
                        className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                      />
                      <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
                        Default: 10,000
                      </p>
                    </div>

                    {/* Skip Geocoded Checkbox */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="skipGeocoded"
                        checked={geocodeFilters.skipGeocoded || false}
                        onChange={(e) =>
                          setGeocodeFilters({ ...geocodeFilters, skipGeocoded: e.target.checked })
                        }
                        disabled={loading}
                        className="h-4 w-4 text-cinnamon-600 border-cocoa-300 rounded"
                      />
                      <label htmlFor="skipGeocoded" className="ml-2 block text-sm font-medium text-cocoa-900 dark:text-cream-50">
                        Skip already geocoded households
                      </label>
                    </div>
                  </div>

                  {!hasProviders && !providersLoading && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <span className="font-semibold">No geocoding providers configured.</span> You must{' '}
                        <Link href="/admin/geocoders" className="font-semibold underline hover:no-underline">
                          add a geocoding provider
                        </Link>
                        {' '}before you can start a geocoding job.
                      </p>
                    </div>
                  )}

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <span className="font-semibold">Note:</span> Geocoding jobs are processed asynchronously. You can monitor progress on the Jobs page.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleStartGeocoding}
                      disabled={loading || !hasProviders || providersLoading}
                      className="flex-1 px-6 py-3 bg-cinnamon-500 hover:bg-cinnamon-600 disabled:bg-cinnamon-400 text-cream-50 font-medium rounded-lg transition-colors"
                    >
                      {loading ? 'Starting Job...' : !hasProviders ? 'Configure a Provider First' : 'Start Geocoding Job'}
                    </button>
                    <button
                      onClick={() => setSelectedJob(null)}
                      disabled={loading}
                      className="px-6 py-3 bg-cocoa-200 dark:bg-cocoa-700 hover:bg-cocoa-300 dark:hover:bg-cocoa-600 disabled:opacity-50 text-cocoa-900 dark:text-cream-50 font-medium rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              {selectedJob === 'people_import' && (
                <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow p-6">
                  <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-4">
                    People Import
                  </h3>
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-300 mb-6">
                    Upload voter files and import people into the system. The import wizard lets you choose the file format and import type.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="flex-1 px-6 py-3 bg-cinnamon-500 hover:bg-cinnamon-600 text-cream-50 font-medium rounded-lg transition-colors"
                    >
                      Open Import Wizard
                    </button>
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="px-6 py-3 bg-cocoa-200 dark:bg-cocoa-700 hover:bg-cocoa-300 dark:hover:bg-cocoa-600 text-cocoa-900 dark:text-cream-50 font-medium rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Marshmallow />
      <PeopleImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
