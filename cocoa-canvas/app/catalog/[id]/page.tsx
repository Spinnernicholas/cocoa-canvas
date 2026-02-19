'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  geometryType: string;
  recordCount: number | null;
  sourceTable: string | null;
  isActive: boolean;
  syncedToApp: boolean;
  createdAt: string;
  updatedAt: string;
  datasetType: {
    name: string;
    category: string;
  };
  sourceRemoteDataset: {
    serviceName: string;
    layerName: string;
  } | null;
}

interface Feature {
  id: number;
  properties: Record<string, any>;
  geometry: any;
}

interface FeaturesResponse {
  features: Feature[];
  fields: string[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  dataset: {
    id: string;
    name: string;
    description: string | null;
    datasetType: string;
    geometryType: string;
    isLocal: boolean;
  };
}

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.id as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuresData, setFeaturesData] = useState<FeaturesResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Fetch dataset metadata
  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/v1/gis/datasets/${datasetId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dataset');
        }

        const result = await response.json();
        setDataset(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDataset();
  }, [datasetId, router]);

  // Fetch features
  useEffect(() => {
    if (!dataset) return;

    const fetchFeatures = async () => {
      setFeaturesLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(
          `/api/v1/gis/datasets/${datasetId}/features?page=${currentPage}&limit=50`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch features');
        }

        const result = await response.json();
        setFeaturesData(result.data);
        
        // Initialize visible columns with first 5 fields if not already set
        if (result.data.fields.length > 0 && visibleColumns.size === 0) {
          setVisibleColumns(new Set(result.data.fields.slice(0, Math.min(5, result.data.fields.length))));
        }
      } catch (err) {
        console.error('Error fetching features:', err);
      } finally {
        setFeaturesLoading(false);
      }
    };

    fetchFeatures();
  }, [dataset, datasetId, currentPage, router]);

  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showColumnMenu && !target.closest('.column-menu-container')) {
        setShowColumnMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnMenu]);

  const handleDelete = async () => {
    if (!dataset) return;

    const confirmMessage = dataset.sourceTable
      ? `Are you sure you want to delete "${dataset.name}"? This will delete the PostGIS table "${dataset.sourceTable}" and cannot be undone.`
      : `Are you sure you want to delete "${dataset.name}"?`;

    if (!confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/gis/datasets/${datasetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete dataset');
      }

      router.push('/catalog');
    } catch (err) {
      alert(`Error deleting dataset: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDeleting(false);
    }
  };

  const toggleColumn = (field: string) => {
    const newColumns = new Set(visibleColumns);
    if (newColumns.has(field)) {
      newColumns.delete(field);
    } else {
      newColumns.add(field);
    }
    setVisibleColumns(newColumns);
  };

  const selectAllColumns = () => {
    if (featuresData) {
      setVisibleColumns(new Set(featuresData.fields));
    }
  };

  const deselectAllColumns = () => {
    setVisibleColumns(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h2 className="text-red-800 dark:text-red-300 font-semibold">Error</h2>
            <p className="text-red-600 dark:text-red-400">{error || 'Dataset not found'}</p>
          </div>
          <div className="mt-4">
            <Link
              href="/catalog"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const storageIndicator = dataset.sourceTable ? '💾 Local' : '📡 Remote';

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/catalog"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Catalog
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {dataset.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {dataset.datasetType.name} • {dataset.geometryType} • {storageIndicator}
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Dataset'}
            </button>
          </div>
        </div>

        {/* Dataset Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Dataset Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
              <p className="text-gray-900 dark:text-white">
                {dataset.description || 'No description'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Feature Count</p>
              <p className="text-gray-900 dark:text-white font-semibold">
                {dataset.recordCount !== null ? dataset.recordCount.toLocaleString() : 'Unknown'} features
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
              <p className="text-gray-900 dark:text-white">{dataset.datasetType.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <div className="flex gap-2">
                {dataset.isActive && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded">
                    Active
                  </span>
                )}
                {dataset.syncedToApp && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
                    Synced to App
                  </span>
                )}
              </div>
            </div>
            {dataset.sourceRemoteDataset && (
              <>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remote Service</p>
                  <p className="text-gray-900 dark:text-white">
                    {dataset.sourceRemoteDataset.serviceName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remote Layer</p>
                  <p className="text-gray-900 dark:text-white">
                    {dataset.sourceRemoteDataset.layerName}
                  </p>
                </div>
              </>
            )}
            {dataset.sourceTable && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">PostGIS Table</p>
                <p className="text-gray-900 dark:text-white font-mono text-sm">
                  {dataset.sourceTable}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-gray-900 dark:text-white">
                {new Date(dataset.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
              <p className="text-gray-900 dark:text-white">
                {new Date(dataset.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Browser */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Feature Browser
            </h2>
            
            {featuresData && featuresData.fields.length > 0 && (
              <div className="relative column-menu-container">
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <span>⚙️ Columns ({visibleColumns.size})</span>
                </button>

                {showColumnMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-600 flex justify-between">
                      <button
                        onClick={selectAllColumns}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        onClick={deselectAllColumns}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="p-2">
                      {featuresData.fields.map((field) => (
                        <label
                          key={field}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(field)}
                            onChange={() => toggleColumn(field)}
                            className="rounded border-gray-300 dark:border-gray-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {field}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {featuresLoading ? (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              Loading features...
            </p>
          ) : featuresData && featuresData.features.length > 0 ? (
            <>
              {visibleColumns.size === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    No columns selected
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Use the "⚙️ Columns" menu above to select columns to display
                  </p>
                </div>
              ) : (
                <>
                  {/* Features Table */}
                  <div className="overflow-x-auto mb-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Feature ID
                      </th>
                      {Array.from(visibleColumns).map((field) => (
                        <th
                          key={field}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {featuresData.features.map((feature) => (
                      <tr key={feature.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                          {feature.id}
                        </td>
                        {Array.from(visibleColumns).map((field) => (
                          <td
                            key={field}
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                          >
                            {feature.properties[field] !== null &&
                            feature.properties[field] !== undefined
                              ? String(feature.properties[field])
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">
                    {(featuresData.pagination.page - 1) * featuresData.pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(
                      featuresData.pagination.page * featuresData.pagination.limit,
                      featuresData.pagination.totalCount
                    )}
                  </span>{' '}
                  of <span className="font-medium">{featuresData.pagination.totalCount}</span>{' '}
                  features
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={!featuresData.pagination.hasPrevPage}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    Page {featuresData.pagination.page} of {featuresData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!featuresData.pagination.hasNextPage}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
                </>
              )}
            </>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              No features found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
