'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';
import Link from 'next/link';

interface Household {
  id: string;
  houseNumber?: string;
  streetName: string;
  streetSuffix?: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
  personCount: number;
  latitude?: number;
  longitude?: number;
  geocoded: boolean;
  geocodedAt?: string;
  geocodingProvider?: string;
  createdAt: string;
  updatedAt: string;
}

interface HouseholdFilters {
  city?: string;
  state?: string;
  zipCode?: string;
  geocoded?: boolean;
}

export default function HouseholdsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  const [filters, setFilters] = useState<HouseholdFilters>({
    city: '',
    state: '',
    zipCode: '',
    geocoded: undefined,
  });

  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch households
  useEffect(() => {
    if (!user) return;

    const fetchHouseholds = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', ((page - 1) * limit).toString());

        if (searchQuery) params.append('search', searchQuery);
        if (filters.city) params.append('city', filters.city);
        if (filters.state) params.append('state', filters.state);
        if (filters.zipCode) params.append('zipCode', filters.zipCode);
        if (filters.geocoded !== undefined) params.append('geocoded', filters.geocoded.toString());

        const response = await fetch(`/api/v1/gis/households?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch households');
        }

        const data = await response.json();
        setHouseholds(data.households || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Error fetching households:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch households');
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    fetchHouseholds();
  }, [user, page, filters, searchQuery, router, limit]);

  const handleFilterChange = (key: keyof HouseholdFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };



  if (loading && !initialLoadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-cocoa-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading households...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40">
        <Marshmallow size={40} animationDuration="3.8s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40">
        <Marshmallow size={42} animationDuration="4.5s" animationDelay="1s" />
      </div>

      <Header userName={user?.name} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">Households</h2>
          <p className="text-cocoa-600 dark:text-cocoa-300">View and manage household addresses</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 mb-6 border border-cocoa-200 dark:border-cocoa-700">
          <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Filters & Search</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search address..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-400 dark:placeholder-cocoa-500 focus:outline-none focus:ring-2 focus:ring-cinnamon-400"
            />

            {/* City */}
            <input
              type="text"
              placeholder="City"
              value={filters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-400 dark:placeholder-cocoa-500 focus:outline-none focus:ring-2 focus:ring-cinnamon-400"
            />

            {/* State */}
            <input
              type="text"
              placeholder="State (CA)"
              value={filters.state || ''}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-400 dark:placeholder-cocoa-500 focus:outline-none focus:ring-2 focus:ring-cinnamon-400"
            />

            {/* ZIP Code */}
            <input
              type="text"
              placeholder="ZIP Code"
              value={filters.zipCode || ''}
              onChange={(e) => handleFilterChange('zipCode', e.target.value)}
              className="px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-400 dark:placeholder-cocoa-500 focus:outline-none focus:ring-2 focus:ring-cinnamon-400"
            />

            {/* Geocoded Status */}
            <select
              value={filters.geocoded === undefined ? '' : filters.geocoded ? 'true' : 'false'}
              onChange={(e) => {
                if (e.target.value === '') {
                  handleFilterChange('geocoded', undefined);
                } else {
                  handleFilterChange('geocoded', e.target.value === 'true');
                }
              }}
              className="px-3 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 focus:outline-none focus:ring-2 focus:ring-cinnamon-400"
            >
              <option value="">All</option>
              <option value="true">Geocoded</option>
              <option value="false">Not Geocoded</option>
            </select>
          </div>
        </div>



        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg p-4 border border-cocoa-200 dark:border-cocoa-700">
            <p className="text-sm text-cocoa-600 dark:text-cocoa-400">Total Households</p>
            <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{total.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-cocoa-800 rounded-lg p-4 border border-cocoa-200 dark:border-cocoa-700">
            <p className="text-sm text-cocoa-600 dark:text-cocoa-400">Displayed</p>
            <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{households.length}</p>
          </div>
          <div className="bg-white dark:bg-cocoa-800 rounded-lg p-4 border border-cocoa-200 dark:border-cocoa-700">
            <p className="text-sm text-cocoa-600 dark:text-cocoa-400">Geocoded</p>
            <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{households.filter((h) => h.geocoded).length}</p>
          </div>
        </div>

        {/* Households Table */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 overflow-hidden">
          {households.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cocoa-50 dark:bg-cocoa-900/50 border-b border-cocoa-200 dark:border-cocoa-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">Address</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">City, State ZIP</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">People</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">Geocoded</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cocoa-200 dark:divide-cocoa-700">
                    {households.map((household) => (
                      <tr key={household.id} className="hover:bg-cocoa-50 dark:hover:bg-cocoa-700/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-cocoa-900 dark:text-cream-50">
                          <Link
                            href={`/households/${household.id}`}
                            className="hover:text-cinnamon-600 dark:hover:text-cinnamon-400 font-medium"
                          >
                            {household.fullAddress}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-cocoa-600 dark:text-cocoa-300">
                          {household.city}, {household.state} {household.zipCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-cocoa-900 dark:text-cream-50 font-medium">{household.personCount}</td>
                        <td className="px-4 py-3 text-sm">
                          {household.geocoded ? (
                            <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium">
                              ✓ Yes
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded text-xs font-medium">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-cocoa-600 dark:text-cocoa-400">
                          {household.geocodingProvider || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-4 border-t border-cocoa-200 dark:border-cocoa-700 flex items-center justify-between">
                <div className="text-sm text-cocoa-600 dark:text-cocoa-400">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-cocoa-300 dark:border-cocoa-600 text-cocoa-900 dark:text-cream-50 rounded hover:bg-cocoa-50 dark:hover:bg-cocoa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Prev
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-cocoa-600 dark:text-cocoa-400">Page {page}</span>
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= total}
                    className="px-3 py-1 border border-cocoa-300 dark:border-cocoa-600 text-cocoa-900 dark:text-cream-50 rounded hover:bg-cocoa-50 dark:hover:bg-cocoa-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-cocoa-600 dark:text-cocoa-400">No households found</p>
              {searchQuery && (
                <p className="text-sm text-cocoa-500 dark:text-cocoa-500 mt-2">Try adjusting your search or filters</p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-cocoa-800 border-t border-cocoa-200 dark:border-cocoa-700 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-cocoa-600 dark:text-cocoa-300 text-sm">
          <p>Cocoa Canvas - Open-source voter database and canvassing platform</p>
        </div>
      </footer>
    </div>
  );
}
