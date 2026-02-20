import '@testing-library/jest-dom/vitest';
import { afterAll, beforeAll, vi } from 'vitest';
import { checkTestServices } from './lib/testing/service-check';

process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.JWT_EXPIRY = '30m';

// Use test database URL from environment or default
// This is set in vitest.config.ts for integration tests
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/cocoa_canvas_test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6380';
}

vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const originalError = console.error;

beforeAll(() => {
  console.error = vi.fn((...args) => {
    const message = args[0]?.toString?.() || '';
    if (message.includes('DB error') || message.includes('[')) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
});
