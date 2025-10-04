/**
 * @fileoverview Response enhancer middleware
 *
 * This middleware extends the Express Response object with helper methods
 * for consistent API responses throughout the gateway.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ResponseMeta, ErrorEnvelope } from '../types';

/**
 * Extends Express Response with helper methods for consistent API responses
 */
const responseEnhancer = (req: Request, res: Response, next: NextFunction): void => {
  /**
   * Send a successful response with data
   * 
   * @param data - Response data
   * @param message - Optional success message
   * @param meta - Optional metadata (pagination, etc.)
   */
  res.success = function(data?: any, message?: string, meta?: ResponseMeta): void {
    const response: ApiResponse = {
      success: true,
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    this.json(response);
  };

  /**
   * Send an error response
   * 
   * @param error - Error message or error envelope
   * @param statusCode - HTTP status code (default: 500)
   * @param details - Additional error details (only in non-production)
   */
  res.error = function(
    error: string | ErrorEnvelope, 
    statusCode: number = 500, 
    details?: any
  ): void {
    const errorEnvelope: ErrorEnvelope = typeof error === 'string' 
      ? { code: 'INTERNAL', message: error }
      : error;

    const response: ApiResponse = {
      success: false,
      error: errorEnvelope,
      timestamp: new Date().toISOString(),
    };

    // Only include details in non-production environments
    if (details && process.env.NODE_ENV !== 'production') {
      response.error!.details = details;
    }

    this.status(statusCode).json(response);
  };

  next();
};

export default responseEnhancer;