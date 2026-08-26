import '@testing-library/jest-dom'

// Mock ResizeObserver for React Flow
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Automatic cleanup for any benchmark/temp files (Rule 7 enforcement)
afterAll(() => {
  // If tests generated any temp files in a standard location, we would clean them up here.
  // For standard React component tests, no files are generated.
});

// Mock all lucide-react icons
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => 'Icon' }));

// Mock next/navigation for App Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock HTMLElement.scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();
