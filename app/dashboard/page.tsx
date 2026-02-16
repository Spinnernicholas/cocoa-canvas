'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Marshmallow from '@/components/Marshmallow';
import Header from '@/components/Header';
import CampaignCard from '@/components/CampaignCard';
import JobQueueStatus from '@/components/JobQueueStatus';
import RecentJobsList from '@/components/RecentJobsList';

interface User {
  id: string;
  email: string;
  name: string;
}

export default function DashboardPage() {
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
          <p className="text-cocoa-600 dark:text-cocoa-300 mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40 animate-bounce" style={{ animationDuration: '3.8s' }}>
        <Marshmallow size={44} />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1s' }}>
        <Marshmallow size={36} />
      </div>
      <div className="hidden dark:block fixed top-[60%] left-[12%] opacity-40 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1.5s' }}>
        <Marshmallow size={48} />
      </div>
      <div className="hidden dark:block fixed bottom-[20%] right-[8%] opacity-40 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
        <Marshmallow size={38} />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40 animate-bounce" style={{ animationDuration: '4.2s', animationDelay: '2s' }}>
        <Marshmallow size={50} />
      </div>

      <Header userName={user.name} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Welcome Text */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">Welcome to Cocoa Canvas</h2>
          <p className="text-cocoa-600 dark:text-cocoa-300">Your voter database and canvassing platform</p>
        </div>

        {/* Campaign Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-4">📊 Campaign Overview</h3>
          <CampaignCard />
        </div>

        {/* Job Queue and Recent Jobs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <JobQueueStatus />
          </div>
          <div>
            <RecentJobsList />
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Voters */}
            <Link
              href="/voters"
              className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700 hover:shadow-md hover:border-cocoa-300 dark:hover:border-cocoa-600 transition-all"
            >
              <h4 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">👥 Voters</h4>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Manage voter database</p>
            </Link>

            {/* Campaigns */}
            <Link
              href="/campaigns"
              className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700 hover:shadow-md hover:border-cocoa-300 dark:hover:border-cocoa-600 transition-all"
            >
              <h4 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">📋 Campaigns</h4>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Create campaigns</p>
            </Link>

            {/* Maps */}
            <Link
              href="/maps"
              className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700 hover:shadow-md hover:border-cocoa-300 dark:hover:border-cocoa-600 transition-all"
            >
              <h4 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">🗺️ Maps</h4>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">View area maps</p>
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700 hover:shadow-md hover:border-cocoa-300 dark:hover:border-cocoa-600 transition-all"
            >
              <h4 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">⚙️ Settings</h4>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Manage settings</p>
            </Link>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-cocoa-50 dark:bg-cocoa-900/30 rounded-lg p-6 border border-cocoa-200 dark:border-cocoa-800">
          <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">📚 Resources & Help</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium transition-colors"
            >
              📖 View Documentation
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium transition-colors"
            >
              🐛 Report Issues
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium transition-colors"
            >
              💬 Join Discussions
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium transition-colors"
            >
              📚 README
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-cocoa-800 border-t border-cocoa-200 dark:border-cocoa-700 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-cocoa-600 dark:text-cocoa-300 text-sm">
          <p>Cocoa Canvas - Open-source voter database and canvassing platform</p>
          <p className="mt-2">Built with Next.js, Prisma, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
