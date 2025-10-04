/**
 * @fileoverview Example routes for the API Gateway
 *
 * This module demonstrates how to create routes that proxy requests to backend
 * services, aggregate data from multiple services, and handle errors gracefully.
 * Use this as a template for creating your actual domain routes.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Router } from 'express';
import { createServiceProxies, aggregateServiceData, enrichData } from '../utils/serviceProxy';
import { asyncHandler, validateQuery, validateParams, validateBody } from '../middleware';
import { paginationSchema, idParamSchema } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Create service proxy instances
const serviceProxies = createServiceProxies();

// ===========================
// VALIDATION SCHEMAS
// ===========================

const exampleSearchSchema = Joi.object({
  query: Joi.string().min(1).max(255).trim().optional(),
  category: Joi.string().valid('all', 'typeA', 'typeB').default('all'),
  ...paginationSchema.describe().keys,
});

const exampleCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  description: Joi.string().max(500).trim().optional(),
  category: Joi.string().valid('typeA', 'typeB').required(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
});

// ===========================
// EXAMPLE ROUTES
// ===========================

/**
 * @swagger
 * /api/example:
 *   get:
 *     tags: [Example]
 *     summary: List items from multiple services
 *     description: |
 *       Demonstrates how to aggregate data from multiple backend services.
 *       This endpoint fetches data from Service A and enriches it with data from Service B.
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, typeA, typeB]
 *           default: all
 *         description: Filter by category
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of items from multiple services
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  validateQuery(exampleSearchSchema),
  asyncHandler(async (req, res) => {
    const { query, category, page, limit } = req.query;

    try {
      // Example: Aggregate data from multiple services
      const aggregatedData = await aggregateServiceData([
        {
          service: serviceProxies.serviceA,
          path: '/api/items',
          params: { query, category, page, limit },
          key: 'primaryItems',
        },
        {
          service: serviceProxies.serviceB,
          path: '/api/metadata',
          params: { category },
          key: 'metadata',
        },
      ]);

      // Process and combine the results
      const items = aggregatedData.primaryItems?.items || [];
      const metadata = aggregatedData.metadata || {};

      res.success(
        {
          items,
          metadata,
          aggregatedFrom: ['serviceA', 'serviceB'],
        },
        'Items retrieved successfully',
        {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          total: aggregatedData.primaryItems?.total || 0,
        }
      );
    } catch (error) {
      // If primary service fails, return error
      // If secondary services fail, continue with partial data
      console.error('Error in example list endpoint:', error);
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/example/{id}:
 *   get:
 *     tags: [Example]
 *     summary: Get item details with enriched data
 *     description: |
 *       Demonstrates how to fetch an item from one service and enrich it
 *       with related data from other services.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *               pattern: '^[0-9a-fA-F]{24}$'
 *             - type: integer
 *               minimum: 1
 *             - type: string
 *               format: uuid
 *         description: Item ID (MongoDB ObjectId, integer, or UUID)
 *     responses:
 *       200:
 *         description: Item details with enriched data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // First, get the base item from Service A
      const baseItemResponse = await serviceProxies.serviceA.get(`/api/items/${id}`);
      const baseItem = baseItemResponse.data;

      // Then enrich it with data from other services
      const enrichedItem = await enrichData(baseItem, [
        {
          service: serviceProxies.serviceB,
          path: `/api/related/${id}`,
          key: 'relatedData',
        },
        {
          service: serviceProxies.serviceC,
          path: `/api/analytics/${id}`,
          key: 'analytics',
        },
      ]);

      res.success(enrichedItem, 'Item details retrieved successfully');
    } catch (error) {
      console.error('Error in example detail endpoint:', error);
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/example:
 *   post:
 *     tags: [Example]
 *     summary: Create new item
 *     description: |
 *       Demonstrates how to create an item in one service and trigger
 *       related actions in other services.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Item name
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Item description
 *               category:
 *                 type: string
 *                 enum: [typeA, typeB]
 *                 description: Item category
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 description: Item tags
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  validateBody(exampleCreateSchema),
  asyncHandler(async (req, res) => {
    const itemData = req.body;

    try {
      // Create item in primary service
      const createResponse = await serviceProxies.serviceA.post('/api/items', itemData);
      const createdItem = createResponse.data;

      // Trigger related actions in other services (fire and forget)
      Promise.allSettled([
        serviceProxies.serviceB.post('/api/index', {
          itemId: createdItem.id,
          category: itemData.category,
        }),
        serviceProxies.serviceC.post('/api/analytics/track', {
          event: 'item_created',
          itemId: createdItem.id,
        }),
      ]).catch(error => {
        console.warn('Non-critical service calls failed:', error);
      });

      res.status(201).success(createdItem, 'Item created successfully');
    } catch (error) {
      console.error('Error in example create endpoint:', error);
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/example/{id}:
 *   put:
 *     tags: [Example]
 *     summary: Update item
 *     description: Updates an item in the primary service and syncs changes to other services
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *               pattern: '^[0-9a-fA-F]{24}$'
 *             - type: integer
 *               minimum: 1
 *             - type: string
 *               format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               category:
 *                 type: string
 *                 enum: [typeA, typeB]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(exampleCreateSchema.fork(['name', 'category'], schema => schema.optional())),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      // Update item in primary service
      const updateResponse = await serviceProxies.serviceA.put(`/api/items/${id}`, updateData);
      const updatedItem = updateResponse.data;

      // Sync changes to other services (fire and forget)
      Promise.allSettled([
        serviceProxies.serviceB.put(`/api/index/${id}`, {
          category: updateData.category,
        }),
        serviceProxies.serviceC.post('/api/analytics/track', {
          event: 'item_updated',
          itemId: id,
        }),
      ]).catch(error => {
        console.warn('Non-critical service sync failed:', error);
      });

      res.success(updatedItem, 'Item updated successfully');
    } catch (error) {
      console.error('Error in example update endpoint:', error);
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/example/{id}:
 *   delete:
 *     tags: [Example]
 *     summary: Delete item
 *     description: Deletes an item from all services
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *               pattern: '^[0-9a-fA-F]{24}$'
 *             - type: integer
 *               minimum: 1
 *             - type: string
 *               format: uuid
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // Delete from primary service first
      await serviceProxies.serviceA.delete(`/api/items/${id}`);

      // Clean up from other services
      await Promise.allSettled([
        serviceProxies.serviceB.delete(`/api/index/${id}`),
        serviceProxies.serviceC.delete(`/api/analytics/${id}`),
      ]);

      res.success(null, 'Item deleted successfully');
    } catch (error) {
      console.error('Error in example delete endpoint:', error);
      throw error;
    }
  })
);

export default router;