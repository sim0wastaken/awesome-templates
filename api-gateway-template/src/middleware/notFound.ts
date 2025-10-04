/**
 * @fileoverview 404 Not Found middleware
 *
 * This middleware handles requests to non-existent routes and returns
 * a consistent 404 error response.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors';

/**
 * 404 Not Found middleware
 * Handles requests to non-existent routes
 */
const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

export default notFound;