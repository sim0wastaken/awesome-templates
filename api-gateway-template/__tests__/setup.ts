/**
 * @fileoverview Test setup configuration
 *
 * This file configures the testing environment for the API Gateway template.
 * It sets up global test utilities, mocks, and environment configuration.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Mock console methods but allow them to be restored
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test timeout
jest.setTimeout(10000);

// Mock service responses for testing
export const mockServiceResponse = {
  success: true,
  data: { id: 1, name: 'Test Item' },
  timestamp: new Date().toISOString(),
};

export const mockErrorResponse = {
  success: false,
  error: {
    code: 'TEST_ERROR',
    message: 'Test error message',
  },
  timestamp: new Date().toISOString(),
};

// Helper function to create mock service proxy
export const createMockServiceProxy = () => ({
  get: jest.fn().mockResolvedValue({ data: mockServiceResponse.data, status: 200 }),
  post: jest.fn().mockResolvedValue({ data: mockServiceResponse.data, status: 201 }),
  put: jest.fn().mockResolvedValue({ data: mockServiceResponse.data, status: 200 }),
  delete: jest.fn().mockResolvedValue({ data: null, status: 200 }),
  patch: jest.fn().mockResolvedValue({ data: mockServiceResponse.data, status: 200 }),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 100 }),
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toBeValidErrorResponse(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidApiResponse(received) {
    const pass = 
      typeof received === 'object' &&
      received !== null &&
      typeof received.success === 'boolean' &&
      typeof received.timestamp === 'string' &&
      (received.success ? 'data' in received : 'error' in received);

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid API response`,
        pass: false,
      };
    }
  },

  toBeValidErrorResponse(received) {
    const pass = 
      typeof received === 'object' &&
      received !== null &&
      received.success === false &&
      typeof received.error === 'object' &&
      typeof received.error.code === 'string' &&
      typeof received.error.message === 'string' &&
      typeof received.timestamp === 'string';

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid error response`,
        pass: false,
      };
    }
  },
});