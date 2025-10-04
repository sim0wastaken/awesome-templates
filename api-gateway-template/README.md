# API Gateway Template

A production-ready, best-practices API Gateway template built with TypeScript, Express.js, and microservices integration patterns. This template provides a solid foundation for building scalable, maintainable API gateways that coordinate between frontend applications and multiple backend microservices.

## 🚀 Features

- **Production-Ready Architecture**: Clean separation of concerns with proper error handling
- **Type Safety**: Full TypeScript support with strict configuration
- **Service Integration**: Built-in service proxy utilities with retry logic and circuit breaker patterns
- **Error Handling**: Centralized error normalization with consistent API responses
- **Security**: Helmet, CORS, rate limiting, and input validation
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Testing**: Jest setup with TypeScript support and integration testing patterns
- **Development Tools**: Hot reload, linting, formatting, and pre-commit hooks
- **Monitoring**: Health checks, metrics, and structured logging
- **Performance**: HTTP caching, response compression, and request correlation
- **Scalability**: Service aggregation, data enrichment, and graceful degradation

## 📁 Project Structure

```
api-gateway-template/
├── src/
│   ├── config/           # Configuration management
│   ├── errors/          # Error classes and normalization
│   ├── middleware/      # Express middleware (validation, caching, etc.)
│   ├── routes/          # API route definitions
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (service proxy, etc.)
│   └── index.ts         # Application entry point
├── __tests__/           # Test files
├── docs/               # Additional documentation
├── .env.example        # Environment variables template
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Testing configuration
└── README.md           # This file
```

## 🛠 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Backend microservices to integrate with

### Installation

1. **Clone or download this template**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your service URLs and configuration
   ```

4. **Configure your services:**
   Edit `src/config/index.ts` to match your microservices:
   ```typescript
   SERVICES: {
     userService: {
       url: process.env.USER_SERVICE_URL || 'http://localhost:8080',
       timeout: 15000,
       retries: 3,
     },
     productService: {
       url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
       timeout: 10000,
       retries: 2,
     },
     // Add more services as needed
   }
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Access your gateway:**
   - API: http://localhost:3001
   - Health Check: http://localhost:3001/health
   - API Documentation: http://localhost:3001/api-docs

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Microservice URLs (Update these to match your services)
SERVICE_A_URL=http://localhost:8080
SERVICE_B_URL=http://localhost:3002
SERVICE_C_URL=http://localhost:3003

# Request Configuration
REQUEST_TIMEOUT=30000
RETRY_ATTEMPTS=3
DEFAULT_LIMIT=20
MAX_LIMIT=100

# Caching Configuration
ENABLE_CACHE=true
CACHE_TTL=300

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Security Configuration
JSON_BODY_LIMIT=10mb
```

## 📚 Usage Guide

### 1. Define Your Service Configuration

Update the service configuration in `src/config/index.ts`:

```typescript
SERVICES: {
  userService: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:8080',
    timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '15000', 10),
    retries: parseInt(process.env.USER_SERVICE_RETRIES || '3', 10),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  productService: {
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    timeout: parseInt(process.env.PRODUCT_SERVICE_TIMEOUT || '10000', 10),
    retries: parseInt(process.env.PRODUCT_SERVICE_RETRIES || '2', 10),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
}
```

### 2. Create Route Handlers

Create new route files in `src/routes/`:

```typescript
// src/routes/users.ts
import { Router } from 'express';
import { createServiceProxies } from '../utils/serviceProxy';
import { asyncHandler, validateQuery, validateParams } from '../middleware';

const router = Router();
const serviceProxies = createServiceProxies();

router.get('/', 
  validateQuery(userListSchema),
  asyncHandler(async (req, res) => {
    const response = await serviceProxies.userService.get('/api/users', req.query);
    res.success(response.data, 'Users retrieved successfully');
  })
);

router.get('/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const response = await serviceProxies.userService.get(`/api/users/${req.params.id}`);
    res.success(response.data, 'User retrieved successfully');
  })
);

export default router;
```

### 3. Aggregate Data from Multiple Services

Use the built-in aggregation utilities:

```typescript
import { aggregateServiceData, enrichData } from '../utils/serviceProxy';

// Aggregate data from multiple services
const aggregatedData = await aggregateServiceData([
  {
    service: serviceProxies.userService,
    path: '/api/users',
    params: req.query,
    key: 'users',
  },
  {
    service: serviceProxies.profileService,
    path: '/api/profiles',
    params: { userIds: userIds.join(',') },
    key: 'profiles',
  },
]);

