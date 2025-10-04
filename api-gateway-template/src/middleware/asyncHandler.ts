/**
 * @fileoverview Async handler middleware for Express routes
 *
 * This middleware wraps async route handlers to automatically catch
 * and forward any thrown errors to the Express error handling middleware.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { AsyncRequestHandler } from '../types';

/**
 * Wraps async route handlers to catch errors and pass them to Express error handling
 * 
 * @param fn - Async route handler function
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await UserService.getAll();
 *   res.success(users);
 * }));
 * ```
 */
const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as any, res as any, next)).catch(next);
  };
};

export default asyncHandler;