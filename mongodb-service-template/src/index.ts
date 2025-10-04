/**
 * @fileoverview Main entry point for MongoDB service template
 *
 * Production-ready Express.js server with MongoDB integration following
 * MVC architecture and industry best practices.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

// Import middleware
import responseHelpers from './middleware/response';
import errorHandler from './middleware/errorHandler';
import notFound from './middleware/notFound';

// Import database connection
import {
    connectToDatabase,
    disconnectFromDatabase,
} from './databases/database';

// Import routes
import routes from './routes';

// Import swagger configuration
import { setupSwagger, swaggerSpec } from './config/swagger';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// ===========================
// ENVIRONMENT CONFIGURATION
// ===========================

const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===========================
// MIDDLEWARE CONFIGURATION
// ===========================

// Security middleware
app.use(
    helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
    })
);

// Compression middleware
app.use(compression());

// CORS middleware
app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:3000',
            'http://localhost:3001',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Body parsing middleware
const jsonLimit = process.env.JSON_BODY_LIMIT || '10mb';
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

// Logging middleware
if (NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10),
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Response helpers
app.use(responseHelpers);

// ===========================
// ROUTES CONFIGURATION
// ===========================

// Setup Swagger documentation
setupSwagger(app);

// Mount all routes
app.use('/', routes);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Central 404 after all routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ===========================
// SERVER STARTUP
// ===========================

/**
 * Start the server
 */
async function startServer(): Promise<void> {
    try {
        // Connect to MongoDB first
        await connectToDatabase();

        // Start the HTTP server
        server.listen(PORT, () => {
            console.log('🚀 MongoDB Service Template started successfully!');
            console.log('='.repeat(50));
            console.log(`📡 Server: http://localhost:${PORT}`);
            console.log(`🗄️  MongoDB: Connected`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log(`⏰ Started at: ${new Date().toISOString()}`);
            console.log('='.repeat(50));
            console.log('📋 Available endpoints:');
            console.log('  GET  /health              - Health check');
            console.log('  GET  /api/status          - Service status');
            console.log('  GET  /api-docs            - API documentation');
            console.log('='.repeat(50));
        });

        // Graceful shutdown handling
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(): Promise<void> {
    console.log('🛑 Received shutdown signal, starting graceful shutdown...');

    // Close HTTP server
    server.close((error) => {
        if (error) {
            console.error('❌ Error closing HTTP server:', error);
        } else {
            console.log('✅ HTTP server closed');
        }
    });

    // Close MongoDB connection
    try {
        await disconnectFromDatabase();
        console.log('✅ MongoDB connection closed');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
    }

    console.log('👋 Graceful shutdown completed');
    process.exit(0);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
});

// Start the server
if (require.main === module) {
    startServer();
}

export { app, server };