/**
 * @fileoverview Main routes index for the API Gateway Server
 *
 * This module aggregates all route modules and sets up the main API routing structure.
 * Routes are organized by domain and proxy requests to appropriate backend microservices.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Router } from 'express';

// Import route modules
import exampleRoutes from './example';
// Add more route imports here as you build your gateway
// import userRoutes from './users';
// import productRoutes from './products';
// import orderRoutes from './orders';

const router = Router();

// ===========================
// ROUTE MOUNTING
// ===========================

/**
 * Example routes - demonstrates basic gateway functionality
 * Replace these with your actual domain routes
 */
router.use('/example', exampleRoutes);

// Mount your actual routes here:
// router.use('/users', userRoutes);
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);

// ===========================
// UTILITY ROUTES
// ===========================

/**
 * @swagger
 * /api/status:
 *   get:
 *     tags: [Gateway]
 *     summary: API gateway status
 *     description: Returns service identity, version, available routes, and timestamp
 *     responses:
 *       200:
 *         description: Status information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 service: "api-gateway"
 *                 version: "1.0.0"
 *                 status: "operational"
 *                 routes:
 *                   example: "/api/example"
 *                 documentation: "See /api-docs for detailed API documentation"
 *               timestamp: "2024-01-01T00:00:00.000Z"
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'api-gateway',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      routes: {
        example: '/api/example',
        // Add your actual routes here:
        // users: '/api/users',
        // products: '/api/products',
        // orders: '/api/orders',
      },
      documentation: 'See /api-docs for detailed API documentation',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags: [Gateway]
 *     summary: Multi-service search
 *     description: |
 *       Performs search across multiple services and aggregates results.
 *       This is a template implementation - customize based on your services.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query text (minimum 2 characters)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, serviceA, serviceB, serviceC]
 *           default: all
 *         description: Limit search to specific service type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum items per service
 *     responses:
 *       200:
 *         description: Search results from multiple services
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         query:
 *                           type: string
 *                         type:
 *                           type: string
 *                         results:
 *                           type: object
 *                           properties:
 *                             serviceA:
 *                               type: array
 *                               items: {}
 *                             serviceB:
 *                               type: array
 *                               items: {}
 *                             serviceC:
 *                               type: array
 *                               items: {}
 *                             total:
 *                               type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q: query, type = 'all', limit = 10 } = req.query;

    if (!query || (query as string).trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query must be at least 2 characters long',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // This is a template implementation
    // In a real gateway, you would:
    // 1. Create service proxy instances
    // 2. Make parallel requests to relevant services
    // 3. Aggregate and normalize the results
    // 4. Handle errors gracefully

    const searchResults = {
      success: true,
      data: {
        query: (query as string).trim(),
        type,
        results: {
          serviceA: [], // Results from Service A
          serviceB: [], // Results from Service B
          serviceC: [], // Results from Service C
          total: 0,
        },
      },
      meta: {
        limit: parseInt(limit as string, 10),
        timestamp: new Date().toISOString(),
        searchTime: '0ms',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(searchResults);
  } catch (error) {
    next(error);
  }
});

export default router;