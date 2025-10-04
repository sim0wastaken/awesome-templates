/**
 * @fileoverview Base application error classes
 *
 * Provides structured error handling with HTTP status codes and
 * operational error classification for better error management.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

/**
 * Base application error carrying HTTP status and optional details.
 * Extend this for domain-specific HTTP errors.
 */
export class AppError extends Error {
  public status: number;
  public details?: unknown;
  public isOperational: boolean;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Validation error for request validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error for authorization failures
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error for duplicate resources or business rule violations
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: unknown) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

export default AppError;