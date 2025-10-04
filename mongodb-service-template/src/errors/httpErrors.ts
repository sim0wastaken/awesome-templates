/**
 * @fileoverview HTTP-specific error classes
 *
 * Provides convenient error classes for common HTTP error scenarios
 * with consistent status codes and messaging.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import AppError from './AppError';

/**
 * 400 Bad Request - Client error in request format or content
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: unknown) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden - Access denied with valid authentication
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', details?: unknown) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * 405 Method Not Allowed - HTTP method not supported for resource
 */
export class MethodNotAllowedError extends AppError {
  constructor(message: string = 'Method Not Allowed', details?: unknown) {
    super(message, 405, details);
    this.name = 'MethodNotAllowedError';
  }
}

/**
 * 409 Conflict - Request conflicts with current state
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: unknown) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Unprocessable Entity - Request is well-formed but semantically incorrect
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Unprocessable Entity', details?: unknown) {
    super(message, 422, details);
    this.name = 'UnprocessableEntityError';
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too Many Requests', details?: unknown) {
    super(message, 429, details);
    this.name = 'TooManyRequestsError';
  }
}

/**
 * 500 Internal Server Error - Generic server error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: unknown) {
    super(message, 500, details);
    this.name = 'InternalServerError';
  }
}

/**
 * 502 Bad Gateway - Invalid response from upstream server
 */
export class BadGatewayError extends AppError {
  constructor(message: string = 'Bad Gateway', details?: unknown) {
    super(message, 502, details);
    this.name = 'BadGatewayError';
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service Unavailable', details?: unknown) {
    super(message, 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * 504 Gateway Timeout - Timeout waiting for upstream server
 */
export class GatewayTimeoutError extends AppError {
  constructor(message: string = 'Gateway Timeout', details?: unknown) {
    super(message, 504, details);
    this.name = 'GatewayTimeoutError';
  }
}

/**
 * Validation Error - Request validation failed
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation Error', details?: unknown) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}