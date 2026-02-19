'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

interface HeaderProps {
  userName: string;
}

export default function Header({ userName }: HeaderProps) {
  const router = useRouter();

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

  return (
    <header className="bg-white dark:bg-cocoa-800 border-b border-cocoa-200 dark:border-cocoa-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🍫</span>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cocoa-600 to-cinnamon-600 dark:from-cocoa-300 dark:to-cinnamon-400">
              Cocoa Canvas
            </h1>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="px-3 py-2 text-sm font-medium text-cocoa-700 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cinnamon-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 rounded-lg transition-colors"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/campaign/map"
              className="px-3 py-2 text-sm font-medium text-cocoa-700 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cinnamon-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 rounded-lg transition-colors"
            >
              🗺️ Map
            </Link>
            <Link
              href="/people"
              className="px-3 py-2 text-sm font-medium text-cocoa-700 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cinnamon-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 rounded-lg transition-colors"
            >
              👥 People
            </Link>
            <Link
              href="/jobs"
              className="px-3 py-2 text-sm font-medium text-cocoa-700 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cinnamon-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 rounded-lg transition-colors"
            >
              ⚡ Jobs
            </Link>
            <Link
              href="/admin"
              className="px-3 py-2 text-sm font-medium text-cocoa-700 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cinnamon-300 hover:bg-cocoa-50 dark:hover:bg-cocoa-700 rounded-lg transition-colors"
            >
              ⚙️ Admin
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-cocoa-700 dark:text-cocoa-300 text-sm font-medium">
            {userName}
          </span>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-cocoa-600 dark:text-cocoa-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-sm font-medium transition-colors border border-cocoa-200 dark:border-cocoa-700 rounded hover:bg-cocoa-50 dark:hover:bg-cocoa-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
