'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

interface User {
  id: string;
  email: string;
  name: string;
}

interface RemoteDataset {
  id: string;
  serviceUrl: string;
  layerId: number;
  layerName: string;
  layerType?: string;
  geometryType?: string;
  description?: string;
  createdAt: string;
  creator?: { name: string };
}

export default function CatalogPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [remoteDatasets, setRemoteDatasets] = useState<RemoteDataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  useEffect(() => {
    // Get user from localStorage
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
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch remote datasets
  useEffect(() => {
    if (!user) return;

    const fetchRemoteDatasets = async () => {
      setLoadingDatasets(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/gis/remote-datasets', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setRemoteDatasets(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching remote datasets:', error);
      } finally {
        setLoadingDatasets(false);
      }
    };

    fetchRemoteDatasets();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-cocoa-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading catalog...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
      <Header userName={user.name} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
                🗄️ GIS Catalog
              </h1>
              <p className="text-cocoa-600 dark:text-cocoa-300">
                Discover and manage GIS datasets from ArcGIS services
              </p>
            </div>
            <Link
              href="/gis/explorer"
              className="bg-cocoa-700 dark:bg-cinnamon-600 text-white px-4 py-2 rounded-lg hover:bg-cocoa-800 dark:hover:bg-cinnamon-700 transition-colors inline-flex items-center gap-2"
            >
              🔍 Explore & Import
            </Link>
          </div>
        </div>
        {/* Remote Datasets Section */}
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
              📍 Discovered Datasets
            </h2>
            <p className="text-cocoa-600 dark:text-cocoa-300">
              Remote GIS layers you've imported from ArcGIS services
            </p>
          </div>

          {loadingDatasets ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading datasets...</p>
            </div>
          ) : remoteDatasets.length === 0 ? (
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                No datasets yet
              </h3>
              <p className="text-cocoa-600 dark:text-cocoa-300 mb-6">
                Start by exploring ArcGIS services to discover and import datasets
              </p>
              <Link
                href="/gis/explorer"
                className="inline-block bg-cocoa-700 dark:bg-cinnamon-600 text-white px-6 py-2 rounded-lg hover:bg-cocoa-800 dark:hover:bg-cinnamon-700 transition-colors"
              >
                🔍 Open Explore & Import
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {remoteDatasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 truncate">
                      {dataset.layerName}
                    </h3>
                    <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1 truncate">
                      ID: {dataset.layerId}
                    </p>
                  </div>

                  {dataset.description && (
                    <p className="text-sm text-cocoa-700 dark:text-cocoa-300 mb-3">
                      {dataset.description.substring(0, 100)}
                      {dataset.description.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    {dataset.layerType && (
                      <div className="text-xs">
                        <span className="inline-block bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-800 dark:text-cocoa-200 px-2 py-1 rounded">
                          {dataset.layerType}
                        </span>
                      </div>
                    )}
                    {dataset.geometryType && (
                      <div className="text-xs">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          {dataset.geometryType}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-cocoa-500 dark:text-cocoa-400 mb-4 pb-4 border-b border-cocoa-200 dark:border-cocoa-700">
                    <p className="truncate">
                      <strong>Service:</strong> {dataset.serviceUrl.split('/').pop() || dataset.serviceUrl}
                    </p>
                    <p className="text-cocoa-600 dark:text-cocoa-300 mt-1">
                      Imported {new Date(dataset.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button className="w-full text-center text-cocoa-600 dark:text-cinnamon-400 hover:text-cocoa-800 dark:hover:text-cinnamon-300 text-sm font-medium py-2 transition-colors">
                    View Details →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
