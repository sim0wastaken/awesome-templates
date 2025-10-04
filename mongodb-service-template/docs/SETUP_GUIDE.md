# MongoDB Service Template - Setup Guide

This guide will walk you through setting up and customizing the MongoDB Service Template for your specific use case.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **MongoDB** >= 4.4 (local installation or cloud service like MongoDB Atlas)
- **npm** or **yarn** package manager
- **Git** (for version control)

## 🚀 Quick Setup

### 1. Get the Template

```bash
# Clone or download the template
git clone <repository-url> my-mongodb-service
cd my-mongodb-service

# Remove the original git history (optional)
rm -rf .git
git init
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=3002
NODE_ENV=development

# Database Configuration - REQUIRED
MONGODB_URI=mongodb://localhost:27017/your-database-name

# Security Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
JSON_BODY_LIMIT=10mb

# Rate Limiting
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=500

# Database Query Limits
MONGO_MAX_TIME_MS=10000
```

### 4. Start Development Server

```bash
npm run dev
```

Your service will be available at:
- **API**: http://localhost:3002
- **Health Check**: http://localhost:3002/health
- **API Documentation**: http://localhost:3002/api-docs

## 🔧 Customization Guide

### Adding Your First Entity

Let's create a `User` entity as an example:

#### 1. Create the Model

Create `src/models/user.model.ts`:

```typescript
import { Schema, model, Document } from 'mongoose';

export interface UserDocument extends Document {
  name: string;
  email: string;
  age?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  age: { type: Number, min: 0, max: 150 },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  versionKey: false,
});

// Add indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text' }); // For text search

export const UserModel = model<UserDocument>('User', userSchema);
```

#### 2. Create the Repository

Create `src/repositories/user.repository.ts`:

```typescript
import { FilterQuery } from 'mongoose';
import { UserDocument, UserModel } from '../models/user.model';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export class UserRepository {
  static async findPaginated(
    filter: FilterQuery<UserDocument>,
    options: { skip: number; limit: number; sort?: Record<string, 1 | -1> }
  ): Promise<PaginatedResult<UserDocument>> {
    const maxTime = parseInt(process.env.MONGO_MAX_TIME_MS || '10000', 10);
    const sort = options.sort ?? { createdAt: -1 };

    const [items, total] = await Promise.all([
      UserModel.find(filter, {}, { maxTimeMS: maxTime })
        .sort(sort)
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
      UserModel.countDocuments(filter).maxTimeMS(maxTime),
    ]);

    return { items: items as UserDocument[], total };
  }

  static async create(userData: Partial<UserDocument>): Promise<UserDocument> {
    return UserModel.create(userData);
  }

  static async findById(id: string): Promise<UserDocument | null> {
    return UserModel.findById(id).lean();
  }

  static async updateById(id: string, update: Partial<UserDocument>): Promise<UserDocument | null> {
    return UserModel.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  static async deleteById(id: string): Promise<UserDocument | null> {
    return UserModel.findByIdAndDelete(id).lean();
  }

  static async findByEmail(email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email }).lean();
  }
}
```

#### 3. Create the Service

Create `src/services/user.service.ts`:

```typescript
import { UserRepository } from '../repositories/user.repository';
import { ConflictError, NotFoundError } from '../errors/httpErrors';

export interface CreateUserInput {
  name: string;
  email: string;
  age?: number;
}

export interface UpdateUserInput {
  name?: string;
  age?: number;
  isActive?: boolean;
}

export interface UserQueryInput {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export class UserService {
  static async list(query: UserQueryInput) {
    const page = Math.max(parseInt(String(query.page || '1')) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(query.limit || '20')) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: any = {};
    
    if (query.search) {
      filter.$or = [
        { name: new RegExp(query.search, 'i') },
        { email: new RegExp(query.search, 'i') },
      ];
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const { items, total } = await UserRepository.findPaginated(filter, {
      skip,
      limit,
      sort: { createdAt: -1 },
    });

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

  static async create(userData: CreateUserInput) {
    // Check if email already exists
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('Email already exists');
    }

    return UserRepository.create(userData);
  }

  static async getById(id: string) {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async updateById(id: string, update: UpdateUserInput) {
    const user = await UserRepository.updateById(id, update);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async deleteById(id: string) {
    const user = await UserRepository.deleteById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }
}
```

#### 4. Create DTOs for Validation

Create `src/types/dto/user.dto.ts`:

```typescript
import Joi from 'joi';
import { ObjectIdDto, PaginationQueryDto } from './common.dto';

export const CreateUserDto = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().lowercase().required(),
  age: Joi.number().integer().min(0).max(150).optional(),
});

export const UpdateUserDto = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  age: Joi.number().integer().min(0).max(150).optional(),
  isActive: Joi.boolean().optional(),
});

export const UserParamsDto = Joi.object({
  id: ObjectIdDto.required(),
});

export const UserQueryDto = Joi.object({
  search: Joi.string().min(1).max(100).trim().optional(),
  isActive: Joi.boolean().optional(),
  ...PaginationQueryDto.describe().keys,
});
```

#### 5. Create the Controller

