/**
 * @fileoverview Main routes index for MongoDB service template
 *
 * Aggregates all route modules and provides core service endpoints
 * like health checks and status information.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import { Router } from 'express';
import { getDatabaseStatus, performHealthCheck } from '../databases/database';
import asyncHandler from '../middleware/asyncHandler';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns service status and database connection status for monitoring and load balancers
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: mongodb-service-template
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: connected
 *                     host:
 *                       type: string
 *                       example: localhost
 *                     port:
 *                       type: number
 *                       example: 27017
 *                     name:
 *                       type: string
 *                       example: template_database
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: number
 *                       description: Resident Set Size
 *                     heapTotal:
 *                       type: number
 *                       description: Total heap size
 *                     heapUsed:
 *                       type: number
 *                       description: Used heap size
 *                     external:
 *                       type: number
 *                       description: External memory usage
 *                 environment:
 *                   type: string
 *                   example: development
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const healthCheck = await performHealthCheck();
    const dbStatus = getDatabaseStatus();

    res.json({
      status: healthCheck.status,
      service: 'mongodb-service-template',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        ...healthCheck.details,
        status: dbStatus.isConnected ? 'connected' : 'disconnected',
      },
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    });
  })
);

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: API status endpoint
 *     description: Returns comprehensive service information including endpoints, version, and capabilities
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 service:
 *                   type: string
 *                   example: MongoDB Service Template
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 status:
 *                   type: string
 *                   example: operational
 *                 description:
 *                   type: string
 *                   example: Production-ready MongoDB repository service template
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - MVC architecture with proper separation of concerns
 *                     - TypeScript for type safety
 *                     - Comprehensive error handling
 *                     - Input validation with Joi
 *                     - Swagger API documentation
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - GET /health - Service health check
 *                     - GET /api/status - Service status
 *                     - GET /api-docs - API documentation
 *                 architecture:
 *                   type: object
 *                   properties:
 *                     pattern:
 *                       type: string
 *                       example: MVC (Model-View-Controller)
 *                     database:
 *                       type: string
 *                       example: MongoDB with Mongoose ODM
 *                     security:
 *                       type: string
 *                       example: Helmet, CORS, Rate Limiting, Input Validation
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/api/status', (req, res) => {
  res.json({
    success: true,
    service: 'MongoDB Service Template',
    version: '1.0.0',
    status: 'operational',
    description: 'Production-ready MongoDB repository service template',
    features: [
      'MVC architecture with proper separation of concerns',
      'TypeScript for type safety',
      'Comprehensive error handling',
      'Input validation with Joi',
      'Swagger API documentation',
      'Health monitoring and metrics',
      'Rate limiting and security headers',
    ],
    endpoints: [
      'GET /health - Service health check',
      'GET /api/status - Service status',
      'GET /api-docs - API documentation',
    ],
    architecture: {
      pattern: 'MVC (Model-View-Controller)',
      database: 'MongoDB with Mongoose ODM',
      security: 'Helmet, CORS, Rate Limiting, Input Validation',
    },
  });
});

// Mount additional route modules here
// Example:
// router.use('/api/users', userRoutes);
// router.use('/api/posts', postRoutes);

export default router;