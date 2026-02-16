import { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Login - Cocoa Canvas',
  description: 'Sign in to Cocoa Canvas',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="text-5xl">🎨</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Cocoa Canvas</h1>
          <p className="text-gray-600 mt-2">Voter Database & Canvassing Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>
          
          <LoginForm />

          {/* Help text */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>First time? <a href="/setup" className="text-blue-600 hover:underline">Create admin account</a></p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            <a href="https://github.com/Spinnernicholas/cocoa-canvas" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Open source
            </a>
            {' | '}
            <a href="https://github.com/Spinnernicholas/cocoa-canvas/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Report issue
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
