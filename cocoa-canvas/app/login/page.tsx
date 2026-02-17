import { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';
import ThemeToggle from '@/components/ThemeToggle';
import Marshmallow from '@/components/Marshmallow';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login - Cocoa Canvas',
  description: 'Sign in to Cocoa Canvas',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 to-cocoa-100 dark:from-cocoa-900 dark:to-cocoa-800 px-4 relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-20 left-[10%] opacity-40">
        <Marshmallow size={40} animationDuration="3.5s" animationDelay="0s" />
      </div>
      <div className="hidden dark:block fixed top-[30%] right-[15%] opacity-40">
        <Marshmallow size={42} animationDuration="4s" animationDelay="1s" />
      </div>
      <div className="hidden dark:block fixed bottom-[25%] left-[12%] opacity-40">
        <Marshmallow size={43} animationDuration="4.5s" animationDelay="1.5s" />
      </div>
      <div className="hidden dark:block fixed bottom-20 right-[10%] opacity-40">
        <Marshmallow size={44} animationDuration="3.8s" animationDelay="0.5s" />
      </div>
      <div className="hidden dark:block fixed top-[50%] left-[5%] opacity-40">
        <Marshmallow size={45} animationDuration="4.2s" animationDelay="0.8s" />
      </div>
      <div className="hidden dark:block fixed top-[65%] right-[8%] opacity-40">
        <Marshmallow size={41} animationDuration="3.6s" animationDelay="1.8s" />
      </div>
      <div className="hidden dark:block fixed bottom-[45%] right-[20%] opacity-40">
        <Marshmallow size={40} animationDuration="4.3s" animationDelay="1.2s" />
      </div>
      
      {/* Theme Toggle - Positioned at top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <div className="text-5xl">🎨</div>
          </Link>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Cocoa Canvas</h1>
          <p className="text-gray-700 dark:text-gray-300 mt-2">Voter Database & Canvassing Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-cream-50 dark:bg-cocoa-800 rounded-lg shadow-lg p-8 border border-cocoa-200 dark:border-cocoa-700">
          <h2 className="text-2xl font-bold text-cocoa-900 dark:text-cream-50 mb-6">Sign In</h2>
          
          <LoginForm />

          {/* Help text */}
          <div className="mt-6 text-center text-sm text-cocoa-600 dark:text-cocoa-300">
            <p>First time? <Link href="/setup" className="text-cocoa-700 dark:text-cinnamon-400 hover:underline font-medium">Create admin account</Link></p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-cocoa-600 dark:text-cocoa-300">
          <p>
            <a href="https://github.com/Spinnernicholas/cocoa-canvas" target="_blank" rel="noopener noreferrer" className="text-cocoa-700 dark:text-cinnamon-400 hover:underline">
              Open source
            </a>
            {' | '}
            <a href="https://github.com/Spinnernicholas/cocoa-canvas/issues" target="_blank" rel="noopener noreferrer" className="text-cocoa-700 dark:text-cinnamon-400 hover:underline">
              Report issue
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
