/**
 * @fileoverview Test setup configuration
 *
 * Global test setup for Jest including environment variables,
 * database connections, and common test utilities.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Setup test database connection if needed
  // await connectToTestDatabase();
});

// Global test teardown
afterAll(async () => {
  // Cleanup test database if needed
  // await disconnectFromTestDatabase();
});

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};