'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const publicRoutes = ['/login', '/setup'];

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') {
    return true;
  }

  return publicRoutes.some((route) => pathname.startsWith(route));
}

function isProtectedApiRequest(input: RequestInfo | URL): boolean {
  const requestUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  const parsed = new URL(requestUrl, window.location.origin);

  if (!parsed.pathname.startsWith('/api/v1')) {
    return false;
  }

  if (parsed.pathname.startsWith('/api/v1/auth/login')) {
    return false;
  }

  return true;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const isHandlingUnauthorized = useRef(false);

  const publicRoute = useMemo(() => isPublicRoute(pathname), [pathname]);

  const forceLogout = useCallback(() => {
    if (isHandlingUnauthorized.current) {
      return;
    }

    isHandlingUnauthorized.current = true;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    if (window.location.pathname !== '/login') {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (publicRoute) {
      setChecking(false);
      return;
    }

    setChecking(true);

    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      forceLogout();
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user || !user.id || !user.email) {
        throw new Error('Invalid user payload');
      }
    } catch {
      forceLogout();
      return;
    }

    setChecking(false);
  }, [forceLogout, publicRoute]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);

      if (response.status === 401 && isProtectedApiRequest(input)) {
        forceLogout();
        return new Promise<Response>(() => {});
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [forceLogout]);

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
