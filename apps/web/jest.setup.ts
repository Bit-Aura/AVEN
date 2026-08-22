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
