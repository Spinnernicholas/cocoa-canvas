'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  targetArea?: string;
  color: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CampaignSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    targetArea: '',
    color: '#6B4423',
    logoUrl: '',
  });

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

  // Fetch campaign
  useEffect(() => {
    if (!user) return;

    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/v1/campaign', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            router.push('/login');
            return;
          }
          if (response.status === 404) {
            // No campaign exists yet
            setError('');
            return;
          }
          setError('Failed to load campaign settings');
          return;
        }

        const data = await response.json();
        setCampaign(data.campaign);
        
        // Populate form
        if (data.campaign) {
          setFormData({
            name: data.campaign.name || '',
            description: data.campaign.description || '',
            startDate: data.campaign.startDate ? new Date(data.campaign.startDate).toISOString().split('T')[0] : '',
            endDate: data.campaign.endDate ? new Date(data.campaign.endDate).toISOString().split('T')[0] : '',
            status: data.campaign.status || 'planning',
            targetArea: data.campaign.targetArea || '',
            color: data.campaign.color || '#6B4423',
            logoUrl: data.campaign.logoUrl || '',
          });
        }
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError('Failed to load campaign settings');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [user, router]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('authToken');

      const method = campaign ? 'PUT' : 'POST';
      const response = await fetch('/api/v1/campaign', {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save campaign settings');
        return;
      }

      const data = await response.json();
      setCampaign(data.campaign);
      setSuccess('Campaign settings saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving campaign:', err);
      setError('Failed to save campaign settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
      <Header userName={user.name || user.email} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-cinnamon-600 dark:text-cinnamon-400 hover:underline text-sm mb-4 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
            🎯 Campaign Settings
          </h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">
            Configure your campaign details, timeline, and target area
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold">Single Campaign Model:</span> This deployment manages one political race. 
            All voters, volunteers, and data belong to this campaign.
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

        {/* Form */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-cocoa-600 dark:text-cocoa-300">Loading campaign settings...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-md p-6 border border-cocoa-200 dark:border-cocoa-700">
            <div className="space-y-6">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Jane Smith for Mayor 2026"
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the campaign"
                  rows={3}
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Campaign Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Target Area */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Target Area / Jurisdiction
                </label>
                <input
                  type="text"
                  value={formData.targetArea}
                  onChange={(e) => setFormData({ ...formData, targetArea: e.target.value })}
                  placeholder="e.g., San Francisco County, District 5"
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                />
              </div>

              {/* Brand Color */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Campaign Brand Color
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 rounded border border-cocoa-300 dark:border-cocoa-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6B4423"
                    className="flex-1 px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-cocoa-900 dark:text-cream-50 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 rounded-lg bg-white dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 placeholder-cocoa-500 dark:placeholder-cocoa-400 focus:outline-none focus:ring-2 focus:ring-cinnamon-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.startDate || !formData.endDate}
                className="px-6 py-3 bg-cinnamon-500 hover:bg-cinnamon-600 disabled:bg-cinnamon-400 disabled:cursor-not-allowed text-cream-50 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
              </button>
              <Link
                href="/admin"
                className="px-6 py-3 bg-cocoa-200 dark:bg-cocoa-700 hover:bg-cocoa-300 dark:hover:bg-cocoa-600 text-cocoa-900 dark:text-cream-50 rounded-lg font-medium transition-colors flex items-center"
              >
                Cancel
              </Link>
            </div>

            {/* Metadata */}
            {campaign && (
              <div className="mt-8 pt-6 border-t border-cocoa-200 dark:border-cocoa-700">
                <h3 className="text-sm font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Metadata</h3>
                <dl className="grid grid-cols-2 gap-2 text-xs text-cocoa-600 dark:text-cocoa-400">
                  <dt>Campaign ID:</dt>
                  <dd className="font-mono">{campaign.id}</dd>
                  <dt>Created:</dt>
                  <dd>{new Date(campaign.createdAt).toLocaleString()}</dd>
                  <dt>Last Updated:</dt>
                  <dd>{new Date(campaign.updatedAt).toLocaleString()}</dd>
                </dl>
              </div>
            )}
          </div>
        )}
      </main>

      <Marshmallow />
    </div>
  );
}
