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
        
        // Check if setup is needed
        const setupNeeded = await isSetupNeeded();
        
        // Only seed reference data during initial setup
        if (setupNeeded) {
          console.log('[Startup] Initial setup needed, seeding reference data...');
          try {
            const { seedLocations } = await import('./prisma/seeds/seed-locations');
            const { seedElectionTypes } = await import('./prisma/seeds/seed-election-types');
            const { seedDatasetTypes } = await import('./prisma/seeds/seed-dataset-types');
            
            await seedLocations();
            await seedElectionTypes();
            await seedDatasetTypes();
          } catch (error) {
            console.error('[Startup] Failed to seed reference data:', error);
          }
          
          // Attempt auto-setup
          console.log('[Startup] Attempting auto-setup...');
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

      // Initialize BullMQ scheduler and workers
      if (process.env.REDIS_URL) {
        try {
          console.log('[Startup] Initializing BullMQ scheduler and workers...');
          const { initializeScheduler, shutdownScheduler } = await import('@/lib/queue/scheduler');
          const { startWorkers, stopWorkers } = await import('@/lib/queue/worker');

          // Initialize the scheduler
          await initializeScheduler();

          // Start the workers
          await startWorkers();

          console.log('[Startup] BullMQ scheduler and workers initialized successfully');

          // Setup graceful shutdown
          process.on('SIGTERM', async () => {
            console.log('[Shutdown] SIGTERM received');
            await stopWorkers();
            await shutdownScheduler();
            process.exit(0);
          });

          process.on('SIGINT', async () => {
            console.log('[Shutdown] SIGINT received');
            await stopWorkers();
            await shutdownScheduler();
            process.exit(0);
          });
        } catch (error) {
          console.error('[Startup] Failed to initialize BullMQ:', error);
          console.log('[Startup] Continuing without Redis features...');
        }
      } else {
        console.warn('[Startup] REDIS_URL not set, BullMQ features disabled');
      }
    } catch (error) {
      console.error('[Startup] Error during initialization:', error);
      // Don't crash the server on startup errors
    }
  }
}
