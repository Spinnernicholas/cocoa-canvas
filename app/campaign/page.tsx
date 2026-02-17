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

interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  targetArea?: string;
  color: string;
  logoUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignStats {
  households: number;
  people: number;
  voters: number;
  volunteers: number;
  donors: number;
}

export default function CampaignPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    targetArea: '',
    color: '#6B4423',
    logoUrl: '',
  });

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

  // Fetch campaign on mount
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const res = await fetch('/api/v1/campaign', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          if (res.status === 404) {
            // No campaign exists yet - show creation form
            setEditMode(true);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch campaign');
        }
        const data = await res.json();
        setCampaign(data.campaign);
        setStats(data.stats);

        // Populate form with existing data
        setFormData({
          name: data.campaign.name,
          description: data.campaign.description || '',
          startDate: data.campaign.startDate.split('T')[0],
          endDate: data.campaign.endDate.split('T')[0],
          targetArea: data.campaign.targetArea || '',
          color: data.campaign.color,
          logoUrl: data.campaign.logoUrl || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/v1/campaign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save campaign');
      }

      const data = await res.json();
      setCampaign(data.campaign);
      setEditMode(false);

      // Refetch stats
      const statsRes = await fetch('/api/v1/campaign', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const statsData = await statsRes.json();
      setStats(statsData.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

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

  if (loading && !editMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-cocoa-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cocoa-600 dark:border-cinnamon-400 mx-auto mb-4"></div>
          <p className="text-cocoa-700 dark:text-cocoa-300">Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream-50 dark:bg-cocoa-900 min-h-screen">
      <Header userName={user.name} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {!campaign || editMode ? (
          // Edit/Create Form
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold mb-6 text-cocoa-900 dark:text-cream-50">
              {campaign ? 'Edit Campaign' : 'Create Campaign'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Jane Smith for Mayor 2026"
                  required
                  className="mt-1 w-full px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 rounded-md shadow-sm dark:bg-cocoa-700 dark:text-cream-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Campaign description..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 rounded-md shadow-sm dark:bg-cocoa-700 dark:text-cream-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 rounded-md shadow-sm dark:bg-cocoa-700 dark:text-cream-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 rounded-md shadow-sm dark:bg-cocoa-700 dark:text-cream-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300">
                  Target Area
                </label>
                <input
                  type="text"
                  name="targetArea"
                  value={formData.targetArea}
                  onChange={handleInputChange}
                  placeholder="e.g., San Francisco County"
                  className="mt-1 w-full px-3 py-2 border border-cocoa-200 dark:border-cocoa-600 rounded-md shadow-sm dark:bg-cocoa-700 dark:text-cream-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-300">
                  Brand Color
                </label>
                <input
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="mt-1 w-16 h-10 border border-cocoa-200 dark:border-cocoa-600 rounded-md"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-cocoa-600 dark:bg-cocoa-700 hover:bg-cocoa-700 dark:hover:bg-cocoa-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {campaign ? 'Save Changes' : 'Create Campaign'}
                </button>
                {campaign && (
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="flex-1 bg-cocoa-200 dark:bg-cocoa-700 hover:bg-cocoa-300 dark:hover:bg-cocoa-600 text-cocoa-900 dark:text-cream-50 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          // Campaign View
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50">{campaign.name}</h1>
                {campaign.description && (
                  <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">{campaign.description}</p>
                )}
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="bg-cocoa-600 dark:bg-cocoa-700 hover:bg-cocoa-700 dark:hover:bg-cocoa-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Edit
              </button>
            </div>

            {campaign.targetArea && (
              <div className="bg-cocoa-50 dark:bg-cocoa-700 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-600">
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300 font-medium">Target Area</p>
                <p className="text-lg font-semibold text-cocoa-900 dark:text-cream-50">{campaign.targetArea}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Campaign Period</p>
                <p className="text-sm font-semibold text-cocoa-900 dark:text-cream-50">
                  {new Date(campaign.startDate).toLocaleDateString()} →{' '}
                  {new Date(campaign.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Status</p>
                <p className="text-sm font-semibold text-cocoa-900 dark:text-cream-50 capitalize">{campaign.status}</p>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Households</p>
                  <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{stats.households}</p>
                </div>
                <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-300">People</p>
                  <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{stats.people}</p>
                </div>
                <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Voters</p>
                  <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{stats.voters}</p>
                </div>
                <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Volunteers</p>
                  <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{stats.volunteers}</p>
                </div>
                <div className="bg-white dark:bg-cocoa-800 p-4 rounded-lg border border-cocoa-200 dark:border-cocoa-700">
                  <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Donors</p>
                  <p className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">{stats.donors}</p>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Link
                href="/campaign/map"
                className="block bg-cocoa-600 dark:bg-cocoa-700 hover:bg-cocoa-700 dark:hover:bg-cocoa-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
              >
                🗺️ View Campaign Map
              </Link>
              <Link
                href="/people"
                className="block bg-cocoa-200 dark:bg-cocoa-700 hover:bg-cocoa-300 dark:hover:bg-cocoa-600 text-cocoa-900 dark:text-cream-50 font-medium py-3 px-4 rounded-lg text-center transition-colors"
              >
                👥 Manage People
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
