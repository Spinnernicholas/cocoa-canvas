'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

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
  houseNumber?: string;
  streetName: string;
  streetSuffix?: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  personCount: number;
  geocoded: boolean;
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
        params.append('geocoded', 'true');
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
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-cocoa-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cocoa-600 dark:border-cinnamon-400 mx-auto mb-4"></div>
          <p className="text-cocoa-700 dark:text-cocoa-300">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.8s' }}>
        <Marshmallow size={40} animationDuration="3.8s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.5s', animationDelay: '1s' }}>
        <Marshmallow size={42} animationDuration="4.5s" />
      </div>
      <div className="hidden dark:block fixed top-[55%] left-[12%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.1s', animationDelay: '0.6s' }}>
        <Marshmallow size={43} animationDuration="4.1s" />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.3s', animationDelay: '0.8s' }}>
        <Marshmallow size={44} animationDuration="4.3s" />
      </div>
      <Header userName={user.name} />

      <div className="flex h-[calc(100vh-4rem)] relative z-10">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-cocoa-800 shadow-lg overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">Campaign Map</h2>
              <Link
                href="/campaign"
                className="text-sm text-cocoa-600 dark:text-cocoa-300 hover:underline"
              >
                ← Back
              </Link>
            </div>

            {/* Filters */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50">Filters</h3>
              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Filter by city..."
                  className="w-full px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 rounded-md dark:bg-cocoa-700 dark:text-cream-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="Filter by ZIP..."
                  className="w-full px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 rounded-md dark:bg-cocoa-700 dark:text-cream-50"
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
                  <span className="ml-2 text-sm text-cocoa-700 dark:text-cocoa-300">Voters only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={volunteersOnly}
                    onChange={(e) => setVolunteersOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="ml-2 text-sm text-cocoa-700 dark:text-cocoa-300">Volunteers only</span>
                </label>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="bg-cocoa-50 dark:bg-cocoa-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-3">Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cocoa-600 dark:text-cocoa-300">Households:</span>
                    <span className="font-semibold text-cocoa-900 dark:text-cream-50">
                      {stats.totalHouseholds}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cocoa-600 dark:text-cocoa-300">People:</span>
                    <span className="font-semibold text-cocoa-900 dark:text-cream-50">
                      {stats.totalPeople}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cocoa-600 dark:text-cocoa-300">Voters:</span>
                    <span className="font-semibold text-cocoa-900 dark:text-cream-50">
                      {stats.totalVoters}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cocoa-600 dark:text-cocoa-300">Volunteers:</span>
                    <span className="font-semibold text-cocoa-900 dark:text-cream-50">
                      {stats.totalVolunteers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cocoa-600 dark:text-cocoa-300">Donors:</span>
                    <span className="font-semibold text-cocoa-900 dark:text-cream-50">
                      {stats.totalDonors}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Households List */}
            <div>
              <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-3">
                Households ({households.length})
              </h3>
              {loading && <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Loading...</p>}
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {households.map((h) => (
                  <Link key={h.id} href={`/households/${h.id}`}>
                    <div className="p-3 bg-white dark:bg-cocoa-700 rounded-lg hover:bg-cocoa-50 dark:hover:bg-cocoa-600 cursor-pointer transition-colors border border-cocoa-200 dark:border-cocoa-600">
                      <p className="font-medium text-cocoa-900 dark:text-cream-50 text-sm">
                        {h.fullAddress}
                      </p>
                      <p className="text-xs text-cocoa-600 dark:text-cocoa-300">
                        {h.city}, {h.state} {h.zipCode}
                      </p>
                      <p className="text-xs text-cocoa-500 dark:text-cocoa-400 mt-1">
                        {h.personCount} person{h.personCount !== 1 ? 's' : ''}
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
