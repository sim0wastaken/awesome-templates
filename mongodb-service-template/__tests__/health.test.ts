/**
 * @fileoverview Health endpoint tests
 *
 * Tests for the health check and status endpoints to ensure
 * proper monitoring and service discovery functionality.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import request from 'supertest';
import { app } from '../src/index';

describe('Health Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'mongodb-service-template');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('environment');
    });

    it('should include database status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.database).toHaveProperty('status');
      expect(['connected', 'disconnected']).toContain(response.body.database.status);
    });

    it('should include memory usage', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('external');
    });
  });

  describe('GET /api/status', () => {
    it('should return API status information', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('service', 'MongoDB Service Template');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'operational');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('architecture');
    });

    it('should include feature list', async () => {
      const response = await request(app).get('/api/status').expect(200);

      expect(Array.isArray(response.body.features)).toBe(true);
      expect(response.body.features.length).toBeGreaterThan(0);
    });

    it('should include endpoint list', async () => {
      const response = await request(app).get('/api/status').expect(200);

      expect(Array.isArray(response.body.endpoints)).toBe(true);
      expect(response.body.endpoints.length).toBeGreaterThan(0);
    });

    it('should include architecture information', async () => {
      const response = await request(app).get('/api/status').expect(200);

      expect(response.body.architecture).toHaveProperty('pattern');
      expect(response.body.architecture).toHaveProperty('database');
      expect(response.body.architecture).toHaveProperty('security');
    });
  });
});