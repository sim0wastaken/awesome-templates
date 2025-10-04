/**
 * @fileoverview Tests for example routes
 *
 * This file demonstrates how to test API Gateway routes including
 * service integration, error handling, and response validation.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../../src/index';
import { createMockServiceProxy, mockServiceResponse } from '../setup';

// Mock the service proxy module
jest.mock('../../src/utils/serviceProxy', () => ({
  createServiceProxies: jest.fn(() => ({
    serviceA: createMockServiceProxy(),
    serviceB: createMockServiceProxy(),
    serviceC: createMockServiceProxy(),
  })),
  aggregateServiceData: jest.fn(),
  enrichData: jest.fn(),
  formatSuccessResponse: jest.fn((data) => ({ success: true, data })),
  formatErrorResponse: jest.fn((error) => ({ success: false, error })),
}));

describe('Example Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/example', () => {
    it('should return list of items successfully', async () => {
      const { aggregateServiceData } = await import('../../src/utils/serviceProxy');
      (aggregateServiceData as jest.Mock).mockResolvedValue({
        primaryItems: {
          items: [{ id: 1, name: 'Test Item 1' }, { id: 2, name: 'Test Item 2' }],
          total: 2,
        },
        metadata: { category: 'test' },
      });

      const response = await request(app)
        .get('/api/example')
        .query({ page: 1, limit: 20 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeValidApiResponse();
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.aggregatedFrom).toEqual(['serviceA', 'serviceB']);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/example')
        .query({ page: 0, limit: 200 }) // Invalid values
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toBeValidErrorResponse();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors gracefully', async () => {
      const { aggregateServiceData } = await import('../../src/utils/serviceProxy');
      (aggregateServiceData as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/example')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toBeValidErrorResponse();
    });
  });

  describe('GET /api/example/:id', () => {
    it('should return item details with enriched data', async () => {
      const { enrichData } = await import('../../src/utils/serviceProxy');
      const mockEnrichedItem = {
        id: 1,
        name: 'Test Item',
        relatedData: { count: 5 },
        analytics: { views: 100 },
      };
      
      (enrichData as jest.Mock).mockResolvedValue(mockEnrichedItem);

      const response = await request(app)
        .get('/api/example/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeValidApiResponse();
      expect(response.body.data).toEqual(mockEnrichedItem);
    });

    it('should validate ID parameter', async () => {
      const response = await request(app)
        .get('/api/example/invalid-id')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toBeValidErrorResponse();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle 404 when item not found', async () => {
      const mockServiceProxies = await import('../../src/utils/serviceProxy');
      const serviceProxies = (mockServiceProxies.createServiceProxies as jest.Mock)();
      
      const notFoundError = new Error('Not found');
      (notFoundError as any).status = 404;
      serviceProxies.serviceA.get.mockRejectedValue(notFoundError);

      const response = await request(app)
        .get('/api/example/999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toBeValidErrorResponse();
    });
  });

  describe('POST /api/example', () => {
    it('should create item successfully', async () => {
      const mockServiceProxies = await import('../../src/utils/serviceProxy');
      const serviceProxies = (mockServiceProxies.createServiceProxies as jest.Mock)();
      
      const createdItem = { id: 1, name: 'New Item', category: 'typeA' };
      serviceProxies.serviceA.post.mockResolvedValue({ data: createdItem, status: 201 });

      const response = await request(app)
        .post('/api/example')
        .send({
          name: 'New Item',
          description: 'Test description',
          category: 'typeA',
          tags: ['test', 'example'],
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toBeValidApiResponse();
      expect(response.body.data).toEqual(createdItem);
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/example')
        .send({
          name: 'A', // Too short
          category: 'invalid', // Invalid enum value
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toBeValidErrorResponse();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require name and category fields', async () => {
      const response = await request(app)
        .post('/api/example')
        .send({
          description: 'Missing required fields',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toBeValidErrorResponse();
    });
  });

  describe('PUT /api/example/:id', () => {
    it('should update item successfully', async () => {
      const mockServiceProxies = await import('../../src/utils/serviceProxy');
      const serviceProxies = (mockServiceProxies.createServiceProxies as jest.Mock)();
      
      const updatedItem = { id: 1, name: 'Updated Item', category: 'typeB' };
      serviceProxies.serviceA.put.mockResolvedValue({ data: updatedItem, status: 200 });

      const response = await request(app)
        .put('/api/example/1')
        .send({
          name: 'Updated Item',
          category: 'typeB',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeValidApiResponse();
      expect(response.body.data).toEqual(updatedItem);
    });

    it('should allow partial updates', async () => {
      const mockServiceProxies = await import('../../src/utils/serviceProxy');
      const serviceProxies = (mockServiceProxies.createServiceProxies as jest.Mock)();
      
      const updatedItem = { id: 1, name: 'Updated Name' };
      serviceProxies.serviceA.put.mockResolvedValue({ data: updatedItem, status: 200 });

      const response = await request(app)
        .put('/api/example/1')
        .send({
          name: 'Updated Name',
          // Only updating name, not category
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeValidApiResponse();
    });
  });

  describe('DELETE /api/example/:id', () => {
    it('should delete item successfully', async () => {
      const mockServiceProxies = await import('../../src/utils/serviceProxy');
      const serviceProxies = (mockServiceProxies.createServiceProxies as jest.Mock)();
      
      serviceProxies.serviceA.delete.mockResolvedValue({ data: null, status: 200 });

      const response = await request(app)
        .delete('/api/example/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeValidApiResponse();
      expect(response.body.data).toBeNull();
    });

    it('should handle deletion of non-existent item', async () => {
      const mockServiceProxies = await import('../../src/utils/serviceProxy');
      const serviceProxies = (mockServiceProxies.createServiceProxies as jest.Mock)();
      
      const notFoundError = new Error('Not found');
      (notFoundError as any).status = 404;
      serviceProxies.serviceA.delete.mockRejectedValue(notFoundError);

      const response = await request(app)
        .delete('/api/example/999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toBeValidErrorResponse();
    });
  });
});