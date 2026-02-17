'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

interface User {
  id: string;
  email: string;
  name: string;
}

export default function SettingsPage() {
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
          <h1 className="text-4xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">Settings</h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">Manage your application preferences</p>
        </div>

        <div className="bg-white dark:bg-cocoa-800 rounded-lg shadow-sm p-12 border border-cocoa-200 dark:border-cocoa-700">
          <div className="text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h2 className="text-2xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">Settings Coming Soon</h2>
            <p className="text-cocoa-600 dark:text-cocoa-300 mb-4">
              Settings and preferences management is under development.
            </p>
            <p className="text-sm text-cocoa-500 dark:text-cocoa-400">
              Check back soon for user preferences, notifications, and more.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
