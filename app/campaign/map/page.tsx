'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header from '@/components/Header';

// Dynamically import Leaflet map component
const MapComponent = dynamic(() => import('@/components/Map'), {
  loading: () => <div className="w-full h-96 bg-gray-200 rounded-lg animate-pulse" />,
  ssr: false,
});

interface User {
  id: string;
  email: string;
  name: string;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Household {
  id: string;
  address: {
    street: string;
    city?: string;
    zipCode?: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  memberCount: number;
}

interface HouseholdStats {
  totalHouseholds: number;
  totalPeople: number;
  totalVoters: number;
  totalVolunteers: number;
  totalDonors: number;
}

export default function CampaignMapPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [stats, setStats] = useState<HouseholdStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [votersOnly, setVotersOnly] = useState(false);
  const [volunteersOnly, setVolunteersOnly] = useState(false);

  // Get user from localStorage
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
  useEffect(() => {
    if (!mapBounds) return;

    const fetchHouseholds = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.append('bounds', JSON.stringify(mapBounds));
        if (city) params.append('city', city);
        if (zipCode) params.append('zipCode', zipCode);
        if (votersOnly) params.append('votersOnly', 'true');
        if (volunteersOnly) params.append('volunteersOnly', 'true');
        params.append('limit', '1000');

        const res = await fetch(`/api/v1/gis/households?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch households');
        }

        const data = await res.json();
        setHouseholds(data.households);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Debounce map updates
    const timer = setTimeout(fetchHouseholds, 500);
    return () => clearTimeout(timer);
  }, [mapBounds, city, zipCode, votersOnly, volunteersOnly]);

  // Fetch stats when bounds change
  useEffect(() => {
    if (!mapBounds) return;

    const fetchStats = async () => {
      try {
        const params = new URLSearchParams();
        params.append('bounds', JSON.stringify(mapBounds));
        if (city) params.append('city', city);
        if (zipCode) params.append('zipCode', zipCode);

        const res = await fetch(`/api/v1/gis/households/stats?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Stats error:', err);
      }
    };

    const timer = setTimeout(fetchStats, 500);
    return () => clearTimeout(timer);
  }, [mapBounds, city, zipCode]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header userName={user.name} />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Map</h2>
              <Link
                href="/campaign"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Back
              </Link>
            </div>

            {/* Filters */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Filter by city..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Filter by ZIP..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={votersOnly}
                    onChange={(e) => setVotersOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Voters only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={volunteersOnly}
                    onChange={(e) => setVolunteersOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Volunteers only</span>
                </label>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Households:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.totalHouseholds}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">People:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.totalPeople}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Voters:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.totalVoters}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Volunteers:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.totalVolunteers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Donors:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.totalDonors}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Households List */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Households ({households.length})
              </h3>
              {loading && <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>}
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {households.map((h) => (
                  <Link key={h.id} href={`/api/v1/gis/households/${h.id}`}>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {h.address.street}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {h.address.city}, {h.address.zipCode}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {h.memberCount} member{h.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          {user && <MapWithBoundsHandler onBoundsChange={setMapBounds} households={households} />}
        </div>
      </div>
    </div>
  );
}

// Separate component to handle map bounds
function MapWithBoundsHandler({
  onBoundsChange,
  households,
}: {
  onBoundsChange: (bounds: Bounds) => void;
  households: Household[];
}) {
  return <MapComponent households={households} onBoundsChange={onBoundsChange} />;
}
