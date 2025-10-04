/**
 * @fileoverview Cache control middleware
 *
 * This middleware sets appropriate Cache-Control headers based on the request path
 * and method to optimize HTTP caching for the API gateway.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Get cache control directive for a given path
 */
function getCacheControlForPath(path: string, method: string): string {
  // Non-GET requests should not be cached
  if (method !== 'GET') {
    return 'no-store';
  }

  // Health check endpoints - very short cache
  if (path.includes('/health')) {
    return 'public, max-age=5';
  }

  // API documentation - moderate cache
  if (path.includes('/api-docs') || path.endsWith('.json')) {
    return 'public, max-age=60';
  }

  // Real-time endpoints - no cache
  if (path.includes('/socket.io') || path.includes('/chat') || path.includes('/live')) {
    return 'no-store';
  }

  // Search endpoints - short cache
  if (path.includes('/search')) {
    return 'public, max-age=60';
  }

  // List endpoints - moderate cache
  if (path.match(/\/(list|all)$/)) {
    return 'public, max-age=120';
  }

  // Detail endpoints - longer cache
  if (path.match(/\/[^/]+\/\d+$/) || path.match(/\/[^/]+\/[a-f0-9-]{24,}$/)) {
    return 'public, max-age=300';
  }

  // Popular/trending/stats endpoints - longer cache
  if (path.includes('/popular') || path.includes('/trending') || path.includes('/stats')) {
    return 'public, max-age=300, stale-while-revalidate=600';
  }

  // Default for GET requests
  return 'public, max-age=30';
}

/**
 * Cache control middleware
 * Sets appropriate Cache-Control headers based on the request path and method
 */
const cacheControl = (req: Request, res: Response, next: NextFunction): void => {
  const cacheDirective = getCacheControlForPath(req.path, req.method);
  
  // Set Cache-Control header
  res.set('Cache-Control', cacheDirective);
  
  // Set Vary header to prevent cache poisoning
  res.set('Vary', 'Accept-Encoding, Origin');
  
  // Enable conditional requests with ETags (Express handles this automatically)
  // but we ensure strong ETags are used
  if (req.app.get('etag') !== 'strong') {
    req.app.set('etag', 'strong');
  }

  next();
};

export default cacheControl;