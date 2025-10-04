# MongoDB Service Template - Best Practices Guide

This document outlines the best practices enforced by this template and provides guidance on maintaining high code quality, performance, and security standards.

## 🏗️ Architecture Best Practices

### MVC Pattern Implementation

The template enforces a strict MVC (Model-View-Controller) pattern with additional layers:

```
┌─────────────────┐
│     Routes      │ ← API endpoints and request routing
├─────────────────┤
│   Controllers   │ ← Request handling and response formatting
├─────────────────┤
│    Services     │ ← Business logic and validation
├─────────────────┤
│  Repositories   │ ← Data access and database operations
├─────────────────┤
│     Models      │ ← Data structure and schema definitions
└─────────────────┘
```

**Key Principles:**

1. **Single Responsibility**: Each layer has a specific purpose
2. **Dependency Direction**: Upper layers depend on lower layers, never the reverse
3. **Abstraction**: Each layer abstracts the complexity of the layer below
4. **Testability**: Each layer can be tested independently

### Separation of Concerns

```typescript
// ❌ Bad: Business logic in controller
export class UserController {
  static async createUser(req: Request, res: Response) {
    // Validation logic
    if (!req.body.email || !req.body.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Database logic
    const existingUser = await UserModel.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Business logic
    const user = await UserModel.create(req.body);
    res.json({ success: true, data: user });
  }
}

// ✅ Good: Proper separation
export class UserController {
  static async createUser(req: Request, res: Response) {
    const user = await UserService.create(req.body);
    res.success(user, 'User created successfully');
  }
}
```

## 🗄️ Database Best Practices

### Connection Management

```typescript
// ✅ Singleton pattern for database connection
class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Connection pooling configuration
  public async connect(): Promise<void> {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,           // Maximum connections in pool
      serverSelectionTimeoutMS: 5000,  // Timeout for server selection
      socketTimeoutMS: 45000,    // Socket timeout
      family: 4,                 // Use IPv4
    });
  }
}
```

### Query Optimization

```typescript
// ✅ Always use lean() for read-only operations
static async findPaginated(filter: FilterQuery<UserDocument>, options: PaginationOptions) {
  const [items, total] = await Promise.all([
    UserModel.find(filter, {}, { maxTimeMS: maxTime })
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean(), // Returns plain objects, not Mongoose documents
    UserModel.countDocuments(filter).maxTimeMS(maxTime),
  ]);
  return { items, total };
}

// ✅ Use projections to limit returned fields
static async findBasicInfo(filter: FilterQuery<UserDocument>) {
  return UserModel.find(filter, { name: 1, email: 1, createdAt: 1 }).lean();
}

// ✅ Always set query timeouts
static async complexAggregation(pipeline: PipelineStage[]) {
  return UserModel.aggregate(pipeline).option({
    maxTimeMS: parseInt(process.env.MONGO_MAX_TIME_MS || '15000', 10),
  });
}
```

### Indexing Strategy

```typescript
// ✅ Strategic index placement
const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'] },
  createdAt: { type: Date, default: Date.now },
});

// Single field indexes for exact matches
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });

// Compound indexes for common query patterns
userSchema.index({ status: 1, createdAt: -1 }); // Filter by status, sort by date
userSchema.index({ name: 1, email: 1 });        // Search by name and email

// Text index for full-text search
userSchema.index({ name: 'text', email: 'text' });

// Sparse indexes for optional fields
userSchema.index({ lastLoginAt: -1 }, { sparse: true });
```

### Schema Design

```typescript
// ✅ Proper schema design with validation
const userSchema = new Schema({
  // Required fields with validation
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: 'Invalid email format',
    },
  },
  
  // Enums for controlled values
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending',
  },
  
  // Proper data types with constraints
  age: {
    type: Number,
    min: [0, 'Age cannot be negative'],
    max: [150, 'Age cannot exceed 150'],
  },
  
  // Embedded documents for related data
  profile: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
  },
  
  // Arrays with validation
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
}, {
  timestamps: true,    // Automatic createdAt/updatedAt
  versionKey: false,   // Disable __v field
  collection: 'users', // Explicit collection name
});
```

## 🔒 Security Best Practices

### Input Validation

```typescript
// ✅ Comprehensive validation with Joi
export const CreateUserDto = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Name can only contain letters and spaces',
    }),
    
  age: Joi.number()
    .integer()
    .min(0)
    .max(150)
    .optional(),
    
  // Sanitize HTML content
  bio: Joi.string()
    .max(500)
    .custom((value, helpers) => {
      // Remove HTML tags for security
      const sanitized = value.replace(/<[^>]*>/g, '');
      return sanitized;
    })
    .optional(),
});
```

