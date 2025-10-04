/**
 * @fileoverview Tests for service proxy utilities
 *
 * This file tests the service proxy functionality including
 * retry logic, error handling, and response transformation.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import axios from 'axios';
import { ServiceProxy, aggregateServiceData, enrichData } from '../../src/utils/serviceProxy';
import { ServiceUnavailableError, TimeoutError } from '../../src/errors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ServiceProxy', () => {
  let serviceProxy: ServiceProxy;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    serviceProxy = new ServiceProxy('testService', {
      baseUrl: 'http://localhost:8080',
      timeout: 5000,
      retries: 2,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8080',
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Test' },
        status: 200,
        headers: { 'content-type': 'application/json' },
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await serviceProxy.get('/api/test', { param: 'value' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'get',
        url: '/api/test',
        params: { param: 'value' },
        timeout: 5000,
        data: undefined,
      });

      expect(result).toEqual({
        data: mockResponse.data,
        status: mockResponse.status,
        headers: mockResponse.headers,
        responseTime: expect.any(Number),
      });
    });

    it('should retry on server errors', async () => {
      const serverError = {
        status: 500,
        message: 'Internal Server Error',
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({
          data: { success: true },
          status: 200,
          headers: {},
        });

      const result = await serviceProxy.get('/api/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
      expect(result.data).toEqual({ success: true });
    });

    it('should not retry on client errors', async () => {
      const clientError = {
        status: 400,
        message: 'Bad Request',
      };

      mockAxiosInstance.request.mockRejectedValue(clientError);

      await expect(serviceProxy.get('/api/test')).rejects.toThrow();
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const networkError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      mockAxiosInstance.request.mockRejectedValue(networkError);

      await expect(serviceProxy.get('/api/test')).rejects.toMatchObject({
        message: expect.stringContaining('testService is unavailable'),
        isNetworkError: true,
        status: 503,
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout',
      };

      mockAxiosInstance.request.mockRejectedValue(timeoutError);

      await expect(serviceProxy.get('/api/test')).rejects.toMatchObject({
        message: expect.stringContaining('timed out'),
        isTimeout: true,
        status: 504,
      });
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Created' },
        status: 201,
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await serviceProxy.post('/api/test', { name: 'Test' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'post',
        url: '/api/test',
        data: { name: 'Test' },
        timeout: 5000,
        params: undefined,
      });

      expect(result.status).toBe(201);
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Updated' },
        status: 200,
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await serviceProxy.put('/api/test/1', { name: 'Updated' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'put',
        url: '/api/test/1',
        data: { name: 'Updated' },
        timeout: 5000,
        params: undefined,
      });

      expect(result.data.name).toBe('Updated');
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      const mockResponse = {
        data: null,
        status: 200,
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await serviceProxy.delete('/api/test/1');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'delete',
        url: '/api/test/1',
        timeout: 5000,
        data: undefined,
        params: undefined,
      });

      expect(result.status).toBe(200);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status on successful health check', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await serviceProxy.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        responseTime: expect.any(Number),
      });
    });

    it('should return unhealthy status on failed health check', async () => {
      const error = new Error('Service unavailable');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await serviceProxy.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Service unavailable',
      });
    });
  });
});

describe('aggregateServiceData', () => {
  it('should aggregate data from multiple services', async () => {
    const mockService1 = {
      get: jest.fn().mockResolvedValue({ data: { items: [1, 2, 3] } }),
    };

    const mockService2 = {
      get: jest.fn().mockResolvedValue({ data: { metadata: { total: 3 } } }),
    };

    const requests = [
      {
        service: mockService1 as any,
        path: '/api/items',
        params: { page: 1 },
        key: 'items',
      },
      {
        service: mockService2 as any,
        path: '/api/metadata',
        key: 'metadata',
      },
    ];

    const result = await aggregateServiceData(requests);

    expect(result).toEqual({
      items: { items: [1, 2, 3] },
      metadata: { metadata: { total: 3 } },
    });
  });

  it('should handle service failures gracefully', async () => {
    const mockService1 = {
      get: jest.fn().mockResolvedValue({ data: { items: [1, 2, 3] } }),
    };

    const mockService2 = {
      get: jest.fn().mockRejectedValue(new Error('Service unavailable')),
    };

    const requests = [
      {
        service: mockService1 as any,
        path: '/api/items',
        key: 'items',
      },
      {
        service: mockService2 as any,
        path: '/api/metadata',
        key: 'metadata',
      },
    ];

    const result = await aggregateServiceData(requests);

    expect(result).toEqual({
      items: { items: [1, 2, 3] },
      metadata: null,
    });
  });
});

describe('enrichData', () => {
  it('should enrich base data with additional information', async () => {
    const baseData = { id: 1, name: 'Test Item' };

    const mockService1 = {
      get: jest.fn().mockResolvedValue({ data: { description: 'Test description' } }),
    };

    const mockService2 = {
      get: jest.fn().mockResolvedValue({ data: { views: 100 } }),
    };

    const enrichments = [
      {
        service: mockService1 as any,
        path: '/api/descriptions/1',
        key: 'description' as keyof typeof baseData,
      },
      {
        service: mockService2 as any,
        path: '/api/analytics/1',
        key: 'analytics' as keyof typeof baseData,
      },
    ];

    const result = await enrichData(baseData, enrichments);

    expect(result).toEqual({
      id: 1,
      name: 'Test Item',
      description: { description: 'Test description' },
      analytics: { views: 100 },
    });
  });

  it('should handle enrichment failures gracefully', async () => {
    const baseData = { id: 1, name: 'Test Item' };

    const mockService1 = {
      get: jest.fn().mockResolvedValue({ data: { description: 'Test description' } }),
    };

    const mockService2 = {
      get: jest.fn().mockRejectedValue(new Error('Analytics service unavailable')),
    };

    const enrichments = [
      {
        service: mockService1 as any,
        path: '/api/descriptions/1',
        key: 'description' as keyof typeof baseData,
      },
      {
        service: mockService2 as any,
        path: '/api/analytics/1',
        key: 'analytics' as keyof typeof baseData,
      },
    ];

    const result = await enrichData(baseData, enrichments);

    expect(result).toEqual({
      id: 1,
      name: 'Test Item',
      description: { description: 'Test description' },
      analytics: null,
    });
  });
});