// Test setup file
require('dotenv').config();

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
// Use existing database for tests (we'll clean up data)
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'jobsearch';

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

