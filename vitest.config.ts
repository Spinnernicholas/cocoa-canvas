import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    environmentMatchGlobs: [['**/app/api/**/*.test.ts', 'node']],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['lib/**/*.{ts,tsx}', 'app/api/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/node_modules/**', '**/.next/**'],
    },
  },
});
