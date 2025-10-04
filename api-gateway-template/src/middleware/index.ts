/**
 * @fileoverview Middleware collection for API Gateway
 *
 * This module exports all middleware functions used throughout the API gateway
 * including error handling, validation, authentication, caching, and more.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

export { default as asyncHandler } from './asyncHandler';
export { default as errorNormalizer } from './errorNormalizer';
export { default as responseEnhancer } from './responseEnhancer';
export { default as validation } from './validation';
export { default as cacheControl } from './cacheControl';
export { default as healthCheck } from './healthCheck';
export { default as notFound } from './notFound';
export { default as methodResolver } from './methodResolver';
export { default as requestLogger } from './requestLogger';
export { default as rateLimiter } from './rateLimiter';