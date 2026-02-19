'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

interface User {
  id: string;
  email: string;
  name: string;
}

export default function MapsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

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

  if (!user) {
    return null;
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
      <div className="hidden dark:block fixed top-[15%] right-[15%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.7s', animationDelay: '1.4s' }}>
        <Marshmallow size={44} animationDuration="3.7s" />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '4.3s', animationDelay: '0.8s' }}>
        <Marshmallow size={45} animationDuration="4.3s" />
      </div>
      <div className="hidden dark:block fixed bottom-[25%] right-[12%] opacity-40 animate-marshmallow-bob" style={{ animationDuration: '3.9s', animationDelay: '1.7s' }}>
        <Marshmallow size={41} animationDuration="3.9s" />
      </div>
      <Header userName={user.name} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">Spatial Data</h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">Discover, import, and manage GIS datasets</p>
        </div>

        {/* Main Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GIS Catalog Card */}
          <Link
            href="/catalog"
            className="group bg-white dark:bg-cocoa-800 rounded-lg shadow-md hover:shadow-lg transition-all border border-cocoa-200 dark:border-cocoa-700 overflow-hidden"
          >
            <div className="p-6">
              <div className="text-5xl mb-4">🗄️</div>
              <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-3 group-hover:text-cocoa-700 dark:group-hover:text-cinnamon-400 transition-colors">
                GIS Catalog
              </h2>
              <p className="text-cocoa-600 dark:text-cocoa-300 mb-4">
                Browse and manage all your imported spatial datasets. View discovered layers from ArcGIS services with metadata and geometry information.
              </p>
              <div className="flex items-center text-cocoa-700 dark:text-cinnamon-400 font-semibold">
                View Catalog →
              </div>
            </div>
          </Link>

          {/* Explore & Import Card */}
          <Link
            href="/gis/explorer"
            className="group bg-white dark:bg-cocoa-800 rounded-lg shadow-md hover:shadow-lg transition-all border border-cocoa-200 dark:border-cocoa-700 overflow-hidden"
          >
            <div className="p-6">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-3 group-hover:text-cocoa-700 dark:group-hover:text-cinnamon-400 transition-colors">
                Explore & Import
              </h2>
              <p className="text-cocoa-600 dark:text-cocoa-300 mb-4">
                Discover layers from any public ArcGIS Web App. Browse hierarchical layer structures and import selected layers to your catalog.
              </p>
              <div className="flex items-center text-cocoa-700 dark:text-cinnamon-400 font-semibold">
                Open Explorer →
              </div>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-6">📋 Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Dynamic Discovery</h3>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">
                Automatically discover all MapServer and FeatureServer endpoints from ArcGIS Web Apps
              </p>
            </div>
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4">
              <div className="text-3xl mb-3">🌳</div>
              <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Hierarchical Structure</h3>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">
                View complete parent-child layer relationships with expand/collapse controls
              </p>
            </div>
            <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-4">
              <div className="text-3xl mb-3">💾</div>
              <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Easy Import</h3>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">
                Add discovered layers to your catalog with custom metadata and access control
              </p>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-12 bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-8">
          <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-6">📖 How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-1">
                  Open the Explorer
                </h3>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Navigate to Explore & Import and paste a public ArcGIS Web App URL
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-1">
                  Discover Layers
                </h3>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Click "Explore Map" to discover all layers and services automatically
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-1">
                  Select & Import
                </h3>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Click on any layer and use "Add to Catalog" to import with metadata
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cocoa-600 dark:bg-cinnamon-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-1">
                  Manage in Catalog
                </h3>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  View and manage all imported datasets in the GIS Catalog
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
