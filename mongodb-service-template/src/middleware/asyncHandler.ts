/**
 * @fileoverview Async handler to avoid try/catch in controllers
 *
 * Wraps async route handlers to automatically catch and forward
 * any thrown errors to the Express error handling middleware.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';

export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps async route handlers to catch errors and pass them to next()
 *
 * Usage:
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await UserService.getAll();
 *   res.success(users);
 * }));
 * ```
 */
export const asyncHandler = (handler: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export default asyncHandler;