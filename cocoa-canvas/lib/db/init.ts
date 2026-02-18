import { prisma } from '@/lib/prisma';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Check if database is initialized by trying to query a table
 */
async function isDatabaseInitialized(): Promise<boolean> {
  try {
    // Try to query the User table
    await prisma.user.count();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize the database if it doesn't exist
 * Runs Prisma db push to set up schema
 */
export async function initializeDatabase(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    // Check if already initialized
    const isInitialized = await isDatabaseInitialized();
    if (isInitialized) {
      return {
        success: true,
        message: 'Database is already initialized',
      };
    }

    console.log('[DB Init] Database not initialized, attempting to set up...');

    // Run prisma db push to initialize the schema
    // We need to do this in a way that works in both dev and production
    try {
      execSync('npx prisma db push --config ./prisma.config.ts', {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env },
      });
      console.log('[DB Init] Database successfully initialized');
      return {
        success: true,
        message: 'Database initialized successfully',
      };
    } catch (execError) {
      // If direct exec fails, return error for PostgreSQL
      console.error('[DB Init] execSync failed', execError);
      
      return {
        success: false,
        message: 'Failed to initialize database',
        error: 'Database initialization requires running: npx prisma db push',
      };
    }
  } catch (error) {
    console.error('[DB Init Error]', error);
    return {
      success: false,
      message: 'Database initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ensure database is initialized (call once on app startup)
 */
let initAttempted = false;
let initSucceeded = false;

export async function ensureDatabaseInitialized(): Promise<boolean> {
  // Only attempt once per application lifecycle
  if (initAttempted) {
    return initSucceeded;
  }

  initAttempted = true;

  try {
    const result = await initializeDatabase();
    initSucceeded = result.success;

    if (!result.success) {
      console.warn('[DB Init] Warning:', result.message);
      if (result.error) {
        console.warn('[DB Init] Error details:', result.error);
      }
    }

    return initSucceeded;
  } catch (error) {
    console.error('[DB Init] Unexpected error during initialization', error);
    return false;
  }
}
