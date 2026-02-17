'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

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
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900">
      <Header userName={user.name} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">Maps</h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">View and manage all canvas maps</p>
        </div>

        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-12 border border-cocoa-200 dark:border-cocoa-700">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-2xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Maps Coming Soon</h2>
            <p className="text-cocoa-600 dark:text-cocoa-300 mb-4">
              Map management and visualization features are under development.
            </p>
            <p className="text-sm text-cocoa-500 dark:text-cocoa-400">
              Use the Campaign page to access the interactive household map for your active campaign.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
