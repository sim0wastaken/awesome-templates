/**
 * @fileoverview Error handling and normalization for the API Gateway
 *
 * This module provides centralized error handling, error codes, and error
 * normalization utilities to ensure consistent error responses across
 * all gateway endpoints and service integrations.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

/**
 * Standard error codes used throughout the gateway
 */
export const ERROR_CODES = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CAST_ERROR: 'CAST_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors (5xx)
  INTERNAL: 'INTERNAL',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  GATEWAY_ERROR: 'GATEWAY_ERROR',
} as const;

/**
 * HTTP status codes mapped to error codes
 */
export const STATUS_BY_CODE: Record<string, number> = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.CAST_ERROR]: 400,
  [ERROR_CODES.AUTH_REQUIRED]: 401,
  [ERROR_CODES.INVALID_TOKEN]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.METHOD_NOT_ALLOWED]: 405,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.DUPLICATE_KEY]: 409,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.INTERNAL]: 500,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.TIMEOUT]: 504,
  [ERROR_CODES.GATEWAY_ERROR]: 502,
};

/**
 * Default error messages for each error code
 */
export const DEFAULT_MESSAGE_BY_CODE: Record<string, string> = {
  [ERROR_CODES.VALIDATION_ERROR]: 'Invalid request parameters',
  [ERROR_CODES.CAST_ERROR]: 'Invalid data format',
  [ERROR_CODES.AUTH_REQUIRED]: 'Authentication required',
  [ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token',
  [ERROR_CODES.FORBIDDEN]: 'Access denied',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.METHOD_NOT_ALLOWED]: 'Method not allowed',
  [ERROR_CODES.CONFLICT]: 'Resource conflict',
  [ERROR_CODES.DUPLICATE_KEY]: 'Duplicate resource',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests',
  [ERROR_CODES.INTERNAL]: 'Internal server error',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ERROR_CODES.TIMEOUT]: 'Request timeout',
  [ERROR_CODES.GATEWAY_ERROR]: 'Gateway error',
};

/**
 * Map HTTP status codes to default error codes
 */
export function mapStatusToDefaultCode(status: number): string {
  switch (status) {
    case 400: return ERROR_CODES.VALIDATION_ERROR;
    case 401: return ERROR_CODES.AUTH_REQUIRED;
    case 403: return ERROR_CODES.FORBIDDEN;
    case 404: return ERROR_CODES.NOT_FOUND;
    case 405: return ERROR_CODES.METHOD_NOT_ALLOWED;
    case 409: return ERROR_CODES.CONFLICT;
    case 429: return ERROR_CODES.RATE_LIMITED;
    case 500: return ERROR_CODES.INTERNAL;
    case 502: return ERROR_CODES.GATEWAY_ERROR;
    case 503: return ERROR_CODES.SERVICE_UNAVAILABLE;
    case 504: return ERROR_CODES.TIMEOUT;
    default: return status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.VALIDATION_ERROR;
  }
}

/**
 * Derive error code from error message patterns
 */
export function deriveCodeFromMessage(message: string, status?: number): string {
  if (!message) {
    return mapStatusToDefaultCode(status || 500);
  }

  const lowerMessage = message.toLowerCase();

  // Check for specific patterns
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('e11000')) {
    return ERROR_CODES.DUPLICATE_KEY;
  }
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return ERROR_CODES.VALIDATION_ERROR;
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
    return ERROR_CODES.NOT_FOUND;
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('etimedout')) {
    return ERROR_CODES.TIMEOUT;
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('auth')) {
    return ERROR_CODES.AUTH_REQUIRED;
  }
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('access denied')) {
    return ERROR_CODES.FORBIDDEN;
  }
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    return ERROR_CODES.RATE_LIMITED;
  }

  // Fallback to status-based mapping
  return mapStatusToDefaultCode(status || 500);
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL,
    status?: number,
    details?: any
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.status = status || STATUS_BY_CODE[code] || 500;
    this.isOperational = true;
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ERROR_CODES.AUTH_REQUIRED, 401);
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, ERROR_CODES.FORBIDDEN, 403);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, ERROR_CODES.NOT_FOUND, 404);
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ERROR_CODES.CONFLICT, 409, details);
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, ERROR_CODES.RATE_LIMITED, 429);
  }
}

/**
 * Service unavailable error class
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(message, ERROR_CODES.SERVICE_UNAVAILABLE, 503, details);
  }
}

/**
 * Timeout error class
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', details?: any) {
    super(message, ERROR_CODES.TIMEOUT, 504, details);
  }
}

/**
 * Gateway error class
 */
export class GatewayError extends AppError {
  constructor(message: string = 'Gateway error', details?: any) {
    super(message, ERROR_CODES.GATEWAY_ERROR, 502, details);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: any): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

export default {
  ERROR_CODES,
  STATUS_BY_CODE,
  DEFAULT_MESSAGE_BY_CODE,
  mapStatusToDefaultCode,
  deriveCodeFromMessage,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  TimeoutError,
  GatewayError,
  isAppError,
  isOperationalError,
};