'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';
import Link from 'next/link';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  voter?: boolean;
  volunteer?: boolean;
  donor?: boolean;
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
  county?: string;
  latitude?: number;
  longitude?: number;
  geocoded: boolean;
  geocodedAt?: string;
  geocodingProvider?: string;
  createdAt: string;
  updatedAt: string;
  people: Person[];
}

export default function HouseholdDetailPage() {
  const router = useRouter();
  const params = useParams();
  const householdId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Fetch household details
  useEffect(() => {
    if (!user || !householdId) return;

    const fetchHousehold = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/v1/gis/households/${householdId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch household');
        }

        const data = await response.json();
        setHousehold(data.household);
      } catch (err) {
        console.error('Error fetching household:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch household');
      } finally {
        setLoading(false);
      }
    };

    fetchHousehold();
  }, [user, householdId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-cocoa-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading household...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
        <Header userName={user?.name} />
        <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <Link href="/households" className="text-cinnamon-600 dark:text-cinnamon-400 hover:text-cinnamon-700 mb-6">
            ← Back to Households
          </Link>
          <div className="bg-white dark:bg-cocoa-800 rounded-lg p-8 text-center">
            <p className="text-cocoa-600 dark:text-cocoa-300">
              {error || 'Household not found'}
            </p>
          </div>
        </main>
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
      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Back Link */}
        <Link href="/households" className="text-cinnamon-600 dark:text-cinnamon-400 hover:text-cinnamon-700 dark:hover:text-cinnamon-300 mb-6 inline-flex items-center gap-2">
          ← Back to Households
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Address Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">{household.fullAddress}</h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">
            {household.city}, {household.state} {household.zipCode}
            {household.county && ` • ${household.county} County`}
          </p>
        </div>

        {/* Geocoding Status Card */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 mb-6 border border-cocoa-200 dark:border-cocoa-700">
          <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Geocoding Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400 mb-2">Status</p>
              {household.geocoded ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-medium">
                    ✓ Geocoded
                  </span>
                </div>
              ) : (
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded font-medium">
                  Not geocoded
                </span>
              )}
            </div>

            {household.geocodingProvider && (
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-400 mb-2">Provider</p>
                <p className="text-cocoa-900 dark:text-cream-50 font-medium">{household.geocodingProvider}</p>
              </div>
            )}

            {household.geocodedAt && (
              <div>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-400 mb-2">Last Geocoded</p>
                <p className="text-cocoa-900 dark:text-cream-50">
                  {new Date(household.geocodedAt).toLocaleDateString()} at {new Date(household.geocodedAt).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          {household.latitude && household.longitude && (
            <div className="mt-4 p-3 bg-cocoa-50 dark:bg-cocoa-700/50 rounded">
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">
                <strong>Coordinates:</strong> {household.latitude.toFixed(6)}, {household.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Address Details Card */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 mb-6 border border-cocoa-200 dark:border-cocoa-700">
          <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400">House Number</p>
              <p className="text-cocoa-900 dark:text-cream-50 font-medium">{household.houseNumber || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400">Street Name</p>
              <p className="text-cocoa-900 dark:text-cream-50 font-medium">{household.streetName}</p>
            </div>
            <div>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400">Street Suffix</p>
              <p className="text-cocoa-900 dark:text-cream-50 font-medium">{household.streetSuffix || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400">City</p>
              <p className="text-cocoa-900 dark:text-cream-50 font-medium">{household.city}</p>
            </div>
            <div>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400">State</p>
              <p className="text-cocoa-900 dark:text-cream-50 font-medium">{household.state}</p>
            </div>
            <div>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400">ZIP Code</p>
              <p className="text-cocoa-900 dark:text-cream-50 font-medium">{household.zipCode}</p>
            </div>
          </div>
        </div>

        {/* People in Household */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 mb-6 border border-cocoa-200 dark:border-cocoa-700">
          <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">
            People in This Household ({household.people.length})
          </h3>

          {household.people.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cocoa-50 dark:bg-cocoa-900/50 border-b border-cocoa-200 dark:border-cocoa-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">Roles</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-cocoa-900 dark:text-cream-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cocoa-200 dark:divide-cocoa-700">
                  {household.people.map((person) => (
                    <tr key={person.id} className="hover:bg-cocoa-50 dark:hover:bg-cocoa-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-cocoa-900 dark:text-cream-50 font-medium">
                        {person.firstName} {person.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {person.voter && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                              Voter
                            </span>
                          )}
                          {person.volunteer && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                              Volunteer
                            </span>
                          )}
                          {person.donor && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-xs font-medium">
                              Donor
                            </span>
                          )}
                          {!person.voter && !person.volunteer && !person.donor && (
                            <span className="text-cocoa-400 text-xs">No roles</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/people/${person.id}`}
                          className="text-cinnamon-600 dark:text-cinnamon-400 hover:text-cinnamon-700 dark:hover:text-cinnamon-300 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-cocoa-600 dark:text-cocoa-400">No people recorded at this address</p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-cocoa-50 dark:bg-cocoa-700/50 rounded-lg p-4 text-xs text-cocoa-600 dark:text-cocoa-400">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-cocoa-500 dark:text-cocoa-500">Created</p>
              <p>{new Date(household.createdAt).toLocaleDateString()} {new Date(household.createdAt).toLocaleTimeString()}</p>
            </div>
            <div>
              <p className="text-cocoa-500 dark:text-cocoa-500">Updated</p>
              <p>{new Date(household.updatedAt).toLocaleDateString()} {new Date(household.updatedAt).toLocaleTimeString()}</p>
            </div>
            <div>
              <p className="text-cocoa-500 dark:text-cocoa-500">Household ID</p>
              <p className="font-mono">{household.id}</p>
            </div>
          </div>
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
