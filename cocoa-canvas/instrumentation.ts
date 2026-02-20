/**
 * Server instrumentation hook
 * Runs once when the server starts
 */

export async function register() {
  // Skip startup work in edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

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
        console.log('[Startup] Initializing BullMQ scheduler and workers...');
        const { initializeScheduler } = await import('@/lib/queue/scheduler');
        const { startWorkers } = await import('@/lib/queue/worker');

        let schedulerInitialized = false;
        let workersStarted = false;

        try {
          await initializeScheduler();
          schedulerInitialized = true;
        } catch (error) {
          console.error('[Startup] Failed to initialize BullMQ scheduler:', error);
        }

        try {
          await startWorkers();
          workersStarted = true;
        } catch (error) {
          console.error('[Startup] Failed to start BullMQ workers:', error);
        }

        try {
          const { recoverJobsOnStartup } = await import('@/lib/queue/recovery');
          const recoverySummary = await recoverJobsOnStartup();
          console.log('[Startup] Job recovery complete', recoverySummary);
        } catch (error) {
          console.error('[Startup] Failed to recover jobs on startup:', error);
        }

        if (schedulerInitialized || workersStarted) {
          console.log('[Startup] BullMQ startup complete', {
            schedulerInitialized,
            workersStarted,
          });
        } else {
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
