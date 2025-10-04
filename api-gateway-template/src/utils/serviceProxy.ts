/**
 * @fileoverview Service proxy utilities for API Gateway
 *
 * This module provides utilities for proxying requests to backend microservices
 * with features like retry logic, timeout handling, response transformation,
 * and error normalization.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../config';
import { 
  ServiceProxyConfig, 
  ServiceProxyResponse, 
  ServiceProxyError,
  ApiResponse 
} from '../types';
import { 
  AppError, 
  ServiceUnavailableError, 
  TimeoutError, 
  GatewayError,
  deriveCodeFromMessage 
} from '../errors';

/**
 * Service proxy class for handling requests to backend services
 */
export class ServiceProxy {
  private axiosInstance: AxiosInstance;
  private serviceName: string;
  private config: ServiceProxyConfig;

  constructor(serviceName: string, serviceConfig: ServiceProxyConfig) {
    this.serviceName = serviceName;
    this.config = serviceConfig;
    
    this.axiosInstance = axios.create({
      baseURL: serviceConfig.baseUrl,
      timeout: serviceConfig.timeout,
      headers: serviceConfig.headers,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add correlation ID and other headers
        config.headers = {
          ...config.headers,
          'X-Gateway-Service': this.serviceName,
          'X-Request-ID': this.generateRequestId(),
          'X-Timestamp': new Date().toISOString(),
        };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Transform axios errors to our error format
        const transformedError = this.transformError(error);
        return Promise.reject(transformedError);
      }
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Transform axios errors to standardized format
   */
  private transformError(error: any): ServiceProxyError {
    const proxyError = new Error() as ServiceProxyError;
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      proxyError.message = `Service ${this.serviceName} is unavailable`;
      proxyError.isNetworkError = true;
      proxyError.status = 503;
    } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      proxyError.message = `Request to ${this.serviceName} timed out`;
      proxyError.isTimeout = true;
      proxyError.status = 504;
    } else if (error.response) {
      // Server responded with error status
      proxyError.message = error.message || 'Service request failed';
      proxyError.status = error.response.status;
      proxyError.response = {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
      };
    } else {
      // Network or other error
      proxyError.message = error.message || 'Unknown service error';
      proxyError.status = 502;
    }

    proxyError.code = deriveCodeFromMessage(proxyError.message, proxyError.status);
    return proxyError;
  }

  /**
   * Make GET request with retry logic
   */
  async get<T = any>(
    path: string, 
    params?: Record<string, any>,
    options?: { retries?: number; timeout?: number }
  ): Promise<ServiceProxyResponse<T>> {
    return this.request<T>('GET', path, { params, ...options });
  }

  /**
   * Make POST request with retry logic
   */
  async post<T = any>(
    path: string, 
    data?: any,
    options?: { retries?: number; timeout?: number }
  ): Promise<ServiceProxyResponse<T>> {
    return this.request<T>('POST', path, { data, ...options });
  }

  /**
   * Make PUT request with retry logic
   */
  async put<T = any>(
    path: string, 
    data?: any,
    options?: { retries?: number; timeout?: number }
  ): Promise<ServiceProxyResponse<T>> {
    return this.request<T>('PUT', path, { data, ...options });
  }

  /**
   * Make DELETE request with retry logic
   */
  async delete<T = any>(
    path: string,
    options?: { retries?: number; timeout?: number }
  ): Promise<ServiceProxyResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Make PATCH request with retry logic
   */
  async patch<T = any>(
    path: string, 
    data?: any,
    options?: { retries?: number; timeout?: number }
  ): Promise<ServiceProxyResponse<T>> {
    return this.request<T>('PATCH', path, { data, ...options });
  }

  /**
   * Generic request method with retry logic
   */
  private async request<T = any>(
    method: string,
    path: string,
    options: {
      data?: any;
      params?: Record<string, any>;
      retries?: number;
      timeout?: number;
    } = {}
  ): Promise<ServiceProxyResponse<T>> {
    const { data, params, retries = this.config.retries, timeout } = options;
    const startTime = Date.now();

    const requestConfig: AxiosRequestConfig = {
      method: method.toLowerCase() as any,
      url: path,
      data,
      params,
      timeout: timeout || this.config.timeout,
    };

    let lastError: ServiceProxyError | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const response: AxiosResponse<T> = await this.axiosInstance.request(requestConfig);
        const responseTime = Date.now() - startTime;

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
          responseTime,
        };
      } catch (error) {
        lastError = error as ServiceProxyError;
        attempt++;

        // Don't retry on client errors (4xx) or certain server errors
        if (
          lastError.status && 
          (lastError.status < 500 || lastError.status === 501 || lastError.status === 505)
        ) {
          break;
        }

        // Don't retry if we've exhausted attempts
        if (attempt > retries) {
          break;
        }

        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delay);
      }
    }

    // All retries failed, throw the last error
    throw lastError || new GatewayError(`Failed to connect to ${this.serviceName}`);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.axiosInstance.get('/health', { timeout: 5000 });
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }
}

/**
 * Create service proxy instances for all configured services
 */
export function createServiceProxies(): Record<string, ServiceProxy> {
  const proxies: Record<string, ServiceProxy> = {};

  for (const [serviceName, serviceConfig] of Object.entries(config.SERVICES)) {
    proxies[serviceName] = new ServiceProxy(serviceName, serviceConfig);
  }

  return proxies;
}

/**
 * Format success response in standard format
 */
export function formatSuccessResponse<T = any>(
  data: T,
  message?: string,
  meta?: any
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format error response in standard format
 */
export function formatErrorResponse(
  error: string | { code: string; message: string },
  details?: any
): ApiResponse {
  const errorEnvelope = typeof error === 'string' 
    ? { code: 'INTERNAL', message: error }
    : error;

  return {
    success: false,
    error: errorEnvelope,
    ...(details && process.env.NODE_ENV !== 'production' && { details }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregate data from multiple services
 */
export async function aggregateServiceData<T = any>(
  requests: Array<{
    service: ServiceProxy;
    path: string;
    params?: Record<string, any>;
    key: string;
  }>
): Promise<Record<string, T | null>> {
  const results: Record<string, T | null> = {};

  // Execute all requests in parallel
  const promises = requests.map(async ({ service, path, params, key }) => {
    try {
      const response = await service.get<T>(path, params);
      results[key] = response.data;
    } catch (error) {
      console.warn(`Failed to fetch data from ${key}:`, (error as Error).message);
      results[key] = null;
    }
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * Enrich data by combining responses from multiple services
 */
export async function enrichData<T extends Record<string, any>>(
  baseData: T,
  enrichments: Array<{
    service: ServiceProxy;
    path: string;
    params?: Record<string, any>;
    key: keyof T;
  }>
): Promise<T> {
  const enrichedData = { ...baseData };

  const promises = enrichments.map(async ({ service, path, params, key }) => {
    try {
      const response = await service.get(path, params);
      enrichedData[key] = response.data;
    } catch (error) {
      console.warn(`Failed to enrich data for ${String(key)}:`, (error as Error).message);
      // Keep original value or set to null if not present
      if (!(key in enrichedData)) {
        enrichedData[key] = null as any;
      }
    }
  });

  await Promise.allSettled(promises);
  return enrichedData;
}

export default {
  ServiceProxy,
  createServiceProxies,
  formatSuccessResponse,
  formatErrorResponse,
  aggregateServiceData,
  enrichData,
};