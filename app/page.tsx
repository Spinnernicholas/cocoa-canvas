import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Marshmallow from '@/components/Marshmallow';

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative Marshmallows */}
      <div className="hidden dark:block fixed top-10 left-[5%] opacity-40 animate-bounce" style={{ animationDuration: '3s' }}>
        <Marshmallow size={50} />
      </div>
      <div className="hidden dark:block fixed top-32 right-[8%] opacity-40 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
        <Marshmallow size={45} />
      </div>
      <div className="hidden dark:block fixed top-[20%] left-[15%] opacity-40 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
        <Marshmallow size={35} />
      </div>
      <div className="hidden dark:block fixed top-[40%] right-[12%] opacity-40 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }}>
        <Marshmallow size={48} />
      </div>
      <div className="hidden dark:block fixed bottom-[30%] left-[8%] opacity-40 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.8s' }}>
        <Marshmallow size={38} />
      </div>
      <div className="hidden dark:block fixed bottom-[15%] right-[18%] opacity-40 animate-bounce" style={{ animationDuration: '4.2s', animationDelay: '2s' }}>
        <Marshmallow size={52} />
      </div>
      
      {/* Header */}
      <header className="border-b border-cocoa-200 dark:border-cocoa-700 bg-cream-50 dark:bg-cocoa-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cocoa-600 to-cinnamon-600 dark:from-cocoa-400 dark:to-cinnamon-400">
                Cocoa Canvas
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-cocoa-700 dark:text-cream-100 hover:text-cocoa-900 dark:hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/setup"
                className="px-4 py-2 text-sm font-medium text-white bg-cocoa-600 hover:bg-cocoa-700 dark:bg-cinnamon-600 dark:hover:bg-cinnamon-700 rounded-lg transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
                <span className="block text-cocoa-900 dark:text-cream-50">
                  Open-Source
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cocoa-600 to-cinnamon-600 dark:from-cocoa-300 dark:to-cinnamon-400">
                  Voter Database Platform
                </span>
              </h2>
              <p className="max-w-2xl mx-auto text-xl text-cocoa-600 dark:text-cocoa-300 mb-10">
                Empower your campaign with modern tools for voter engagement, canvassing coordination, and data management. 
                Complete control over your data. Free and open-source.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/setup"
                  className="px-8 py-3 text-base font-medium text-white bg-cocoa-600 hover:bg-cocoa-700 dark:bg-cinnamon-600 dark:hover:bg-cinnamon-700 rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started
                </Link>
                <a
                  href="https://github.com/Spinnernicholas/cocoa-canvas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 text-base font-medium text-cocoa-700 dark:text-cream-100 bg-cocoa-100 dark:bg-cocoa-800 hover:bg-cocoa-200 dark:hover:bg-cocoa-700 rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 blur-3xl opacity-20 dark:opacity-10">
              <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-cocoa-400 to-cinnamon-400 dark:from-cocoa-600 dark:to-cinnamon-600" />
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-cocoa-50 dark:bg-cocoa-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">
                Everything you need to run a successful campaign
              </h3>
              <p className="text-lg text-cocoa-600 dark:text-cocoa-300">
                Built for transparency, privacy, and ease of use
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-cream-50 dark:bg-cocoa-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-cocoa-200 dark:border-cocoa-700">
                <div className="w-12 h-12 bg-cocoa-100 dark:bg-cocoa-900/50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cocoa-700 dark:text-cocoa-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                  Voter Database
                </h4>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Import, search, and manage voter records with powerful filtering and segmentation tools.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-cream-50 dark:bg-cocoa-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-cocoa-200 dark:border-cocoa-700">
                <div className="w-12 h-12 bg-cinnamon-100 dark:bg-cinnamon-900/30 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cinnamon-600 dark:text-cinnamon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                  Interactive Maps
                </h4>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Visualize voter locations, precincts, and territories on interactive maps powered by Leaflet.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-cream-50 dark:bg-cocoa-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-cocoa-200 dark:border-cocoa-700">
                <div className="w-12 h-12 bg-cocoa-200 dark:bg-cocoa-700/50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cocoa-700 dark:text-cocoa-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                  Canvassing Tools
                </h4>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Coordinate field operations, assign territories, and track canvasser progress in real-time.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-cream-50 dark:bg-cocoa-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-cocoa-200 dark:border-cocoa-700">
                <div className="w-12 h-12 bg-cinnamon-100 dark:bg-cinnamon-900/30 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cinnamon-600 dark:text-cinnamon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                  Data Import/Export
                </h4>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Upload voter files with validation and full audit trails. Export data for analysis anytime.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-cream-50 dark:bg-cocoa-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-cocoa-200 dark:border-cocoa-700">
                <div className="w-12 h-12 bg-cocoa-200 dark:bg-cocoa-700/50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cocoa-700 dark:text-cocoa-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                  Privacy First
                </h4>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Role-based access control, encrypted data, and comprehensive audit logging for compliance.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-cream-50 dark:bg-cocoa-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-cocoa-200 dark:border-cocoa-700">
                <div className="w-12 h-12 bg-cinnamon-100 dark:bg-cinnamon-900/30 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cinnamon-600 dark:text-cinnamon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-cocoa-900 dark:text-cream-50 mb-2">
                  Open Source
                </h4>
                <p className="text-cocoa-600 dark:text-cocoa-300">
                  Free to use, modify, and deploy. No vendor lock-in. Full transparency and community support.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold text-cocoa-900 dark:text-cream-50 mb-4">
              Ready to get started?
            </h3>
            <p className="text-lg text-cocoa-600 dark:text-cocoa-300 mb-8">
              Set up your campaign in minutes. No credit card required.
            </p>
            <Link
              href="/setup"
              className="inline-block px-8 py-3 text-base font-medium text-white bg-cocoa-600 hover:bg-cocoa-700 dark:bg-cinnamon-600 dark:hover:bg-cinnamon-700 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Create Your Campaign
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-cocoa-200 dark:border-cocoa-700 bg-cocoa-50 dark:bg-cocoa-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cocoa-600 to-cinnamon-600 dark:from-cocoa-400 dark:to-cinnamon-400 mb-4">
                Cocoa Canvas
              </h4>
              <p className="text-cocoa-600 dark:text-cocoa-300 mb-4">
                Open-source voter database and canvassing platform for political campaigns and community organizations.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Resources</h5>
              <ul className="space-y-2">
                <li>
                  <a href="https://github.com/Spinnernicholas/cocoa-canvas" target="_blank" rel="noopener noreferrer" className="text-cocoa-600 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cream-50 transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="https://github.com/Spinnernicholas/cocoa-canvas/issues" target="_blank" rel="noopener noreferrer" className="text-cocoa-600 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cream-50 transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-cocoa-900 dark:text-cream-50 mb-4">Project</h5>
              <ul className="space-y-2">
                <li>
                  <a href="https://github.com/Spinnernicholas/cocoa-canvas" target="_blank" rel="noopener noreferrer" className="text-cocoa-600 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cream-50 transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://github.com/Spinnernicholas/cocoa-canvas/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-cocoa-600 dark:text-cocoa-300 hover:text-cocoa-900 dark:hover:text-cream-50 transition-colors">
                    License
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-cocoa-200 dark:border-cocoa-700">
            <p className="text-center text-cocoa-600 dark:text-cocoa-300 text-sm">
              © 2026 Cocoa Canvas. Open source under MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
