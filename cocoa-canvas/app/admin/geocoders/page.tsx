'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';
import Link from 'next/link';

interface GeocoderProvider {
  id: string;
  providerId: string;
  providerName: string;
  description?: string;
  isEnabled: boolean;
  isPrimary: boolean;
  priority: number;
  config?: string;
  requestsProcessed: number;
  requestsFailed: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditingProvider extends Partial<GeocoderProvider> {
  tempConfig?: Record<string, any>;
}

export default function GeocodeSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [providers, setProviders] = useState<GeocoderProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load user
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
      router.push('/login');
    }
  }, [router]);

  // Fetch providers
  useEffect(() => {
    if (!user) return;

    const fetchProviders = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/admin/geocoders', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            router.push('/login');
            return;
          }
          setError('Failed to load geocoder settings');
          return;
        }

        const data = await response.json();
        setProviders(data.providers || []);
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Failed to load geocoder settings');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [user, router]);

  const handleStartEdit = (provider: GeocoderProvider) => {
    setEditingId(provider.id);
    setEditingProvider({
      ...provider,
      tempConfig: provider.config ? JSON.parse(provider.config) : {},
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingProvider(null);
    setShowAddForm(false);
  };

  const handleSaveProvider = async () => {
    if (!editingProvider) return;

    try {
      setError('');
      const token = localStorage.getItem('authToken');

      const payload: any = {
        providerId: editingProvider.providerId,
        providerName: editingProvider.providerName,
        description: editingProvider.description,
        isEnabled: editingProvider.isEnabled,
        priority: editingProvider.priority,
      };

      if (editingProvider.tempConfig) {
        payload.config = JSON.stringify(editingProvider.tempConfig);
      }

      const method = editingProvider.id ? 'PUT' : 'POST';
      const url = editingProvider.id
        ? `/api/v1/admin/geocoders/${editingProvider.id}`
        : '/api/v1/admin/geocoders';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save provider');
        return;
      }

      const data = await response.json();
      setSuccess(`Provider ${editingProvider.id ? 'updated' : 'created'} successfully!`);

      // Refresh providers list
      const fetchResponse = await fetch('/api/v1/admin/geocoders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        setProviders(fetchData.providers || []);
      }

      handleCancelEdit();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving provider:', err);
      setError('Failed to save provider');
    }
  };

  const handleSetPrimary = async (providerId: string) => {
    try {
      setError('');
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/v1/admin/geocoders/${providerId}/primary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to set primary provider');
        return;
      }

      setSuccess('Primary provider updated successfully!');

      // Refresh providers list
      const fetchResponse = await fetch('/api/v1/admin/geocoders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        setProviders(fetchData.providers || []);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error setting primary:', err);
      setError('Failed to set primary provider');
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      setError('');
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/v1/admin/geocoders/${providerId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete provider');
        return;
      }

      setSuccess('Provider deleted successfully!');

      // Refresh providers list
      const fetchResponse = await fetch('/api/v1/admin/geocoders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        setProviders(fetchData.providers || []);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting provider:', err);
      setError('Failed to delete provider');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
      <Header userName={user.name || user.email} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-cinnamon-600 dark:text-cinnamon-400 hover:underline text-sm mb-4 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
            🗺️ Geocoder Settings
          </h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">
            Configure and manage address geocoding providers
          </p>
        </div>

        {/* Error/Success Messages */}
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

        {/* Add Provider Button */}
        {!showAddForm && !editingId && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-cinnamon-500 hover:bg-cinnamon-600 text-cream-50 rounded-lg font-medium transition-colors"
            >
              + Add Provider
            </button>
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && editingProvider && (
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 mb-6 border border-cocoa-200 dark:border-cocoa-700">
            <h2 className="text-xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">
              {editingId ? 'Edit Provider' : 'Add New Provider'}
            </h2>

            <div className="space-y-4">
              {/* Provider ID */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Provider ID *
                </label>
                <input
                  type="text"
                  value={editingProvider.providerId || ''}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, providerId: e.target.value })
                  }
                  disabled={!!editingId}
                  placeholder="e.g., nominatim"
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 disabled:opacity-50"
                />
              </div>

              {/* Provider Name */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Provider Name *
                </label>
                <input
                  type="text"
                  value={editingProvider.providerName || ''}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, providerName: e.target.value })
                  }
                  placeholder="e.g., Nominatim"
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Description
                </label>
                <textarea
                  value={editingProvider.description || ''}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, description: e.target.value })
                  }
                  placeholder="Optional description of this provider"
                  rows={2}
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Priority (lower = higher priority)
                </label>
                <input
                  type="number"
                  value={editingProvider.priority || 0}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, priority: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50"
                />
              </div>

              {/* Enabled */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={editingProvider.isEnabled !== false}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, isEnabled: e.target.checked })
                  }
                  className="h-4 w-4 text-cinnamon-600 border-cocoa-300 rounded"
                />
                <label htmlFor="isEnabled" className="ml-2 block text-sm font-medium text-cocoa-900 dark:text-cream-50">
                  Enabled
                </label>
              </div>

              {/* Config JSON */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Configuration (JSON)
                </label>
                <textarea
                  value={JSON.stringify(editingProvider.tempConfig || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditingProvider({ ...editingProvider, tempConfig: parsed });
                    } catch {
                      // Invalid JSON, allow user to continue editing
                      setEditingProvider({ ...editingProvider, tempConfig: undefined });
                    }
                  }}
                  placeholder='{"apiKey": "your-key", "baseUrl": "https://..."}'
                  rows={4}
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 font-mono text-sm"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveProvider}
                className="px-6 py-2 bg-cinnamon-500 hover:bg-cinnamon-600 text-cream-50 rounded-lg font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-cocoa-200 dark:bg-cocoa-700 hover:bg-cocoa-300 dark:hover:bg-cocoa-600 text-cocoa-900 dark:text-cream-50 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Providers List */}
        {!showAddForm && !editingId ? (
          <>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-cocoa-600 dark:text-cocoa-300">Loading providers...</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="bg-cocoa-50 dark:bg-cocoa-800 rounded-lg p-8 text-center border border-cocoa-200 dark:border-cocoa-700">
                <p className="text-cocoa-600 dark:text-cocoa-300 mb-4">No geocoding providers configured yet</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-cinnamon-500 hover:bg-cinnamon-600 text-cream-50 rounded-lg font-medium transition-colors"
                >
                  Add First Provider
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="bg-white dark:bg-cocoa-800 rounded-lg shadow p-6 border border-cocoa-200 dark:border-cocoa-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-cocoa-900 dark:text-cream-50">
                            {provider.providerName}
                          </h3>
                          {provider.isPrimary && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-semibold">
                              PRIMARY
                            </span>
                          )}
                          {!provider.isEnabled && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 rounded text-xs font-semibold">
                              DISABLED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-cocoa-600 dark:text-cocoa-400">{provider.providerId}</p>
                        {provider.description && (
                          <p className="text-sm text-cocoa-600 dark:text-cocoa-400 mt-2">
                            {provider.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(provider)}
                          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
                        >
                          Edit
                        </button>
                        {!provider.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(provider.id)}
                            className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 bg-cocoa-50 dark:bg-cocoa-700/50 rounded p-4">
                      <div>
                        <p className="text-xs text-cocoa-600 dark:text-cocoa-400">Requests Processed</p>
                        <p className="text-lg font-bold text-cocoa-900 dark:text-cream-50">
                          {provider.requestsProcessed}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-cocoa-600 dark:text-cocoa-400">Failed Requests</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {provider.requestsFailed}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-cocoa-600 dark:text-cocoa-400">Last Used</p>
                        <p className="text-sm text-cocoa-900 dark:text-cream-50">
                          {provider.lastUsedAt
                            ? new Date(provider.lastUsedAt).toLocaleDateString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </main>

      <Marshmallow />
    </div>
  );
}
