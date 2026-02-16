/**
 * Server instrumentation hook
 * Runs once when the server starts
 */

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Import the database initialization function
      const { ensureDatabaseInitialized } = await import('@/lib/db/init');
      const { performAutoSetup, isSetupNeeded } = await import('@/lib/auth/auto-setup');

      console.log('[Startup] Initializing database...');
      
      // Ensure database is initialized
      const dbInitialized = await ensureDatabaseInitialized();
      
      if (dbInitialized) {
        console.log('[Startup] Database initialized successfully');
        
        // Check if setup is needed and attempt auto-setup
        const setupNeeded = await isSetupNeeded();
        if (setupNeeded) {
          console.log('[Startup] Setup required, attempting auto-setup...');
          const result = await performAutoSetup();
          if (result.completed) {
            console.log('[Startup] Auto-setup completed successfully');
          } else if (!result.message.includes('Auto-setup disabled')) {
            console.log('[Startup] Auto-setup not completed:', result.message);
          }
        } else {
          console.log('[Startup] Setup already completed');
        }
      } else {
        console.warn('[Startup] Database initialization failed');
      }
    } catch (error) {
      console.error('[Startup] Error during initialization:', error);
      // Don't crash the server on startup errors
    }
  }
}
