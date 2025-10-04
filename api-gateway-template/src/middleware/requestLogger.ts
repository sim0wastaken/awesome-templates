/**
 * @fileoverview Request logging middleware
 *
 * This middleware provides structured request logging with correlation IDs
 * and performance metrics for the API gateway.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import config from '../config';

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request correlation middleware
 * Adds correlation ID to requests for tracking across services
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get correlation ID from header or generate new one
  const correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();
  
  // Add to request object
  (req as any).correlationId = correlationId;
  
  // Add to response headers
  res.set('X-Correlation-ID', correlationId);
  
  // Add start time for performance tracking
  (req as any).startTime = Date.now();
  
  next();
};

/**
 * Custom morgan token for correlation ID
 */
morgan.token('correlation-id', (req: any) => req.correlationId || 'unknown');

/**
 * Custom morgan token for response time in milliseconds
 */
morgan.token('response-time-ms', (req: any, res: Response) => {
  if (!req.startTime) return '0';
  return `${Date.now() - req.startTime}ms`;
});

/**
 * Custom morgan token for request size
 */
morgan.token('req-size', (req: Request) => {
  const contentLength = req.headers['content-length'];
  return contentLength ? `${contentLength}b` : '0b';
});

/**
 * Custom morgan token for response size
 */
morgan.token('res-size', (req: Request, res: Response) => {
  const contentLength = res.get('content-length');
  return contentLength ? `${contentLength}b` : '0b';
});

/**
 * Custom morgan token for user agent
 */
morgan.token('user-agent', (req: Request) => {
  return req.headers['user-agent'] || 'unknown';
});

/**
 * Development logging format
 */
const developmentFormat = [
  ':method :url',
  ':status :response-time-ms',
  ':correlation-id',
  '- :req-size -> :res-size',
].join(' ');

/**
 * Production logging format (JSON)
 */
const productionFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  correlationId: ':correlation-id',
  requestSize: ':req-size',
  responseSize: ':res-size',
  userAgent: ':user-agent',
  remoteAddr: ':remote-addr',
  referrer: ':referrer',
});

/**
 * Request logger middleware
 * Uses different formats based on environment
 */
const requestLogger = config.ENABLE_REQUEST_LOGGING
  ? morgan(
      config.NODE_ENV === 'production' ? productionFormat : developmentFormat,
      {
        // Skip logging for health checks in production
        skip: (req: Request) => {
          if (config.NODE_ENV === 'production' && req.path.includes('/health')) {
            return true;
          }
          return false;
        },
        // Custom stream for structured logging in production
        stream: config.NODE_ENV === 'production' 
          ? {
              write: (message: string) => {
                try {
                  const logData = JSON.parse(message.trim());
                  console.log(JSON.stringify({
                    level: 'info',
                    type: 'http_request',
                    ...logData,
                  }));
                } catch {
                  console.log(message.trim());
                }
              }
            }
          : process.stdout,
      }
    )
  : (req: Request, res: Response, next: NextFunction) => next();

export default requestLogger;