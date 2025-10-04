/**
 * @fileoverview Method not allowed middleware
 *
 * This middleware handles requests with unsupported HTTP methods
 * and returns a 405 Method Not Allowed response.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ERROR_CODES } from '../errors';

/**
 * Method not allowed middleware
 * Handles requests with unsupported HTTP methods for known routes
 */
const methodResolver = (req: Request, res: Response, next: NextFunction): void => {
  // This middleware should be placed after all route definitions
  // If we reach here, it means the route exists but the method is not allowed
  
  const error = new AppError(
    `Method ${req.method} not allowed for ${req.originalUrl}`,
    ERROR_CODES.METHOD_NOT_ALLOWED,
    405
  );
  
  // Set the Allow header with supported methods (this would need to be customized per route)
  res.set('Allow', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  
  next(error);
};

export default methodResolver;