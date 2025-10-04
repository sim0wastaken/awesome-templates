/**
 * @fileoverview Rate limiting middleware
 *
 * This middleware provides configurable rate limiting for the API gateway
 * with different limits for different endpoint types.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config';
import { RateLimitError } from '../errors';

/**
 * Default rate limiter for general API endpoints
 */
export const defaultRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later',
  handler: (req: Request, res: Response) => {
    const error = new RateLimitError('Too many requests from this IP, please try again later');
    res.status(429).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  },
  // Skip rate limiting for health checks
  skip: (req: Request) => {
    return req.path.includes('/health');
  },
});

/**
 * Strict rate limiter for sensitive operations (auth, creation, etc.)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts, please try again later',
  handler: (req: Request, res: Response) => {
    const error = new RateLimitError('Too many attempts, please try again later');
    res.status(429).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Lenient rate limiter for read-only operations
 */
export const lenientRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later',
  handler: (req: Request, res: Response) => {
    const error = new RateLimitError('Too many requests, please try again later');
    res.status(429).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Create custom rate limiter with specific configuration
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipPaths?: string[];
}) {
  return rateLimit({
    windowMs: options.windowMs || config.RATE_LIMIT_WINDOW,
    max: options.max || config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: options.message || 'Too many requests',
    handler: (req: Request, res: Response) => {
      const error = new RateLimitError(options.message || 'Too many requests');
      res.status(429).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    },
    skip: (req: Request) => {
      if (options.skipPaths) {
        return options.skipPaths.some(path => req.path.includes(path));
      }
      return false;
    },
  });
}

export default defaultRateLimiter;