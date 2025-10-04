/**
 * @fileoverview Health check middleware
 *
 * This middleware provides comprehensive health checking for the API gateway
 * including service availability, system metrics, and overall status.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { createServiceProxies } from '../utils/serviceProxy';
import { HealthCheckResult, ServiceHealthStatus, SystemHealth } from '../types';
import config from '../config';

// Cache for service proxies
let serviceProxies: ReturnType<typeof createServiceProxies> | null = null;

/**
 * Get or create service proxies
 */
function getServiceProxies() {
  if (!serviceProxies) {
    serviceProxies = createServiceProxies();
  }
  return serviceProxies;
}

/**
 * Check system health metrics
 */
function getSystemHealth(): SystemHealth {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    cpu: {
      usage: Math.round(((cpuUsage.user + cpuUsage.system) / 1000000) * 100) / 100,
    },
    uptime: process.uptime(),
  };
}

/**
 * Check health of all configured services
 */
async function checkServicesHealth(): Promise<Record<string, ServiceHealthStatus>> {
  const proxies = getServiceProxies();
  const serviceStatuses: Record<string, ServiceHealthStatus> = {};

  // Check all services in parallel
  const healthChecks = Object.entries(proxies).map(async ([serviceName, proxy]) => {
    const startTime = Date.now();
    
    try {
      const result = await proxy.healthCheck();
      serviceStatuses[serviceName] = {
        status: result.status,
        responseTime: result.responseTime,
        lastChecked: new Date().toISOString(),
        ...(result.error && { error: result.error }),
      };
    } catch (error) {
      serviceStatuses[serviceName] = {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
        lastChecked: new Date().toISOString(),
      };
    }
  });

  // Wait for all health checks to complete (with timeout)
  await Promise.allSettled(healthChecks);
  
  return serviceStatuses;
}

/**
 * Determine overall health status based on service statuses
 */
function determineOverallStatus(services: Record<string, ServiceHealthStatus>): 'healthy' | 'unhealthy' | 'degraded' {
  const statuses = Object.values(services);
  
  if (statuses.length === 0) {
    return 'healthy'; // No services configured
  }

  const healthyCount = statuses.filter(s => s.status === 'healthy').length;
  const totalCount = statuses.length;

  if (healthyCount === totalCount) {
    return 'healthy';
  } else if (healthyCount === 0) {
    return 'unhealthy';
  } else {
    return 'degraded'; // Some services are down
  }
}

/**
 * Health check middleware
 * Provides comprehensive health information about the gateway and its services
 */
const healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Get system health
    const systemHealth = getSystemHealth();
    
    // Check services health
    const servicesHealth = await checkServicesHealth();
    
    // Determine overall status
    const overallStatus = determineOverallStatus(servicesHealth);
    
    const healthResult: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: servicesHealth,
      system: systemHealth,
    };

    // Add response time to the result
    const responseTime = Date.now() - startTime;
    (healthResult as any).responseTime = responseTime;

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(httpStatus).json({
      success: overallStatus !== 'unhealthy',
      data: healthResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Simple health check for basic availability
 */
export const simpleHealthCheck = (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    },
    timestamp: new Date().toISOString(),
  });
};

export default healthCheck;