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
  importedDataset?: {
    id: string;
    name: string;
  };
  createdBy?: { name: string };
}

interface CatalogDataset {
  id: string;
  name: string;
  description?: string;
  datasetType: {
    id: string;
    name: string;
  };
  sourceTable?: string;
  geometryType?: string;
  recordCount?: number;
  isActive: boolean;
  createdAt: string;
  sourceRemoteDataset?: {
    id: string;
    serviceUrl: string;
    layerId: number;
    layerName: string;
  };
  createdBy?: { name: string };
}

export default function CatalogPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [remoteDatasets, setRemoteDatasets] = useState<RemoteDataset[]>([]);
  const [catalogDatasets, setCatalogDatasets] = useState<CatalogDataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Fetch remote datasets and catalog datasets
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingDatasets(true);
      try {
        const token = localStorage.getItem('authToken');
        
        // Fetch remote datasets
        const remoteResponse = await fetch('/api/v1/gis/remote-datasets', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (remoteResponse.ok) {
          const data = await remoteResponse.json();
          if (data.success && Array.isArray(data.data)) {
            setRemoteDatasets(data.data);
          }
        }

        // Fetch catalog datasets
        const catalogResponse = await fetch('/api/v1/gis/datasets', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (catalogResponse.ok) {
          const data = await catalogResponse.json();
          if (data.success && Array.isArray(data.data)) {
            setCatalogDatasets(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching datasets:', error);
      } finally {
        setLoadingDatasets(false);
      }
    };

    fetchData();
  }, [user]);

  const handleDeleteRemoteDataset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this remote dataset reference? This will not delete any imported catalog datasets.')) {
      return;
    }

    setDeletingId(id);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/gis/remote-datasets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setRemoteDatasets(prev => prev.filter(d => d.id !== id));
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting remote dataset:', error);
      alert('Failed to delete remote dataset');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCatalogDataset = async (id: string, hasLocalTable: boolean) => {
    const message = hasLocalTable
      ? 'Are you sure you want to delete this dataset? This will permanently delete the local PostGIS table and all its data. This cannot be undone.'
      : 'Are you sure you want to delete this dataset?';
    
    if (!confirm(message)) {
      return;
    }

    setDeletingId(id);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/gis/datasets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setCatalogDatasets(prev => prev.filter(d => d.id !== id));
        // Refresh remote datasets to update imported status
        const remoteResponse = await fetch('/api/v1/gis/remote-datasets', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (remoteResponse.ok) {
          const data = await remoteResponse.json();
          if (data.success) {
            setRemoteDatasets(data.data);
          }
        }
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting catalog dataset:', error);
      alert('Failed to delete catalog dataset');
    } finally {
      setDeletingId(null);
    }
  };

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
        
        {/* Catalog Datasets Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
              📚 Catalog Datasets
            </h2>
            <p className="text-cocoa-600 dark:text-cocoa-300">
              Imported datasets available in your catalog (remote references and local storage)
            </p>
          </div>

          {loadingDatasets ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading...</p>
            </div>
          ) : catalogDatasets.length === 0 ? (
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-8 text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                No catalog datasets
              </h3>
              <p className="text-cocoa-600 dark:text-cocoa-300 mb-6">
                Import datasets from the explorer to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogDatasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 truncate">
                      {dataset.name}
                    </h3>
                    <p className="text-xs text-cocoa-600 dark:text-cocoa-400 mt-1">
                      {dataset.datasetType.name}
                    </p>
                  </div>

                  {dataset.description && (
                    <p className="text-sm text-cocoa-700 dark:text-cocoa-300 mb-3">
                      {dataset.description.substring(0, 100)}
                      {dataset.description.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    {dataset.sourceTable ? (
                      <div className="text-xs">
                        <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                          💾 Local Storage
                        </span>
                        {dataset.recordCount && (
                          <span className="ml-2 text-cocoa-600 dark:text-cocoa-400">
                            {dataset.recordCount.toLocaleString()} records
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          📡 Remote Reference
                        </span>
                      </div>
                    )}
                    {dataset.geometryType && (
                      <div className="text-xs">
                        <span className="inline-block bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-800 dark:text-cocoa-200 px-2 py-1 rounded">
                          {dataset.geometryType}
                        </span>
                      </div>
                    )}
                  </div>

                  {dataset.sourceRemoteDataset && (
                    <div className="text-xs text-cocoa-500 dark:text-cocoa-400 mb-3 pb-3 border-b border-cocoa-200 dark:border-cocoa-700">
                      <p className="truncate">
                        <strong>From:</strong> {dataset.sourceRemoteDataset.layerName}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-cocoa-600 dark:text-cocoa-300 mb-3">
                    Created {new Date(dataset.createdAt).toLocaleDateString()}
                  </div>

                  <button 
                    onClick={() => handleDeleteCatalogDataset(dataset.id, !!dataset.sourceTable)}
                    disabled={deletingId === dataset.id}
                    className="w-full text-center text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium py-2 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {deletingId === dataset.id ? 'Deleting...' : '🗑️ Delete Dataset'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remote Datasets Section */}
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
              📍 Remote Service References
            </h2>
            <p className="text-cocoa-600 dark:text-cocoa-300">
              Remote GIS services you've discovered (not yet in catalog)
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
                      Discovered {new Date(dataset.createdAt).toLocaleDateString()}
                    </p>
                    {dataset.importedDataset && (
                      <p className="text-green-600 dark:text-green-400 mt-2 font-semibold">
                        ✓ Imported as "{dataset.importedDataset.name}"
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={() => handleDeleteRemoteDataset(dataset.id)}
                    disabled={deletingId === dataset.id}
                    className="w-full text-center text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium py-2 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {deletingId === dataset.id ? 'Deleting...' : '🗑️ Delete Reference'}
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
