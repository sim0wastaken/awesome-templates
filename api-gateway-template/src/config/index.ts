/**
 * @fileoverview Central configuration for the API Gateway Server
 *
 * This module manages all configuration settings for the API gateway including
 * service endpoints, timeouts, rate limiting, CORS settings, and environment-specific
 * configurations. All settings can be overridden via environment variables.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Service configuration interface
 */
export interface ServiceConfig {
  /** Base URL of the service */
  url: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts for failed requests */
  retries: number;
  /** Default headers to send with requests */
  headers: Record<string, string>;
}

/**
 * Server configuration interface
 */
export interface ServerConfig {
  /** Port number for the API gateway */
  PORT: number;
  /** Environment (development, production, test) */
  NODE_ENV: string;
  /** Host address to bind to */
  HOST: string;
  /** Default request timeout in milliseconds */
  REQUEST_TIMEOUT: number;
  /** Maximum items per page for pagination */
  MAX_LIMIT: number;
  /** Configuration for backend services */
  SERVICES: Record<string, ServiceConfig>;
  /** CORS configuration */
  CORS: {
    origins: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  /** Default retry attempts for failed requests */
  RETRY_ATTEMPTS: number;
  /** Default pagination limit */
  DEFAULT_LIMIT: number;
  /** Enable response caching */
  ENABLE_CACHE: boolean;
  /** Cache TTL in seconds */
  CACHE_TTL: number;
  /** Rate limit window in minutes */
  RATE_LIMIT_WINDOW: number;
  /** Maximum requests per window */
  RATE_LIMIT_MAX: number;
  /** Log level */
  LOG_LEVEL: string;
  /** Enable request logging */
  ENABLE_REQUEST_LOGGING: boolean;
  /** Health check timeout (milliseconds) */
  HEALTH_CHECK_TIMEOUT: number;
  /** Health check interval (milliseconds) */
  HEALTH_CHECK_INTERVAL: number;
  /** CORS allowed origins */
  CORS_ORIGINS: string[];
}

/**
 * Central server configuration object
 * Contains all settings for the API gateway including service endpoints,
 * timeouts, security settings, and environment-specific configurations
 */
const config: ServerConfig = {
  // ===========================
  // SERVER CONFIGURATION
  // ===========================

  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || '0.0.0.0',

  /** CORS allowed origins */
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'],

  // ===========================
  // MICROSERVICE ENDPOINTS
  // ===========================

  /**
   * Configuration for all backend microservices
   * Each service configuration includes URL, timeout, retry settings, and default headers
   * 
   * Update these service configurations to match your microservices:
   * - SERVICE_A_URL: Your primary service (e.g., PostgreSQL service)
   * - SERVICE_B_URL: Your secondary service (e.g., MongoDB service)  
   * - SERVICE_C_URL: Your tertiary service (e.g., Chat service)
   */
  SERVICES: {
    serviceA: {
      url: process.env.SERVICE_A_URL || 'http://localhost:8080',
      timeout: parseInt(process.env.SERVICE_A_TIMEOUT || '15000', 10),
      retries: parseInt(process.env.SERVICE_A_RETRIES || '3', 10),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    serviceB: {
      url: process.env.SERVICE_B_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.SERVICE_B_TIMEOUT || '10000', 10),
      retries: parseInt(process.env.SERVICE_B_RETRIES || '2', 10),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    serviceC: {
      url: process.env.SERVICE_C_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.SERVICE_C_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_C_RETRIES || '1', 10),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  },

  // ===========================
  // SECURITY AND CORS SETTINGS
  // ===========================

  CORS: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: process.env.CORS_CREDENTIALS === 'false' ? false : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  },

  // ===========================
  // REQUEST CONFIGURATION
  // ===========================

  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  RETRY_ATTEMPTS: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
  DEFAULT_LIMIT: parseInt(process.env.DEFAULT_LIMIT || '20', 10),
  MAX_LIMIT: parseInt(process.env.MAX_LIMIT || '100', 10),

  // ===========================
  // CACHING CONFIGURATION
  // ===========================

  ENABLE_CACHE: process.env.ENABLE_CACHE === 'true',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes

  // ===========================
  // RATE LIMITING
  // ===========================

  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),

  // ===========================
  // LOGGING CONFIGURATION
  // ===========================

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',

  // ===========================
  // HEALTH CHECK CONFIGURATION
  // ===========================

  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
};

/**
 * Validates the configuration settings
 * @throws {Error} If required configuration is missing
 */
function validateConfig(): void {
  const requiredFields: (keyof ServerConfig)[] = ['PORT'];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }

  // Validate service URLs
  const services = Object.keys(config.SERVICES);

  for (const service of services) {
    const serviceConfig = config.SERVICES[service];
    if (!serviceConfig || !serviceConfig.url) {
      throw new Error(`Missing required service configuration: SERVICES.${service}.url`);
    }

    try {
      new URL(serviceConfig.url);
    } catch (error) {
      throw new Error(`Invalid URL for SERVICES.${service}.url: ${serviceConfig.url}`);
    }
  }
}

// Validate configuration on load
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', (error as Error).message);
  process.exit(1);
}

export default config;