// Enrich base data with additional information
const enrichedUser = await enrichData(baseUser, [
  {
    service: serviceProxies.profileService,
    path: `/api/profiles/${baseUser.id}`,
    key: 'profile',
  },
  {
    service: serviceProxies.activityService,
    path: `/api/activities/${baseUser.id}`,
    key: 'recentActivity',
  },
]);
```

### 4. Add Validation Schemas

Define validation schemas using Joi:

```typescript
import Joi from 'joi';

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18).max(120).optional(),
});

const userQuerySchema = Joi.object({
  search: Joi.string().min(1).max(255).trim().optional(),
  role: Joi.string().valid('admin', 'user', 'moderator').optional(),
  ...paginationSchema.describe().keys,
});
```

### 5. Mount Your Routes

Add your routes to the main router in `src/routes/index.ts`:

```typescript
import userRoutes from './users';
import productRoutes from './products';

router.use('/users', userRoutes);
router.use('/products', productRoutes);
```

## 🧪 Testing

Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Example Test

```typescript
// __tests__/routes/users.test.ts
import request from 'supertest';
import app from '../../src/index';

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('should return list of users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
```

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001
CMD ["npm", "start"]
```

### Environment-Specific Configuration

```bash
# Development
NODE_ENV=development npm run dev

# Production
NODE_ENV=production npm start

# Testing
NODE_ENV=test npm test
```

## 📖 Best Practices Enforced

### 1. **Architecture**
- Clean separation between routes, services, and utilities
- Service proxy pattern for backend integration
- Centralized error handling and response formatting
- Middleware-based request processing pipeline

### 2. **Service Integration**
- Automatic retry logic with exponential backoff
- Circuit breaker pattern for failing services
- Graceful degradation when services are unavailable
- Request correlation tracking across services

### 3. **Security**
- Input validation with Joi schemas
- Rate limiting with configurable thresholds
- CORS protection with configurable origins
- Security headers with Helmet
- Request sanitization and error message filtering

### 4. **Performance**
- HTTP caching with appropriate cache headers
- Response compression for large payloads
- Connection pooling for service requests
- Parallel service requests where possible

### 5. **Monitoring**
- Comprehensive health checks for all services
- Structured request/response logging
- Performance metrics and timing
- Error tracking and correlation

### 6. **Code Quality**
- TypeScript for type safety and better IDE support
- ESLint and Prettier for code consistency
- Pre-commit hooks with Husky and lint-staged
- Comprehensive test coverage requirements

## 🔄 Customization Guide

### Adding New Services

1. **Update configuration** in `src/config/index.ts`:
   ```typescript
   newService: {
     url: process.env.NEW_SERVICE_URL || 'http://localhost:8080',
     timeout: 15000,
     retries: 3,
     headers: { /* custom headers */ },
   }
   ```

2. **Create route handlers** in `src/routes/newService.ts`
3. **Add validation schemas** for request/response validation
4. **Mount routes** in `src/routes/index.ts`
5. **Add tests** in `__tests__/routes/newService.test.ts`
6. **Update documentation** with new endpoints

### Custom Middleware

```typescript
// src/middleware/customAuth.ts
export const customAuth = (req: Request, res: Response, next: NextFunction) => {
  // Custom authentication logic
  const token = req.headers.authorization;
  
  if (!token) {
    return next(new AuthenticationError('Token required'));
  }
  
  // Validate token and add user to request
  req.user = validateToken(token);
  next();
};
```

### Service-Specific Error Handling

```typescript
// Handle service-specific errors
try {
  const response = await serviceProxies.userService.get('/api/users');
  res.success(response.data);
} catch (error) {
  if (error.status === 404) {
    throw new NotFoundError('Users not found');
  }
  if (error.isTimeout) {
    throw new TimeoutError('User service is slow to respond');
  }
  throw error; // Let error normalizer handle it
}
```

## 📝 API Documentation

The gateway automatically generates Swagger documentation available at `/api-docs`. The documentation includes:

- All available endpoints with request/response schemas
- Authentication requirements
- Rate limiting information
- Error response formats
- Example requests and responses

Update JSDoc comments in your route files to enhance the documentation:

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get list of users
 *     description: Retrieves paginated list of users from the user service
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
```

## 🤝 Contributing

1. Follow the established patterns and conventions
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all linting and tests pass
5. Use conventional commit messages

## 📄 License

This template is provided as-is for educational and development purposes.

---

## 🔗 Related Templates

- [MongoDB Service Template](../mongodb-service-template/) - For MongoDB-based microservices
- [PostgreSQL Service Template](../postgresql-service-template/) - For PostgreSQL-based microservices
- [Chat Service Template](../chat-service-template/) - For real-time messaging services

## 📞 Support

For questions, issues, or contributions, please refer to the project documentation or create an issue in the repository.