### Error Handling

```typescript
// ✅ Secure error handling - don't leak sensitive information
export const errorHandler = (err: AnyError, req: Request, res: Response, next: NextFunction) => {
  // Log full error details server-side
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id, // If authentication is implemented
  });

  // Send sanitized error to client
  const isOperational = err instanceof AppError || status < 500;
  const safeMessage = isOperational ? err.message : 'Internal server error';
  
  return res.status(status).json({
    success: false,
    error: { code, message: safeMessage },
    details: isOperational ? err.details : null, // Only expose details for operational errors
    timestamp: new Date().toISOString(),
  });
};
```

### Rate Limiting

```typescript
// ✅ Implement different rate limits for different endpoints
const createStrictLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many creation attempts, please try again later',
});

const createGeneralLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});

// Apply different limits to different routes
router.post('/users', createStrictLimiter(), asyncHandler(UserController.createUser));
router.get('/users', createGeneralLimiter(), asyncHandler(UserController.getUsers));
```

## 🚀 Performance Best Practices

### Pagination

```typescript
// ✅ Efficient pagination with proper limits
export class UserService {
  static async list(query: UserQueryInput) {
    // Always enforce reasonable limits
    const page = Math.max(parseInt(String(query.page || '1')) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(String(query.limit || '20')) || 20, 1),
      100 // Never allow more than 100 items per page
    );
    const skip = (page - 1) * limit;

    // Use parallel queries for better performance
    const [items, total] = await Promise.all([
      UserRepository.findPaginated(filter, { skip, limit }),
      UserRepository.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}
```

### Caching Strategy

```typescript
// ✅ Implement caching for frequently accessed data
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes default TTL

export class UserService {
  static async getById(id: string) {
    // Check cache first
    const cacheKey = `user:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Cache the result
    cache.set(cacheKey, user);
    return user;
  }

  static async updateById(id: string, update: UpdateUserInput) {
    const user = await UserRepository.updateById(id, update);
    
    // Invalidate cache
    cache.del(`user:${id}`);
    
    return user;
  }
}
```

### Memory Management

```typescript
// ✅ Proper memory management for large datasets
export class UserService {
  static async exportUsers(filter: FilterQuery<UserDocument>) {
    // Use streams for large datasets
    const cursor = UserModel.find(filter).lean().cursor();
    
    const results: UserDocument[] = [];
    
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      results.push(doc);
      
      // Process in batches to avoid memory issues
      if (results.length >= 1000) {
        await this.processBatch(results);
        results.length = 0; // Clear array
      }
    }
    
