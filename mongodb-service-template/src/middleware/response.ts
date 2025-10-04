/**
 * @fileoverview Response helpers middleware
 *
 * Adds standardized response methods to Express Response object
 * for consistent API responses across all endpoints.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { deepCamelCase } from '../utils/case';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Augment Response with helpers
    interface Response {
      success: (
        data: unknown,
        message?: string,
        extra?: Record<string, unknown>
      ) => Response;
      error: (message: string, status?: number, details?: unknown) => Response;
    }
  }
}

/**
 * Response helpers middleware
 *
 * Adds `res.success(data, message?, extra?)` and `res.error(message, status?, details?)`
 * to standardize API responses across controllers.
 *
 * Important: This middleware converts response data keys to camelCase to ensure
 * consistency across services. Persisted MongoDB documents may use snake_case
 * internally, but the public API always exposes camelCase.
 *
 * Success format:
 * `{ success: true, message, data, timestamp, ...extra }`
 *
 * Error format:
 * `{ success: false, error: { code, message }, details, timestamp }`
 */
export const responseHelpers = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.success = (
    data: unknown,
    message = 'Success',
    extra: Record<string, unknown> = {}
  ) => {
    const transformed = deepCamelCase(data);
    // Also camelCase known extra payloads if present (pagination/meta-like objects)
    const extraCamel = deepCamelCase(extra);
    return res.status(200).json({
      success: true,
      message,
      data: transformed,
      timestamp: new Date().toISOString(),
      ...extraCamel,
    });
  };

  res.error = (message: string, status = 400, details: unknown = null) => {
    return res.status(status).json({
      success: false,
      error: { message },
      details,
      timestamp: new Date().toISOString(),
    });
  };

  next();
};

export default responseHelpers;