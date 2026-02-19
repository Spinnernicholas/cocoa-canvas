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

export default function CatalogPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
                🗄️ GIS Data Catalog
              </h1>
              <p className="text-cocoa-600 dark:text-cocoa-300">
                Manage spatial datasets, parcels, precincts, and election results
              </p>
            </div>
            <Link
              href="/catalog/import"
              className="bg-cocoa-700 dark:bg-cinnamon-600 text-white px-4 py-2 rounded-lg hover:bg-cocoa-800 dark:hover:bg-cinnamon-700 transition-colors"
            >
              ➕ Import Dataset
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-cocoa-200 dark:border-cocoa-700 mb-6">
          <div className="flex space-x-6">
            <button className="pb-3 px-2 border-b-2 border-cocoa-700 dark:border-cinnamon-500 text-cocoa-900 dark:text-cream-50 font-semibold">
              Datasets
            </button>
            <button className="pb-3 px-2 border-b-2 border-transparent text-cocoa-600 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cream-50 transition-colors">
              Elections
            </button>
            <button className="pb-3 px-2 border-b-2 border-transparent text-cocoa-600 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cream-50 transition-colors">
              Analytics
            </button>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">
              Data Catalog Coming Soon
            </h2>
            <p className="text-cocoa-600 dark:text-cocoa-300 mb-6">
              The GIS Data Catalog is currently under development. This feature will allow you to:
            </p>
            <ul className="text-left space-y-3 max-w-lg mx-auto mb-8">
              <li className="flex items-start">
                <span className="text-cocoa-700 dark:text-cinnamon-500 mr-3">📦</span>
                <span className="text-cocoa-700 dark:text-cocoa-300">
                  <strong>Import spatial datasets</strong> - Shapefiles, GeoJSON, GeoPackage
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cocoa-700 dark:text-cinnamon-500 mr-3">🏘️</span>
                <span className="text-cocoa-700 dark:text-cocoa-300">
                  <strong>Manage parcels</strong> - Property boundaries with assessment data
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cocoa-700 dark:text-cinnamon-500 mr-3">🗳️</span>
                <span className="text-cocoa-700 dark:text-cocoa-300">
                  <strong>Track precincts</strong> - Election-specific voting boundaries
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cocoa-700 dark:text-cinnamon-500 mr-3">📊</span>
                <span className="text-cocoa-700 dark:text-cocoa-300">
                  <strong>Store election results</strong> - Link results to precinct geometries
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cocoa-700 dark:text-cinnamon-500 mr-3">👥</span>
                <span className="text-cocoa-700 dark:text-cocoa-300">
                  <strong>Overlay demographics</strong> - Census and demographic data
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-cocoa-700 dark:text-cinnamon-500 mr-3">🗺️</span>
                <span className="text-cocoa-700 dark:text-cocoa-300">
                  <strong>Visualize on maps</strong> - Layer control with custom styling
                </span>
              </li>
            </ul>
            <div className="bg-cocoa-50 dark:bg-cocoa-900/50 rounded-lg p-4 border border-cocoa-200 dark:border-cocoa-700">
              <p className="text-sm text-cocoa-600 dark:text-cocoa-400">
                <strong>📖 Design Documentation:</strong> See{' '}
                <Link
                  href="https://github.com/spinnernicholas/cocoa-canvas"
                  className="text-cocoa-700 dark:text-cinnamon-400 hover:underline"
                >
                  docs/developer/gis-catalog-design.md
                </Link>{' '}
                for the full technical specification
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4">
            <div className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">0</div>
            <div className="text-sm text-cocoa-600 dark:text-cocoa-300">Datasets</div>
          </div>
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4">
            <div className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">0</div>
            <div className="text-sm text-cocoa-600 dark:text-cocoa-300">Elections</div>
          </div>
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4">
            <div className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">0</div>
            <div className="text-sm text-cocoa-600 dark:text-cocoa-300">Features</div>
          </div>
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4">
            <div className="text-2xl font-bold text-cocoa-900 dark:text-cream-50">-</div>
            <div className="text-sm text-cocoa-600 dark:text-cocoa-300">Last Import</div>
          </div>
        </div>
      </main>
    </div>
  );
}
