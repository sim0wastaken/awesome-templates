# MongoDB Service Template

A production-ready, best-practices MongoDB repository service template built with TypeScript, Express.js, and Mongoose. This template provides a solid foundation for building scalable, maintainable MongoDB-based microservices.

## 🚀 Features

- **Production-Ready Architecture**: MVC pattern with proper separation of concerns
- **Type Safety**: Full TypeScript support with strict configuration
- **Database Management**: Mongoose ODM with connection pooling and health checks
- **Error Handling**: Centralized error handling with consistent API responses
- **Security**: Helmet, CORS, rate limiting, and input validation
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Testing**: Jest setup with TypeScript support
- **Development Tools**: Hot reload, linting, formatting, and pre-commit hooks
- **Monitoring**: Health checks, metrics, and structured logging
- **Scalability**: Optimized queries, pagination, and performance best practices

## 📁 Project Structure

```
mongodb-service-template/
├── src/
│   ├── config/           # Configuration files (Swagger, etc.)
│   ├── controllers/      # Request handlers (thin layer)
│   ├── databases/        # Database connection and management
│   ├── errors/          # Custom error classes
│   ├── middleware/      # Express middleware (validation, error handling)
│   ├── models/          # Mongoose schemas and models
│   ├── repositories/    # Data access layer
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── types/           # TypeScript type definitions and DTOs
│   ├── utils/           # Utility functions
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
- MongoDB >= 4.4
- npm or yarn

### Installation

1. **Clone or download this template**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string and other settings
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access your service:**
   - API: http://localhost:3002
   - Health Check: http://localhost:3002/health
   - API Documentation: http://localhost:3002/api-docs

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3002
NODE_ENV=development

# Database Configuration
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

## 📚 Usage Guide

### 1. Define Your Data Model

Create a Mongoose schema in `src/models/`:

```typescript
// src/models/user.model.ts
import { Schema, model, Document } from 'mongoose';

export interface UserDocument extends Document {
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
}, {
  timestamps: true,
  versionKey: false,
});

// Add indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

export const UserModel = model<UserDocument>('User', userSchema);
```

### 2. Create Repository Layer

Implement data access logic in `src/repositories/`:

```typescript
// src/repositories/user.repository.ts
import { FilterQuery } from 'mongoose';
import { UserDocument, UserModel } from '../models/user.model';

export class UserRepository {
  static async findPaginated(
    filter: FilterQuery<UserDocument>,
    options: { skip: number; limit: number; sort?: Record<string, 1 | -1> }
  ) {
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

  static async create(userData: Partial<UserDocument>) {
    return UserModel.create(userData);
  }

  static async findById(id: string) {
    return UserModel.findById(id).lean();
  }

  static async updateById(id: string, update: Partial<UserDocument>) {
    return UserModel.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  static async deleteById(id: string) {
    return UserModel.findByIdAndDelete(id).lean();
  }
}
```

### 3. Implement Business Logic

Add service layer in `src/services/`:

```typescript
// src/services/user.service.ts
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  static async list(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
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

  static async create(userData: { name: string; email: string }) {
    return UserRepository.create(userData);
  }

  static async getById(id: string) {
    const user = await UserRepository.findById(id);
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return user;
  }

  static async updateById(id: string, update: Partial<{ name: string; email: string }>) {
    const user = await UserRepository.updateById(id, update);
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return user;
  }

  static async deleteById(id: string) {
    const user = await UserRepository.deleteById(id);
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return user;
  }
}
```

### 4. Create Controllers

Add request handlers in `src/controllers/`:

```typescript
// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  static async getUsers(req: Request, res: Response): Promise<void> {
    const result = await UserService.list({
      page: req.query.page as any,
      limit: req.query.limit as any,
      search: req.query.search as string,
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

### 5. Define Routes

Create API routes in `src/routes/`:

```typescript
// src/routes/users.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import asyncHandler from '../middleware/asyncHandler';
import validate from '../middleware/validation';
import { CreateUserDto, UpdateUserDto, UserParamsDto } from '../types/dto/user.dto';

const router = Router();

router.get('/', asyncHandler(UserController.getUsers));
router.post('/', 
  validate({ segment: 'body', schema: CreateUserDto }),
  asyncHandler(UserController.createUser)
);
router.get('/:id',
  validate({ segment: 'params', schema: UserParamsDto }),
  asyncHandler(UserController.getUser)
);
router.put('/:id',
  validate({ segment: 'params', schema: UserParamsDto }),
  validate({ segment: 'body', schema: UpdateUserDto }),
  asyncHandler(UserController.updateUser)
);
router.delete('/:id',
  validate({ segment: 'params', schema: UserParamsDto }),
  asyncHandler(UserController.deleteUser)
);

export default router;
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
```

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3002
CMD ["npm", "start"]
```

## 📖 Best Practices Enforced

### 1. **Architecture**
- MVC pattern with clear separation of concerns
- Repository pattern for data access abstraction
- Service layer for business logic
- Middleware for cross-cutting concerns

### 2. **Database**
- Connection pooling and health monitoring
- Query optimization with indexes
- Pagination and result limiting
- Graceful error handling and timeouts

### 3. **Security**
- Input validation with Joi schemas
- Rate limiting and CORS protection
- Helmet for security headers
- Environment-based configuration

### 4. **Performance**
- Lean queries for better performance
- Proper indexing strategies
- Connection pooling
- Response compression

### 5. **Monitoring**
- Health check endpoints
- Structured error responses
- Request/response logging
- Memory and uptime metrics

### 6. **Code Quality**
- TypeScript for type safety
- ESLint and Prettier for code consistency
- Pre-commit hooks with Husky
- Comprehensive test coverage

## 🔄 Customization Guide

### Adding New Entities

1. Create model in `src/models/`
2. Implement repository in `src/repositories/`
3. Add business logic in `src/services/`
4. Create controller in `src/controllers/`
5. Define routes in `src/routes/`
6. Add validation DTOs in `src/types/dto/`
7. Update main routes in `src/routes/index.ts`

### Environment-Specific Configuration

Modify `src/config/` files for different environments:
- Development: Enhanced logging, relaxed security
- Production: Optimized performance, strict security
- Testing: In-memory database, mocked services

## 📝 API Documentation

The service automatically generates Swagger documentation available at `/api-docs`. Update JSDoc comments in your route files to enhance the documentation.

## 🤝 Contributing

1. Follow the established patterns and conventions
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all linting and tests pass

## 📄 License

This template is provided as-is for educational and development purposes.