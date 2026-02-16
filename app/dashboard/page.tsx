'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">🍫 Cocoa Canvas</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">Welcome, {user.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Cocoa Canvas</h2>
          <p className="text-gray-600">
            Your open-source voter database and canvassing platform is ready to use.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Voters */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-600">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">👥 Voters</h3>
            <p className="text-gray-600 text-sm mb-4">
              Manage and organize voter data for your campaigns
            </p>
            <Link href="/voters" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Go to Voters →
            </Link>
          </div>

          {/* Campaigns */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-600">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📋 Campaigns</h3>
            <p className="text-gray-600 text-sm mb-4">
              Create and manage your canvassing campaigns
            </p>
            <Link href="/campaigns" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Go to Campaigns →
            </Link>
          </div>

          {/* Maps */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-600">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🗺️ Maps</h3>
            <p className="text-gray-600 text-sm mb-4">
              View voter locations and campaign areas on interactive maps
            </p>
            <Link href="/maps" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Go to Maps →
            </Link>
          </div>

          {/* Jobs */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-600">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">⚙️ Jobs</h3>
            <p className="text-gray-600 text-sm mb-4">
              Monitor data import and processing jobs
            </p>
            <Link href="/jobs" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Go to Jobs →
            </Link>
          </div>

          {/* Audit Log */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-600">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">👁️ Audit Log</h3>
            <p className="text-gray-600 text-sm mb-4">
              Track all system activity and changes
            </p>
            <Link href="/audit-log" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Audit Log →
            </Link>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">⚙️ Settings</h3>
            <p className="text-gray-600 text-sm mb-4">
              Manage system settings and user accounts
            </p>
            <Link href="/settings" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Go to Settings →
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links & Documentation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              📖 View Documentation on GitHub
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              🐛 Report an Issue
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              💬 Join Discussions
            </a>
            <a
              href="https://github.com/Spinnernicholas/cocoa-canvas/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              📚 README
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-600 text-sm">
          <p>Cocoa Canvas - Open-source voter database and canvassing platform</p>
          <p className="mt-2">Built with Next.js, Prisma, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
