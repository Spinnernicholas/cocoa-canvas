'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  error?: string;
  message?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if setup is required on mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Try to login with a test (will fail, but tells us if setup is done)
        // Actually, let's try the setup endpoint to see if it's available
        const response = await fetch('/api/v1/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test', passwordConfirm: 'test' }),
        });

        const data = await response.json();
        
        // If we get a 400 saying "Setup is already complete", then setup is done
        // If we get 400 for other reasons or success, setup might be needed
        if (response.status === 400 && data.error?.includes('already complete')) {
          setSetupRequired(false);
        } else {
          // Setup might be needed or other error
          setSetupRequired(true);
        }
      } catch (err) {
        // Assume setup is done on error checking
        setSetupRequired(false);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetup();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      // Call login endpoint
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Send cookies
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="text-center py-4">
        <div className="inline-block w-5 h-5 border-2 border-cocoa-600 dark:border-cinnamon-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mt-2">Checking system status...</p>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-cocoa-700 dark:text-cocoa-200 font-medium">System Setup Required</p>
        <p className="text-cocoa-600 dark:text-cocoa-300 text-sm">
          This appears to be your first time. Please set up your admin account first.
        </p>
        <Link
          href="/setup"
          className="inline-block mt-4 px-4 py-2 bg-cocoa-600 hover:bg-cocoa-700 dark:bg-cinnamon-600 dark:hover:bg-cinnamon-700 text-white font-medium rounded-lg transition"
        >
          Go to Setup
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-200 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={loading}
          className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 bg-cream-50 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-100 rounded-lg focus:ring-2 focus:ring-cocoa-500 dark:focus:ring-cinnamon-500 focus:border-transparent outline-none transition disabled:bg-cocoa-100 dark:disabled:bg-cocoa-800 disabled:text-cocoa-500 dark:disabled:text-cocoa-500"
          required
        />
      </div>

      {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-200 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
          className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 bg-cream-50 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-100 rounded-lg focus:ring-2 focus:ring-cocoa-500 dark:focus:ring-cinnamon-500 focus:border-transparent outline-none transition disabled:bg-cocoa-100 dark:disabled:bg-cocoa-800 disabled:text-cocoa-500 dark:disabled:text-cocoa-500"
          required
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-cinnamon-100 dark:bg-cinnamon-900/30 border border-cinnamon-200 dark:border-cinnamon-800 rounded-lg text-cinnamon-800 dark:text-cinnamon-300 text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-cocoa-600 hover:bg-cocoa-700 dark:bg-cinnamon-600 dark:hover:bg-cinnamon-700 text-white font-medium rounded-lg transition disabled:bg-cocoa-400 dark:disabled:bg-cocoa-700 disabled:cursor-not-allowed">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}
