/**
 * @fileoverview Swagger/OpenAPI configuration
 *
 * Sets up automatic API documentation generation using swagger-jsdoc
 * and swagger-ui-express for interactive API exploration.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MongoDB Service Template API',
      version: '1.0.0',
      description: `
        A production-ready MongoDB repository service template built with TypeScript, Express.js, and Mongoose.
        
        ## Features
        - RESTful API design with consistent response formats
        - Comprehensive input validation and error handling
        - Pagination and filtering support
        - Full-text search capabilities
        - Health monitoring and metrics
        - Rate limiting and security headers
        
        ## Response Format
        All API responses follow a consistent format:
        
        **Success Response:**
        \`\`\`json
        {
          "success": true,
          "message": "Operation completed successfully",
          "data": { ... },
          "timestamp": "2023-12-01T10:00:00.000Z"
        }
        \`\`\`
        
        **Error Response:**
        \`\`\`json
        {
          "success": false,
          "error": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid input provided"
          },
          "details": { ... },
          "timestamp": "2023-12-01T10:00:00.000Z"
        }
        \`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3002',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:00:00.000Z',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input provided',
                },
              },
            },
            details: {
              type: 'object',
              description: 'Additional error details (optional)',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:00:00.000Z',
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              example: 1,
              description: 'Current page number',
            },
            limit: {
              type: 'number',
              example: 20,
              description: 'Items per page',
            },
            total: {
              type: 'number',
              example: 100,
              description: 'Total number of items',
            },
            pages: {
              type: 'number',
              example: 5,
              description: 'Total number of pages',
            },
            hasNext: {
              type: 'boolean',
              example: true,
              description: 'Whether there is a next page',
            },
            hasPrev: {
              type: 'boolean',
              example: false,
              description: 'Whether there is a previous page',
            },
          },
        },
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number for pagination (1-based)',
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of items per page (max 100)',
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input or malformed request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input provided',
                },
                details: {
                  field: 'email',
                  message: 'Email format is invalid',
                },
                timestamp: '2023-12-01T10:00:00.000Z',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
                timestamp: '2023-12-01T10:00:00.000Z',
              },
            },
          },
        },
        Conflict: {
          description: 'Conflict - Resource already exists or business rule violation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error - Unexpected server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'Internal server error',
                },
                timestamp: '2023-12-01T10:00:00.000Z',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'], // paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger documentation for the Express app
 */
export function setupSwagger(app: Express): void {
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}