    // Process remaining items
    if (results.length > 0) {
      await this.processBatch(results);
    }
  }
}
```

## 🧪 Testing Best Practices

### Unit Testing

```typescript
// ✅ Comprehensive unit tests with mocking
describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const userData = { name: 'John Doe', email: 'john@example.com' };
      const mockUser = { _id: 'user-id', ...userData };

      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.create as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await UserService.create(userData);

      // Assert
      expect(UserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(UserRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictError when email already exists', async () => {
      // Arrange
      const userData = { name: 'John Doe', email: 'john@example.com' };
      const existingUser = { _id: 'existing-id', ...userData };

      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(existingUser);

      // Act & Assert
      await expect(UserService.create(userData)).rejects.toThrow(ConflictError);
      expect(UserRepository.create).not.toHaveBeenCalled();
    });
  });
});
```

### Integration Testing

```typescript
// ✅ Integration tests with test database
describe('User API Integration', () => {
  beforeAll(async () => {
    // Connect to test database
    await connectToTestDatabase();
  });

  afterAll(async () => {
    // Clean up test database
    await UserModel.deleteMany({});
    await disconnectFromTestDatabase();
  });

  beforeEach(async () => {
    // Clean up before each test
    await UserModel.deleteMany({});
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(userData.name);

      // Verify in database
      const userInDb = await UserModel.findOne({ email: userData.email });
      expect(userInDb).toBeTruthy();
    });
  });
});
```

## 📊 Monitoring and Logging

### Structured Logging

```typescript
// ✅ Structured logging with context
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mongodb-service-template' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Usage in services
export class UserService {
  static async create(userData: CreateUserInput) {
    logger.info('Creating new user', { 
      email: userData.email,
      hasAge: !!userData.age,
    });

    try {
      const user = await UserRepository.create(userData);
      
      logger.info('User created successfully', {
        userId: user._id,
        email: user.email,
      });
      
      return user;
    } catch (error) {
      logger.error('Failed to create user', {
        email: userData.email,
        error: error.message,
      });
      throw error;
    }
  }
}
```

### Health Monitoring

```typescript
// ✅ Comprehensive health checks
export class HealthService {
  static async getDetailedHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDiskSpace(),
      this.checkExternalServices(),
    ]);

    const results = {
      status: 'healthy' as 'healthy' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: this.getCheckResult(checks[0]),
        memory: this.getCheckResult(checks[1]),
        disk: this.getCheckResult(checks[2]),
        external: this.getCheckResult(checks[3]),
      },
    };

    // Determine overall status
    const hasUnhealthyCheck = Object.values(results.checks)
      .some(check => check.status === 'unhealthy');
    
    if (hasUnhealthyCheck) {
      results.status = 'unhealthy';
    }

    return results;
  }

  private static async checkMemory() {
    const usage = process.memoryUsage();
    const maxHeap = 1024 * 1024 * 1024; // 1GB threshold
    
    return {
      status: usage.heapUsed < maxHeap ? 'healthy' : 'unhealthy',
      details: {
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      },
    };
  }
}
```

## 🔄 Code Quality Standards

### TypeScript Configuration

```json
// ✅ Strict TypeScript configuration
{
  "compilerOptions": {
    "strict": true,                    // Enable all strict type checking
    "noImplicitAny": true,            // Error on implicit any
    "strictNullChecks": true,         // Strict null checks
    "noImplicitReturns": true,        // Error on missing return statements
    "noFallthroughCasesInSwitch": true, // Error on fallthrough cases
    "noUncheckedIndexedAccess": true, // Add undefined to index signatures
    "exactOptionalPropertyTypes": true // Strict optional properties
  }
}
```

### ESLint Rules

```javascript
// ✅ Comprehensive ESLint configuration
module.exports = {
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
  },
};
```

### Code Documentation

```typescript
// ✅ Comprehensive JSDoc documentation
/**
 * Creates a new user in the system
 * 
 * @param userData - The user data to create
 * @param userData.name - User's full name (2-100 characters)
 * @param userData.email - User's email address (must be unique)
 * @param userData.age - User's age (optional, 0-150)
 * @returns Promise resolving to the created user document
 * @throws {ConflictError} When email already exists
 * @throws {ValidationError} When input data is invalid
 * 
 * @example
 * ```typescript
 * const user = await UserService.create({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   age: 30
 * });
 * ```
 */
export class UserService {
  static async create(userData: CreateUserInput): Promise<UserDocument> {
    // Implementation...
  }
}
```

## 🚀 Deployment Best Practices

### Environment Configuration

```typescript
// ✅ Environment-specific configurations
const config = {
  development: {
    database: {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    },
    logging: {
      level: 'debug',
      console: true,
    },
    security: {
      rateLimitMax: 1000,
      corsOrigins: ['http://localhost:3000'],
    },
  },
  
  production: {
    database: {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 30000,
    },
    logging: {
      level: 'info',
      console: false,
    },
    security: {
      rateLimitMax: 100,
      corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    },
  },
};

export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return config[env as keyof typeof config] || config.development;
};
```

### Docker Best Practices

```dockerfile
# ✅ Multi-stage Docker build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

EXPOSE 3002
CMD ["npm", "start"]
```

## 📈 Performance Monitoring

### Metrics Collection

```typescript
// ✅ Custom metrics for monitoring
export class MetricsService {
  private static requestCount = 0;
  private static errorCount = 0;
  private static responseTimeSum = 0;

  static recordRequest(duration: number, success: boolean) {
    this.requestCount++;
    this.responseTimeSum += duration;
    
    if (!success) {
      this.errorCount++;
    }
  }

  static getMetrics() {
    return {
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        successRate: this.requestCount > 0 
          ? ((this.requestCount - this.errorCount) / this.requestCount) * 100 
          : 100,
      },
      performance: {
        averageResponseTime: this.requestCount > 0 
          ? this.responseTimeSum / this.requestCount 
          : 0,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };
  }
}

// Middleware to collect metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;
    MetricsService.recordRequest(duration, success);
  });
  
  next();
};
```

This comprehensive best practices guide ensures that your MongoDB service maintains high standards for security, performance, maintainability, and scalability. Follow these patterns consistently to build robust, production-ready applications.