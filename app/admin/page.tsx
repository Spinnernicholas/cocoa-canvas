'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Marshmallow from '@/components/Marshmallow';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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

  if (!user) return null;

  const adminCategories = [
    {
      title: 'Option Groups',
      description: 'Manage customizable lists like parties, location types, and other reference data',
      icon: '📋',
      route: '/admin/option-groups',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: '👥',
      route: '/admin/users',
      color: 'from-purple-500 to-purple-600',
      disabled: true,
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings and preferences',
      icon: '⚙️',
      route: '/admin/settings',
      color: 'from-green-500 to-green-600',
      disabled: true,
    },
    {
      title: 'Import Configuration',
      description: 'Configure voter file import formats and mappings',
      icon: '📥',
      route: '/admin/import-config',
      color: 'from-orange-500 to-orange-600',
      disabled: true,
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and audit trails',
      icon: '📊',
      route: '/admin/audit',
      color: 'from-indigo-500 to-indigo-600',
      disabled: true,
    },
    {
      title: 'Database Maintenance',
      description: 'Database backup, cleanup, and maintenance tasks',
      icon: '🗄️',
      route: '/admin/database',
      color: 'from-red-500 to-red-600',
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cocoa-900 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-20 right-[8%] opacity-30">
        <Marshmallow size={40} animationDuration="4.2s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed bottom-32 left-[12%] opacity-25">
        <Marshmallow size={42} animationDuration="3.6s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] left-[8%] opacity-30">
        <Marshmallow size={43} animationDuration="4s" animationDelay="0.8s" />
      </div>
      <div className="hidden dark:block fixed top-[55%] right-[15%] opacity-30">
        <Marshmallow size={44} animationDuration="3.8s" animationDelay="1.3s" />
      </div>
      <div className="hidden dark:block fixed bottom-[45%] left-[18%] opacity-30">
        <Marshmallow size={45} animationDuration="4.3s" animationDelay="0.5s" />
      </div>
      <div className="hidden dark:block fixed top-[15%] left-[6%] opacity-30">
        <Marshmallow size={41} animationDuration="3.9s" animationDelay="1.6s" />
      </div>
      <div className="hidden dark:block fixed bottom-[20%] right-[10%] opacity-30">
        <Marshmallow size={42} animationDuration="4.1s" animationDelay="1.0s" />
      </div>

      <Header userName={user.name} />

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cocoa-900 dark:text-cream-50 mb-2">
            ⚙️ Administration
          </h1>
          <p className="text-cocoa-600 dark:text-cocoa-300">
            Manage system settings, configurations, and maintenance tasks
          </p>
        </div>

        {/* Admin Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminCategories.map((category) => (
            <button
              key={category.route}
              onClick={() => !category.disabled && router.push(category.route)}
              disabled={category.disabled}
              className={`relative bg-white dark:bg-cocoa-800 rounded-lg shadow-sm border border-cocoa-200 dark:border-cocoa-700 p-6 text-left transition-all ${
                category.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md hover:scale-105 cursor-pointer'
              }`}
            >
              {/* Icon and Title */}
              <div className="flex items-start gap-4 mb-3">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${category.color} text-white text-2xl`}>
                  {category.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-cocoa-900 dark:text-cream-50 mb-1">
                    {category.title}
                  </h2>
                  {category.disabled && (
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-cocoa-600 dark:text-cocoa-300">
                {category.description}
              </p>

              {/* Arrow indicator */}
              {!category.disabled && (
                <div className="absolute bottom-4 right-4 text-cocoa-400 dark:text-cocoa-500">
                  →
                </div>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
