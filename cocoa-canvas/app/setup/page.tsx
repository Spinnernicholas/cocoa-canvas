'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Marshmallow from '@/components/Marshmallow';

interface SetupStatus {
  setupNeeded: boolean;
  autoSetupAvailable: boolean;
}

export default function SetupPage() {
  const router = useRouter();
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  // Check setup status on mount
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        const setupNeeded = data.setup?.needed ?? true;
        const autoSetupCompleted = data.setup?.autoSetupCompleted ?? false;

        // If setup was already completed (including via auto-setup), redirect
        if (!setupNeeded || autoSetupCompleted) {
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }

        // Check if auto-setup is available
        const statusResponse = await fetch('/api/v1/auth/auto-setup');
        const statusData = await statusResponse.json();
        
        setSetupStatus({
          setupNeeded: true,
          autoSetupAvailable: statusData.completed === false && statusResponse.ok,
        });

        if (statusData.completed === false && statusData.message?.includes('configured')) {
          setInfo('Auto-setup is available. If you have set the admin environment variables, the system will automatically create the admin account.');
        }
      } catch (err) {
        console.error('[Setup Status Check Error]', err);
        setSetupStatus({
          setupNeeded: true,
          autoSetupAvailable: false,
        });
      }
    };

    checkSetupStatus();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.passwordConfirm) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Validate password length
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      // Call setup endpoint
      const response = await fetch('/api/v1/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          name: formData.name || 'Admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Setup failed');
        setLoading(false);
        return;
      }

      // Save token to localStorage
      localStorage.setItem('authToken', data.token);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred during setup');
      console.error('[Setup Error]', err);
      setLoading(false);
    }
  };

  // Show loading state while checking status
  if (setupStatus === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 to-cocoa-100 dark:from-cocoa-900 dark:to-cocoa-800">
        <div className="text-center">
          <div className="text-4xl mb-4">🍫</div>
          <p className="text-cocoa-600 dark:text-cocoa-300">Initializing...</p>
        </div>
      </div>
    );
  }

  // If setup is not needed, show redirect message
  if (!setupStatus.setupNeeded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 to-cocoa-100 dark:from-cocoa-900 dark:to-cocoa-800 px-4">
        <div className="max-w-md bg-cream-50 dark:bg-cocoa-800 rounded-lg shadow-lg p-8 border border-cocoa-200 dark:border-cocoa-700 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-cocoa-600 dark:text-cocoa-300 mb-4">Setup Complete</h2>
          <p className="text-cocoa-600 dark:text-cocoa-300 mb-6">
            Your application has been initialized successfully!
          </p>
          <p className="text-sm text-cocoa-500 dark:text-cocoa-400">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 to-cocoa-100 dark:from-cocoa-900 dark:to-cocoa-800 px-4 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-16 left-[8%] opacity-40">
        <Marshmallow size={40} animationDuration="3.2s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[35%] right-[10%] opacity-40">
        <Marshmallow size={42} animationDuration="4.2s" animationDelay="1.2s" />
      </div>
      <div className="hidden dark:block fixed bottom-[30%] left-[15%] opacity-40">
        <Marshmallow size={43} animationDuration="4s" animationDelay="0.8s" />
      </div>
      <div className="hidden dark:block fixed bottom-24 right-[12%] opacity-40">
        <Marshmallow size={44} animationDuration="3.6s" animationDelay="1.8s" />
      </div>
      <div className="hidden dark:block fixed top-[50%] left-[5%] opacity-40">
        <Marshmallow size={45} animationDuration="4.4s" animationDelay="0.4s" />
      </div>
      <div className="hidden dark:block fixed top-[65%] right-[18%] opacity-40">
        <Marshmallow size={41} animationDuration="3.8s" animationDelay="1.5s" />
      </div>
      <div className="hidden dark:block fixed bottom-[50%] left-[22%] opacity-40">
        <Marshmallow size={42} animationDuration="4.1s" animationDelay="0.6s" />
      </div>
      <div className="hidden dark:block fixed bottom-[15%] right-[7%] opacity-40">
        <Marshmallow size={40} animationDuration="3.9s" animationDelay="1.0s" />
      </div>
      
      {/* Theme Toggle - Positioned at top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-cream-50 dark:bg-cocoa-800 rounded-lg shadow-lg p-8 border border-cocoa-200 dark:border-cocoa-700">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-4xl mb-2">🍫</h1>
            </Link>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cocoa-600 to-cinnamon-600 dark:from-cocoa-400 dark:to-cinnamon-400">Cocoa Canvas</h2>
            <p className="text-cocoa-600 dark:text-cocoa-300 text-sm mt-2">Initial Setup Required</p>
          </div>

          {/* Instructions */}
          <div className="bg-cocoa-100 dark:bg-cocoa-900/40 border border-cocoa-300 dark:border-cocoa-700 rounded-md p-4 mb-6">
            <p className="text-sm text-cocoa-800 dark:text-cocoa-200">
              Create an admin account to get started. This is your first and only setup step.
            </p>
          </div>

          {/* Info Message */}
          {info && (
            <div className="bg-cocoa-50 dark:bg-cocoa-900/40 border border-cocoa-300 dark:border-cocoa-600 rounded-md p-3 mb-4">
              <p className="text-cocoa-700 dark:text-cocoa-300 text-sm">{info}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-cinnamon-100 dark:bg-cinnamon-900/30 border border-cinnamon-300 dark:border-cinnamon-800 rounded-md p-3 mb-4">
              <p className="text-cinnamon-800 dark:text-cinnamon-300 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-200 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 bg-cream-50 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-100 rounded-md focus:outline-none focus:ring-2 focus:ring-cocoa-500 dark:focus:ring-cinnamon-500 focus:border-transparent"
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-200 mb-1">
                Full Name (Optional)
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
                className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 bg-cream-50 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-100 rounded-md focus:outline-none focus:ring-2 focus:ring-cocoa-500 dark:focus:ring-cinnamon-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-200 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password (min 8 characters)"
                required
                className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 bg-cream-50 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-100 rounded-md focus:outline-none focus:ring-2 focus:ring-cocoa-500 dark:focus:ring-cinnamon-500 focus:border-transparent"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-cocoa-700 dark:text-cocoa-200 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                className="w-full px-4 py-2 border border-cocoa-300 dark:border-cocoa-600 bg-cream-50 dark:bg-cocoa-700 text-cocoa-900 dark:text-cream-100 rounded-md focus:outline-none focus:ring-2 focus:ring-cocoa-500 dark:focus:ring-cinnamon-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cocoa-600 hover:bg-cocoa-700 dark:bg-cinnamon-600 dark:hover:bg-cinnamon-700 disabled:bg-cocoa-400 dark:disabled:bg-cocoa-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Setting up...
                </>
              ) : (
                'Create Admin Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 font-medium">
              Sign in
            </Link>
          </p>

          {/* Support Links */}
          <div className="border-t border-cocoa-200 dark:border-cocoa-700 mt-6 pt-4">
            <p className="text-center text-xs text-cocoa-600 dark:text-cocoa-300 mb-3">Need help?</p>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/Spinnernicholas/cocoa-canvas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-center">
                📖 View Documentation
              </a>
              <a
                href="https://github.com/Spinnernicholas/cocoa-canvas/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cocoa-700 dark:text-cinnamon-400 hover:text-cocoa-900 dark:hover:text-cinnamon-300 text-center">
                🐛 Report Issue
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
