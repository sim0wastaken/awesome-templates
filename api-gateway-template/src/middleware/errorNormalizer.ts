/**
 * @fileoverview Error normalization middleware
 *
 * This middleware normalizes all errors into a consistent format for the API gateway.
 * It handles errors from downstream services, validation errors, and internal errors.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import {
  ERROR_CODES,
  STATUS_BY_CODE,
  DEFAULT_MESSAGE_BY_CODE,
  mapStatusToDefaultCode,
  deriveCodeFromMessage,
  isAppError,
} from '../errors';
import { ApiResponse, ErrorEnvelope } from '../types';

/**
 * Build a contract-compliant error envelope
 */
function buildEnvelope({
  code,
  message,
  details,
  status,
}: {
  code?: string;
  message?: string;
  details?: any;
  status?: number;
}): ApiResponse {
  const safeCode = code || mapStatusToDefaultCode(status || 500);
  const safeMessage =
    message ||
    DEFAULT_MESSAGE_BY_CODE[safeCode] ||
    DEFAULT_MESSAGE_BY_CODE[ERROR_CODES.INTERNAL];

  const envelope: ApiResponse = {
    success: false,
    error: { code: safeCode, message: safeMessage },
    timestamp: new Date().toISOString(),
  };

  if (details && process.env.NODE_ENV !== 'production') {
    envelope.error!.details = details;
  }

  return envelope;
}

/**
 * Normalize common error shapes (axios responses, legacy envelopes, local errors)
 */
function normalizeKnownShapes(err: any): {
  status: number;
  code: string;
  message: string;
  details?: any;
} {
  // Express/axios upstream error with response
  if (err.response && err.response.status) {
    const status = err.response.status;
    const data = err.response.data || {};

    // New services: { success:false, error:{code,message}, details? }
    if (
      data &&
      data.success === false &&
      data.error &&
      typeof data.error === 'object'
    ) {
      const code = data.error.code || mapStatusToDefaultCode(status);
      const message = data.error.message || DEFAULT_MESSAGE_BY_CODE[code];
      const details = data.details || data.error.details;
      return { status, code, message, details };
    }

    // Legacy: { success:false, error: "string" | object, details? }
    if (data && data.success === false && data.error) {
      const legacyMessage =
        typeof data.error === 'string'
          ? data.error
          : data.error.message || err.message;
      const code = deriveCodeFromMessage(legacyMessage, status);
      const message = legacyMessage || DEFAULT_MESSAGE_BY_CODE[code];
      const details =
        data.details ||
        (typeof data.error === 'object' ? data.error : undefined);
      return { status, code, message, details };
    }

    // Arbitrary custom shapes
    if (typeof data === 'object') {
      const message = data.message || data.error || err.message;
      const code = deriveCodeFromMessage(message, status);
      return { status, code, message, details: data.details };
    }

    // Fallback to status and error message
    return {
      status,
      code: mapStatusToDefaultCode(status),
      message: err.message,
    };
  }

  // Handle our custom AppError instances
  if (isAppError(err)) {
    return {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  // Joi validation errors
  if (err.isJoi) {
    return {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: err.details?.[0]?.message || 'Validation error',
      details: err.details,
    };
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    return {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: messages.join(', ') || 'Validation error',
      details: err.errors,
    };
  }

  // Mongoose cast errors
  if (err.name === 'CastError') {
    return {
      status: 400,
      code: ERROR_CODES.CAST_ERROR,
      message: `Invalid ${err.path}: ${err.value}`,
      details: { path: err.path, value: err.value, kind: err.kind },
    };
  }

  // MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return {
      status: 409,
      code: ERROR_CODES.DUPLICATE_KEY,
      message: `Duplicate ${field}`,
      details: err.keyValue,
    };
  }

  // Errors thrown locally with status/statusCode
  const status = err.status || err.statusCode || 500;
  const code =
    err.code && STATUS_BY_CODE[err.code]
      ? err.code
      : deriveCodeFromMessage(err.message, status);
  const message = err.publicMessage || err.message || 'Internal server error';

  return { status, code, message, details: err.details };
}

/**
 * Express final error handler middleware
 */
const errorNormalizer = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details for debugging
  console.error('Error caught by normalizer:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const { status, code, message, details } = normalizeKnownShapes(err);
  const envelope = buildEnvelope({ code, message, details, status });

  res.status(status || 500).json(envelope);
};

export default errorNormalizer;