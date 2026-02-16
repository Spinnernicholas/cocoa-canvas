'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Marshmallow from '@/components/Marshmallow';

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

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Redirect to login
    router.push('/login');
  };

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
      <div className="hidden dark:block fixed top-24 left-[6%] opacity-40 animate-bounce" style={{ animationDuration: '3.8s' }}>
        <Marshmallow size={44} />
      </div>
      <div className="hidden dark:block fixed top-[25%] right-[10%] opacity-40 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1s' }}>
        <Marshmallow size={36} />
      </div>
      <div className="hidden dark:block fixed top-[50%] left-[12%] opacity-40 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1.5s' }}>
        <Marshmallow size={48} />
      </div>
      <div className="hidden dark:block fixed bottom-[20%] right-[8%] opacity-40 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
        <Marshmallow size={38} />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40 animate-bounce" style={{ animationDuration: '4.2s', animationDelay: '2s' }}>
        <Marshmallow size={50} />
      </div>
      
      {/* Header */}
      <header className="bg-white dark:bg-cocoa-800 border-b border-cocoa-200 dark:border-cocoa-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cocoa-600 to-cinnamon-600 dark:from-cocoa-300 dark:to-cinnamon-400">🍫 Cocoa Canvas</h1>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-cocoa-700 dark:text-cocoa-300 text-sm">Welcome, {user.name}</span>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-cocoa-600 dark:text-cocoa-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Welcome Card */}
        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-8 mb-8 border border-cocoa-200 dark:border-cocoa-700">
          <h2 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">Welcome to Cocoa Canvas</h2>
          <p className="text-cocoa-600 dark:text-cocoa-300">
            Your open-source voter database and canvassing platform is ready to use.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Voters */}
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border-l-4 border-cocoa-600 dark:border-cinnamon-500">
            <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">👥 Voters</h3>
            <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mb-4">
              Manage and organize voter data for your campaigns
            </p>
            <Link href="/voters" className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium">
              Go to Voters →
            </Link>
          </div>

          {/* Campaigns */}
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border-l-4 border-cinnamon-500 dark:border-cinnamon-600">
            <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">📋 Campaigns</h3>
            <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mb-4">
              Create and manage your canvassing campaigns
            </p>
            <Link href="/campaigns" className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium">
              Go to Campaigns →
            </Link>
          </div>

          {/* Maps */}
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border-l-4 border-cocoa-500 dark:border-cinnamon-400">
            <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">🗺️ Maps</h3>
            <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mb-4">
              View voter locations and campaign areas on interactive maps
            </p>
            <Link href="/maps" className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium">
              Go to Maps →
            </Link>
          </div>

          {/* Jobs */}
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border-l-4 border-cinnamon-600 dark:border-cinnamon-500">
            <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">⚙️ Jobs</h3>
            <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mb-4">
              Monitor data import and processing jobs
            </p>
            <Link href="/jobs" className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium">
              Go to Jobs →
            </Link>
          </div>

          {/* Audit Log */}
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border-l-4 border-cocoa-700 dark:border-cocoa-600">
            <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">👁️ Audit Log</h3>
            <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mb-4">
              Track all system activity and changes
            </p>
            <Link href="/audit-log" className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium">
              View Audit Log →
            </Link>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-6 border-l-4 border-cocoa-600 dark:border-cinnamon-400">
            <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">⚙️ Settings</h3>
            <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mb-4">
              Manage system settings and user accounts
            </p>
            <Link href="/settings" className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium">
              Go to Settings →
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-cocoa-50 dark:bg-cocoa-900/30 rounded-lg p-6 border border-cocoa-200 dark:border-cocoa-800">
          <h3 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Quick Links & Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm"
            >
              📖 View Documentation on GitHub
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm"
            >
              🐛 Report an Issue
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm"
            >
              💬 Join Discussions
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm"
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
