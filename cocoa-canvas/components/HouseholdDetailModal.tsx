'use client';

import { useState, useEffect } from 'react';
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
  county?: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  geocoded: boolean;
  geocodedAt?: string;
  geocodingProvider?: string;
  createdAt: string;
  updatedAt: string;
  people: Person[];
}

interface HouseholdDetailModalProps {
  householdId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function HouseholdDetailModal({
  householdId,
  isOpen,
  onClose,
  onUpdate,
}: HouseholdDetailModalProps) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !householdId) return;

    const fetchHousehold = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(`/api/v1/gis/households/${householdId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(`Failed to fetch household: ${errorMessage}`);
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
  }, [householdId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-cocoa-800 border-b border-cocoa-200 dark:border-cocoa-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">Household Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-cocoa-600 dark:text-cocoa-400 hover:text-cocoa-900 dark:hover:text-cream-50 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading household...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : household ? (
            <>
              {/* Address Header */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-1">
                  {household.fullAddress}
                </h3>
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">
                  {household.city}, {household.state} {household.zipCode}
                  {household.county && ` • ${household.county} County`}
                </p>
              </div>

              {/* Geocoding Status */}
              <div className="bg-cocoa-50 dark:bg-cocoa-700/50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase">Status</p>
                    {household.geocoded ? (
                      <span className="inline-block mt-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-sm font-medium">
                        ✓ Geocoded
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded text-sm font-medium">
                        Not Geocoded
                      </span>
                    )}
                  </div>
                  {household.geocodingProvider && (
                    <div>
                      <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase">Provider</p>
                      <p className="text-sm text-cocoa-900 dark:text-cream-50 mt-1">{household.geocodingProvider}</p>
                    </div>
                  )}
                  {household.geocodedAt && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-cocoa-600 dark:text-cocoa-400 uppercase">Last Geocoded</p>
                      <p className="text-sm text-cocoa-900 dark:text-cream-50 mt-1">
                        {new Date(household.geocodedAt).toLocaleDateString()} at{' '}
                        {new Date(household.geocodedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>

                {household.latitude && household.longitude && (
                  <p className="text-xs text-cocoa-600 dark:text-cocoa-300 mt-4">
                    <strong>Coordinates:</strong> {household.latitude.toFixed(6)}, {household.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Address Components */}
              <div className="mb-6">
                <h4 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-3">Address Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {household.houseNumber && (
                    <div>
                      <p className="text-cocoa-600 dark:text-cocoa-400">House Number</p>
                      <p className="text-cocoa-900 dark:text-cream-50">{household.houseNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-cocoa-600 dark:text-cocoa-400">Street Name</p>
                    <p className="text-cocoa-900 dark:text-cream-50">{household.streetName}</p>
                  </div>
                  {household.streetSuffix && (
                    <div>
                      <p className="text-cocoa-600 dark:text-cocoa-400">Street Suffix</p>
                      <p className="text-cocoa-900 dark:text-cream-50">{household.streetSuffix}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-cocoa-600 dark:text-cocoa-400">City</p>
                    <p className="text-cocoa-900 dark:text-cream-50">{household.city}</p>
                  </div>
                  <div>
                    <p className="text-cocoa-600 dark:text-cocoa-400">State</p>
                    <p className="text-cocoa-900 dark:text-cream-50">{household.state}</p>
                  </div>
                  <div>
                    <p className="text-cocoa-600 dark:text-cocoa-400">ZIP Code</p>
                    <p className="text-cocoa-900 dark:text-cream-50">{household.zipCode}</p>
                  </div>
                </div>
              </div>

              {/* People in Household */}
              <div className="mb-6">
                <h4 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-3">
                  People in Household ({household.people.length})
                </h4>

                {household.people.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {household.people.map((person) => (
                      <div
                        key={person.id}
                        className="p-3 bg-cocoa-50 dark:bg-cocoa-700/50 rounded border border-cocoa-200 dark:border-cocoa-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-cocoa-900 dark:text-cream-50">
                              {person.firstName} {person.lastName}
                            </p>
                          </div>
                          <Link
                            href={`/people/${person.id}`}
                            className="text-xs text-cinnamon-600 dark:text-cinnamon-400 hover:text-cinnamon-700 dark:hover:text-cinnamon-300 font-medium whitespace-nowrap ml-2"
                          >
                            View
                          </Link>
                        </div>

                        {(person.voter || person.volunteer || person.donor) && (
                          <div className="flex flex-wrap gap-1">
                            {person.voter && (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                Voter
                              </span>
                            )}
                            {person.volunteer && (
                              <span className="inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                                Volunteer
                              </span>
                            )}
                            {person.donor && (
                              <span className="inline-block px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-xs font-medium">
                                Donor
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-400">No people recorded at this address</p>
                )}
              </div>

              {/* Full Page Link */}
              <div className="flex gap-3 pt-4 border-t border-cocoa-200 dark:border-cocoa-700">
                <Link
                  href={`/households/${household.id}`}
                  className="flex-1 px-4 py-2 bg-cinnamon-500 dark:bg-cinnamon-600 text-white rounded-lg hover:bg-cinnamon-600 dark:hover:bg-cinnamon-700 transition-colors font-medium text-center"
                >
                  Open Full Page
                </Link>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 text-cocoa-900 dark:text-cream-50 rounded-lg hover:bg-cocoa-50 dark:hover:bg-cocoa-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
