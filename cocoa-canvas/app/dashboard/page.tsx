'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Marshmallow from '@/components/Marshmallow';
import Header from '@/components/Header';
import JobQueueStatus from '@/components/JobQueueStatus';

interface User {
  id: string;
  email: string;
  name: string;
}

interface QuickNavCounts {
  households: number;
  people: number;
  datasets: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<QuickNavCounts | null>(null);

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

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [peopleRes, householdsRes, datasetsRes] = await Promise.all([
          fetch('/api/v1/people?limit=1&offset=0', { headers }),
          fetch('/api/v1/gis/households?limit=1&offset=0', { headers }),
          fetch('/api/v1/gis/datasets', { headers }),
        ]);

        if (
          !peopleRes.ok ||
          !householdsRes.ok ||
          !datasetsRes.ok
        ) {
          return;
        }

        const [peopleData, householdsData, datasetsData] = await Promise.all([
          peopleRes.json(),
          householdsRes.json(),
          datasetsRes.json(),
        ]);

        setCounts({
          people: Number(peopleData?.total || 0),
          households: Number(householdsData?.total || 0),
          datasets: Array.isArray(datasetsData?.data) ? datasetsData.data.length : 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard counts:', error);
      }
    };

    fetchCounts();
  }, [user]);



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

  const renderCount = (value?: number, label: string = 'total') => {
    if (!value || value <= 0) {
      return null;
    }

    return (
      <p className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-cocoa-100 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-50 text-sm font-bold">
        {value.toLocaleString()} {label}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-32 left-[6%] opacity-40">
        <Marshmallow size={40} animationDuration="3.8s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40">
        <Marshmallow size={42} animationDuration="4.5s" animationDelay="1s" />
      </div>
      <div className="hidden dark:block fixed top-[60%] left-[12%] opacity-40">
        <Marshmallow size={43} animationDuration="4s" animationDelay="1.5s" />
      </div>
      <div className="hidden dark:block fixed bottom-[20%] right-[8%] opacity-40">
        <Marshmallow size={44} animationDuration="3.5s" animationDelay="0.5s" />
      </div>
      <div className="hidden dark:block fixed bottom-[40%] left-[8%] opacity-40">
        <Marshmallow size={45} animationDuration="4.2s" animationDelay="2s" />
      </div>
      <div className="hidden dark:block fixed top-[15%] right-[18%] opacity-40">
        <Marshmallow size={41} animationDuration="3.6s" animationDelay="0.7s" />
      </div>
      <div className="hidden dark:block fixed top-[50%] left-[20%] opacity-40">
        <Marshmallow size={42} animationDuration="4.4s" animationDelay="1.3s" />
      </div>
      <div className="hidden dark:block fixed bottom-[35%] right-[15%] opacity-40">
        <Marshmallow size={43} animationDuration="3.9s" animationDelay="0.3s" />
      </div>

      <Header userName={user.name} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Welcome Text */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">Welcome to Cocoa Canvas</h2>
          <p className="text-cocoa-600 dark:text-cocoa-300">Your voter database and canvassing platform</p>
        </div>

        {/* Navigation Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* People */}
            <Link
              href="/people"
              className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700 hover:shadow-md hover:border-cocoa-300 dark:hover:border-cocoa-600 transition-all"
            >
              <h4 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">👥 People</h4>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Manage people & voters</p>
              {renderCount(counts?.people)}
            </Link>

            {/* Households */}
            <Link
              href="/households"
              className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700 hover:shadow-md hover:border-cocoa-300 dark:hover:border-cocoa-600 transition-all"
            >
              <h4 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">🏠 Households</h4>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">View & geocode addresses</p>
              {renderCount(counts?.households)}
            </Link>

            {/* Dataset Catalog */}
            <Link
              href="/catalog"
              className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-4 border border-cocoa-200 dark:border-cocoa-700 hover:shadow-md hover:border-cocoa-300 dark:hover:border-cocoa-600 transition-all"
            >
              <h4 className="text-lg font-semibold text-cocoa-900 dark:text-cream-50 mb-2">🗄️ Dataset Catalog</h4>
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">Manage spatial datasets</p>
              {renderCount(counts?.datasets, 'datasets')}
            </Link>
          </div>
        </div>

        {/* Job Queue */}
        <div className="mb-8">
          <JobQueueStatus />
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
