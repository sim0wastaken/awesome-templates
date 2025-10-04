/**
 * @fileoverview 404 Not Found middleware
 *
 * Handles requests to non-existent routes with a consistent
 * error response format.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/httpErrors';

/**
 * 404 Not Found middleware
 *
 * This middleware should be placed after all route definitions
 * to catch any requests that don't match defined routes.
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(
    `Route ${req.method} ${req.originalUrl} not found`,
    {
      method: req.method,
      url: req.originalUrl,
      availableEndpoints: [
        'GET /health',
        'GET /api/status',
        'GET /api-docs',
      ],
    }
  );
  next(error);
};

export default notFound;