Create `src/controllers/user.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  static async getUsers(req: Request, res: Response): Promise<void> {
    const result = await UserService.list({
      page: req.query.page as any,
      limit: req.query.limit as any,
      search: req.query.search as string,
      isActive: req.query.isActive as any,
    });
    res.success(result.items, 'Users fetched successfully', {
      pagination: result.pagination,
    });
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    const user = await UserService.create(req.body);
    res.success(user, 'User created successfully');
  }

  static async getUser(req: Request, res: Response): Promise<void> {
    const user = await UserService.getById(req.params.id);
    res.success(user, 'User fetched successfully');
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    const user = await UserService.updateById(req.params.id, req.body);
    res.success(user, 'User updated successfully');
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    await UserService.deleteById(req.params.id);
    res.success(null, 'User deleted successfully');
  }
}
```

#### 6. Create Routes

Create `src/routes/users.ts`:

```typescript
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import asyncHandler from '../middleware/asyncHandler';
import validate from '../middleware/validation';
import { CreateUserDto, UpdateUserDto, UserParamsDto, UserQueryDto } from '../types/dto/user.dto';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         name:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         age:
 *           type: number
 *           example: 30
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and email
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', 
  validate({ segment: 'query', schema: UserQueryDto }),
  asyncHandler(UserController.getUsers)
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 150
 *     responses:
 *       200:
 *         description: User created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/', 
  validate({ segment: 'body', schema: CreateUserDto }),
  asyncHandler(UserController.createUser)
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id',
  validate({ segment: 'params', schema: UserParamsDto }),
  asyncHandler(UserController.getUser)
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               age:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 150
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id',
  validate({ segment: 'params', schema: UserParamsDto }),
  validate({ segment: 'body', schema: UpdateUserDto }),
  asyncHandler(UserController.updateUser)
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id',
  validate({ segment: 'params', schema: UserParamsDto }),
  asyncHandler(UserController.deleteUser)
);

export default router;
```

#### 7. Register Routes

Update `src/routes/index.ts` to include your new routes:

```typescript
import userRoutes from './users';

// Add this line after the existing routes
router.use('/api/users', userRoutes);
```

### Testing Your Implementation

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test the endpoints:**
   ```bash
   # Create a user
   curl -X POST http://localhost:3002/api/users \
     -H "Content-Type: application/json" \
     -d '{"name": "John Doe", "email": "john@example.com", "age": 30}'

   # Get all users
   curl http://localhost:3002/api/users

   # Get user by ID
   curl http://localhost:3002/api/users/{user-id}
   ```

3. **Check API documentation:**
   Visit http://localhost:3002/api-docs to see your new endpoints documented.

## 🧪 Testing Setup

### Unit Tests

Create test files in the `__tests__` directory:

```typescript
// __tests__/user.service.test.ts
import { UserService } from '../src/services/user.service';
import { UserRepository } from '../src/repositories/user.repository';

jest.mock('../src/repositories/user.repository');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const userData = { name: 'John Doe', email: 'john@example.com' };
      const mockUser = { _id: 'user-id', ...userData };

      (UserRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.create(userData);

      expect(UserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(UserRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockUser);
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/user.integration.test.ts
import request from 'supertest';
import { app } from '../src/index';

describe('User API', () => {
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
      expect(response.body.data.email).toBe(userData.email);
    });
  });
});
```

## 🚀 Production Deployment

### Environment Setup

Create production environment file `.env.production`:

```env
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/production-db
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### Build and Start

```bash
# Build the application
npm run build

# Start in production mode
npm start
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb-service:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/production-db
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

## 📊 Monitoring and Logging

### Health Monitoring

The template includes built-in health endpoints:

- `/health` - Basic health check
- `/api/status` - Detailed service information

### Logging

Add structured logging with Winston:

```bash
npm install winston
```

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## 🔧 Advanced Configuration

### Custom Middleware

Add custom middleware in `src/middleware/`:

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/httpErrors';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new UnauthorizedError('Authentication token required');
  }

  // Verify token logic here
  // req.user = decodedUser;
  next();
};
```

### Database Migrations

Create migration scripts in `scripts/migrations/`:

```typescript
// scripts/migrations/001-create-indexes.ts
import { connectToDatabase, disconnectFromDatabase } from '../src/databases/database';
import { UserModel } from '../src/models/user.model';

async function migrate() {
  await connectToDatabase();
  
  // Create indexes
  await UserModel.createIndexes();
  
  console.log('Migration completed successfully');
  await disconnectFromDatabase();
}

migrate().catch(console.error);
```

## 🎯 Next Steps

1. **Customize the template** for your specific domain
2. **Add authentication and authorization** if needed
3. **Implement caching** with Redis for better performance
4. **Add monitoring** with tools like Prometheus and Grafana
5. **Set up CI/CD pipelines** for automated testing and deployment
6. **Configure logging aggregation** with ELK stack or similar
7. **Add API versioning** for backward compatibility
8. **Implement rate limiting per user** instead of per IP

## 📚 Additional Resources

- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/production-notes/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing process: `lsof -ti:3002 | xargs kill -9`

3. **TypeScript Compilation Errors**
   - Run `npm run build` to see detailed errors
   - Check `tsconfig.json` configuration

4. **Test Failures**
   - Ensure test database is properly configured
   - Check if all dependencies are installed
   - Verify test environment variables

For more help, check the logs or create an issue in the repository.