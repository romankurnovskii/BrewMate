// Jest setup file
// This file runs before each test file

// Mock Electron APIs for tests that don't need them
if (typeof global.window === 'undefined') {
  global.window = {};
}

// Suppress console.log in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
}
