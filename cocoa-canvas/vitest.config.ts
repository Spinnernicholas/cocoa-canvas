import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vite';

const viteConfig = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

const vitestConfig = {
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    environmentMatchGlobs: [
      ['**/app/api/**/*.test.ts', 'node'],
      ['**/app/api/**/*.integration.test.ts', 'node'],
    ],
    include: ['**/*.test.{ts,tsx}', '**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['lib/**/*.{ts,tsx}', 'app/api/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/node_modules/**', '**/.next/**'],
    },
    // Test database configuration
    // Override in CI or locally as needed
    env: {
      // Use separate test database (runs on port 5433 in docker-compose.dev.yml)
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cocoa_canvas_test',
      REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6380',
      NODE_ENV: 'test',
      NEXTAUTH_SECRET: 'test-secret-key-for-testing-only-do-not-use-in-production',
      NEXTAUTH_URL: 'http://localhost:3000',
    },
  },
};

export default mergeConfig(viteConfig, vitestConfig);

