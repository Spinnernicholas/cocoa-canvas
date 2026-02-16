import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.JWT_EXPIRY = '30m';
process.env.DATABASE_URL = 'file:./test.db';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Suppress console.error for expected errors during test runs
const originalError = console.error;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Filter out specific expected errors
    const message = args[0]?.toString?.() || '';
    if (
      message.includes('DB error') ||
      message.includes('[') // Skip logs that start with brackets
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
});
