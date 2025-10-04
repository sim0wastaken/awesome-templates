/**
 * @fileoverview Centralized error handler for Express
 *
 * Translates known errors (including Mongoose) into a consistent envelope:
 * { success: false, error: { code, message }, details, timestamp }
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';

type AnyError = Error & {
  status?: number;
  details?: unknown;
  code?: number | string;
  name?: string;
  errors?: unknown;
};

/**
 * Centralized error handler middleware
 *
 * Translates known errors (including Mongoose) into a consistent envelope:
 * { success: false, error, details, timestamp }
 *
 * Status mapping:
 * - 400 → validation/cast errors
 * - 404 → not found
 * - 409 → duplicate key
 * - 500 → unknown/unhandled
 */
export const errorHandler = (
  err: AnyError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Map Mongoose/Mongo errors to HTTP statuses
  let status = err.status ?? 500;
  let message = err.message || 'Unexpected error';
  let details: unknown = err.details ?? null;

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    status = 400;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details = (err as any).errors ?? details;
  }

  // Mongoose CastError
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  // Mongo duplicate key error
  if ((err as AnyError).code === 11000) {
    status = 409;
    if (!message || message === 'Unexpected error')
      message = 'Duplicate key error';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  // Normalize non-AppError unknowns to 500 without leaking internals
  const isOperational = err instanceof AppError || status < 500;
  const safeMessage = isOperational ? message : 'Internal server error';

  // Map HTTP status → canonical error code
  const mapStatusToCode = (s: number): string => {
    switch (Number(s)) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 405:
        return 'METHOD_NOT_ALLOWED';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'INTERNAL_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'INTERNAL_ERROR';
    }
  };

  const code =
    (err as AnyError)?.code && typeof (err as AnyError).code === 'string'
      ? ((err as AnyError).code as string)
      : mapStatusToCode(status);

  // Structured log (do not leak to client)
  console.error('Error:', {
    message: err.message,
    name: err.name,
    status,
    code: (err as AnyError).code,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return res.status(status).json({
    success: false,
    error: { code, message: safeMessage },
    details: isOperational ? details : null,
    timestamp: new Date().toISOString(),
  });
};

export default errorHandler;