/**
 * @fileoverview Type definitions for the API Gateway
 *
 * This module contains all TypeScript type definitions used throughout
 * the API gateway including request/response types, error types, and
 * service integration types.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response } from 'express';

// ===========================
// COMMON TYPES
// ===========================

/**
 * Standard API response envelope
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorEnvelope;
  meta?: ResponseMeta;
  timestamp: string;
}

/**
 * Error envelope for consistent error responses
 */
export interface ErrorEnvelope {
  code: string;
  message: string;
  details?: any;
}

/**
 * Response metadata for pagination and additional info
 */
export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: Record<string, ServiceHealthStatus>;
  system: SystemHealth;
}

/**
 * Individual service health status
 */
export interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'timeout';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

/**
 * System health metrics
 */
export interface SystemHealth {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
}

// ===========================
// REQUEST/RESPONSE EXTENSIONS
// ===========================

/**
 * Extended Express Request with additional properties
 */
export interface ExtendedRequest extends Request {
  startTime?: number;
  user?: any;
  correlationId?: string;
}

/**
 * Extended Express Response with helper methods
 */
export interface ExtendedResponse extends Response {
  success: (data?: any, message?: string, meta?: ResponseMeta) => void;
  error: (error: string | ErrorEnvelope, statusCode?: number, details?: any) => void;
}

// ===========================
// SERVICE PROXY TYPES
// ===========================

/**
 * Service proxy configuration
 */
export interface ServiceProxyConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

/**
 * Service proxy response
 */
export interface ServiceProxyResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  responseTime: number;
}

/**
 * Service proxy error
 */
export interface ServiceProxyError extends Error {
  status?: number;
  code?: string;
  response?: {
    data?: any;
    status?: number;
    headers?: Record<string, string>;
  };
  isTimeout?: boolean;
  isNetworkError?: boolean;
}

// ===========================
// MIDDLEWARE TYPES
// ===========================

/**
 * Async request handler type
 */
export type AsyncRequestHandler = (
  req: ExtendedRequest,
  res: ExtendedResponse,
  next: (error?: any) => void
) => Promise<void>;

/**
 * Error handler type
 */
export type ErrorHandler = (
  error: any,
  req: ExtendedRequest,
  res: ExtendedResponse,
  next: (error?: any) => void
) => void;

/**
 * Validation schema type
 */
export interface ValidationSchema {
  segment: 'body' | 'query' | 'params' | 'headers';
  schema: any; // Joi schema
  options?: {
    allowUnknown?: boolean;
    stripUnknown?: boolean;
    abortEarly?: boolean;
  };
}

// ===========================
// CACHE TYPES
// ===========================

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number;
  maxSize?: number;
  enabled: boolean;
}

/**
 * Cache entry
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

// ===========================
// METRICS TYPES
// ===========================

/**
 * Request metrics
 */
export interface RequestMetrics {
  total: number;
  success: number;
  errors: number;
  averageResponseTime: number;
  successRate: number;
}

/**
 * Service metrics
 */
export interface ServiceMetrics {
  [serviceName: string]: {
    requests: RequestMetrics;
    availability: number;
    lastError?: string;
    lastErrorTime?: string;
  };
}

/**
 * Gateway metrics
 */
export interface GatewayMetrics {
  uptime: number;
  requests: RequestMetrics;
  services: ServiceMetrics;
  system: SystemHealth;
  timestamp: string;
}

// ===========================
// CONFIGURATION TYPES
// ===========================

/**
 * Route configuration
 */
export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  target: {
    service: string;
    path: string;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  auth?: {
    required: boolean;
    roles?: string[];
  };
}

// ===========================
// UTILITY TYPES
// ===========================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract keys of type T that are of type U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Omit properties by type
 */
export type OmitByType<T, U> = Omit<T, KeysOfType<T, U>>;

/**
 * Pick properties by type
 */
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

// ===========================
// DOMAIN-SPECIFIC TYPES
// ===========================

/**
 * Generic entity interface
 */
export interface BaseEntity {
  id: string | number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Search parameters
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

/**
 * Aggregation result
 */
export interface AggregationResult<T = any> {
  data: T[];
  aggregations?: Record<string, any>;
  meta: ResponseMeta;
}

export default {
  ApiResponse,
  ErrorEnvelope,
  ResponseMeta,
  PaginationParams,
  HealthCheckResult,
  ServiceHealthStatus,
  SystemHealth,
  ExtendedRequest,
  ExtendedResponse,
  ServiceProxyConfig,
  ServiceProxyResponse,
  ServiceProxyError,
  AsyncRequestHandler,
  ErrorHandler,
  ValidationSchema,
  CacheConfig,
  CacheEntry,
  RequestMetrics,
  ServiceMetrics,
  GatewayMetrics,
  RouteConfig,
  BaseEntity,
  SearchParams,
  AggregationResult,
};