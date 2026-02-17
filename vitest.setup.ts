import '@testing-library/jest-dom/vitest';
import { afterAll, beforeAll, vi } from 'vitest';

process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.JWT_EXPIRY = '30m';
process.env.DATABASE_URL = 'file:./test.db';

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
