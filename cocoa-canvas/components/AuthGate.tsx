'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const publicRoutes = ['/login', '/setup'];

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') {
    return true;
  }

  return publicRoutes.some((route) => pathname.startsWith(route));
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  const publicRoute = useMemo(() => isPublicRoute(pathname), [pathname]);

  useEffect(() => {
    if (publicRoute) {
      setChecking(false);
      return;
    }

    setChecking(true);

    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user || !user.id || !user.email) {
        throw new Error('Invalid user payload');
      }
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }

    setChecking(false);
  }, [publicRoute, router]);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-cocoa-900 text-cocoa-700 dark:text-cocoa-200">
        <div className="text-center">
          <div className="inline-block w-5 h-5 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
