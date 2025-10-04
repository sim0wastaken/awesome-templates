/**
 * @fileoverview Main entry point for the API Gateway Server
 *
 * This is the primary Express.js application that serves as a centralized API gateway
 * for microservices architecture. It coordinates communication between frontend
 * applications and multiple backend microservices.
 *
 * Architecture:
 * Frontend → API Gateway (Express.js) → Microservices
 *                                    ├── Service A
 *                                    ├── Service B
 *                                    └── Service C
 *
 * The server provides:
 * - Unified API routing and request proxying
 * - Cross-service data aggregation and enrichment
 * - Centralized error handling and logging
 * - CORS configuration for frontend access
 * - Health monitoring and service status checks
 * - Request/response transformation and validation
 * - HTTP caching and rate limiting
 * - API documentation with Swagger
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import config from './config';
import routes from './routes';
import {
  errorNormalizer,
  responseEnhancer,
  cacheControl,
  healthCheck,
  notFound,
  methodResolver,
  requestLogger,
  correlationMiddleware,
  defaultRateLimiter,
} from './middleware';

// Create Express application and HTTP server
const app = express();
const server = http.createServer(app);

// ===========================
// SWAGGER CONFIGURATION
// ===========================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gateway Template',
      version: '1.0.0',
      description: `
        Production-ready API Gateway template for microservices architecture.
        This gateway provides unified access to multiple backend services with
        features like request routing, data aggregation, caching, and monitoring.
      `,
      contact: {
        name: 'API Gateway Template',
        url: 'https://github.com/your-org/api-gateway-template',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Optional bearer authentication for protected endpoints',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
            },
            data: {
              type: 'object',
              description: 'Response data payload',
            },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            services: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  responseTime: { type: 'number' },
                  error: { type: 'string' },
                  lastChecked: { type: 'string', format: 'date-time' },
                },
              },
            },
            system: {
              type: 'object',
              properties: {
                memory: {
                  type: 'object',
                  properties: {
                    used: { type: 'number' },
                    total: { type: 'number' },
                    percentage: { type: 'number' },
                  },
                },
                cpu: {
                  type: 'object',
                  properties: {
                    usage: { type: 'number' },
                  },
                },
                uptime: { type: 'number' },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Forbidden: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, 'routes', '*.ts')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ===========================
// SECURITY AND MIDDLEWARE
// ===========================

/**
 * Security middleware - sets various HTTP headers to secure the app
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
  })
);

/**
 * CORS configuration - allows frontend applications to access the API
 */
app.use(
  cors({
    origin: config.CORS.origins,
    credentials: config.CORS.credentials,
    methods: config.CORS.methods,
    allowedHeaders: config.CORS.allowedHeaders,
  })
);

/**
 * Rate limiting - protects against abuse and DDoS attacks
 */
app.use('/api/', defaultRateLimiter);

/**
 * Request parsing middleware
 */
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Response compression - reduces bandwidth usage
 */
app.use(compression());

/**
 * Request correlation and logging
 */
app.use(correlationMiddleware);
app.use(requestLogger);

/**
 * Response enhancement - adds helper methods to response object
 */
app.use(responseEnhancer);

/**
 * Cache control - sets appropriate caching headers
 */
app.use(cacheControl);

// Ensure strong ETag generation for conditional GETs (304 Not Modified)
app.set('etag', 'strong');

// ===========================
// HEALTH CHECK ENDPOINTS
// ===========================

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Comprehensive health check
 *     description: Returns detailed health information about the gateway and all connected services
 *     responses:
 *       200:
 *         description: Health check results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// ===========================
// API ROUTES
// ===========================

// Mount API routes
app.use('/api', routes);

// Method not allowed resolver (405) for known paths
app.use('/api', methodResolver);

// ===========================
// API DOCUMENTATION
// ===========================

// Swagger UI setup with custom styling
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; }
  `,
  customSiteTitle: 'API Gateway Documentation',
  swaggerOptions: {
    filter: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
  },
};

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// JSON API specification endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ===========================
// UTILITY ENDPOINTS
// ===========================

/**
 * @swagger
 * /api/info:
 *   get:
 *     tags: [Gateway]
 *     summary: API gateway information
 *     description: Returns basic information about the API gateway and available endpoints
 *     responses:
 *       200:
 *         description: Gateway information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'API Gateway Template',
      version: '1.0.0',
      description: 'Production-ready API Gateway for microservices architecture',
      documentation: `${req.protocol}://${req.get('host')}/api-docs`,
      endpoints: {
        health: '/health - Service health check',
        info: '/api/info - Gateway information',
        docs: '/api-docs - API documentation',
      },
      services: Object.keys(config.SERVICES).reduce((acc, serviceName) => {
        acc[serviceName] = config.SERVICES[serviceName].url;
        return acc;
      }, {} as Record<string, string>),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Gateway]
 *     summary: Root endpoint
 *     description: Returns basic gateway information and links to documentation
 *     responses:
 *       200:
 *         description: Gateway welcome message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'API Gateway Template',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      documentation: '/api-docs',
      health: '/health',
      info: '/api/info',
    },
    timestamp: new Date().toISOString(),
  });
});

// ===========================
// ERROR HANDLING
// ===========================

// 404 handler for unknown routes
app.use(notFound);

// Final error handler
app.use(errorNormalizer);

// ===========================
// SERVER STARTUP
// ===========================

const PORT = config.PORT;

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server (skip when running tests)
if (config.NODE_ENV !== 'test') {
  server.listen(PORT, config.HOST, () => {
    console.log(`
🚀 API Gateway Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server running on: http://${config.HOST}:${PORT}
📚 API Documentation: http://${config.HOST}:${PORT}/api-docs
🏥 Health Check: http://${config.HOST}:${PORT}/health
ℹ️  API Info: http://${config.HOST}:${PORT}/api/info
🔧 Environment: ${config.NODE_ENV}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configured Services:
${Object.entries(config.SERVICES)
  .map(([name, service]) => `   • ${name}: ${service.url}`)
  .join('\n')}

🛡️  Security Features:
   • CORS enabled for: ${config.CORS.origins.join(', ')}
   • Rate limiting: ${config.RATE_LIMIT_MAX} requests per ${config.RATE_LIMIT_WINDOW / 60000} minutes
   • Helmet security headers enabled
   • Request validation and sanitization

⚡ Performance Features:
   • Response compression enabled
   • HTTP caching with ETags
   • Request correlation tracking
   • Health monitoring for all services

Ready to handle requests! 🎯
`);
  });
}

export default app;