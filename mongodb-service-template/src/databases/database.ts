/**
 * @fileoverview Database connection configuration for MongoDB service template
 *
 * Handles MongoDB connection setup with proper error handling, retry logic,
 * and health monitoring following production best practices.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/template-database';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Singleton database connection manager for MongoDB.
 *
 * Responsibilities:
 * - Establish and monitor a single Mongoose connection
 * - Expose connection status and server stats for health checks
 * - Provide graceful shutdown hooks on SIGINT/SIGTERM
 * - Handle reconnection logic in development environments
 */
class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance.
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB with retry logic in non-production environments.
   *
   * Applies conservative timeouts and pool sizing appropriate for
   * typical containerized deployments.
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('📍 Already connected to MongoDB');
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI, {
        // Connection options for production readiness
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
      });

      this.isConnected = true;

      console.log('✅ Connected to MongoDB successfully');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(
        `🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`
      );
      console.log(`🌍 Environment: ${NODE_ENV}`);

      // Set up connection event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);

      if (NODE_ENV !== 'production') {
        // Retry connection after 5 seconds in development
        console.log('🔄 Retrying MongoDB connection in 5 seconds...');
        setTimeout(() => this.connect(), 5000);
      } else {
        throw error;
      }
    }
  }

  /**
   * Attach connection and process event listeners for resiliency.
   */
  private setupEventListeners(): void {
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    // Handle process termination
    process.on('SIGINT', () => {
      this.disconnect();
    });

    process.on('SIGTERM', () => {
      this.disconnect();
    });
  }

  /**
   * Close the Mongoose connection gracefully if open.
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('✅ MongoDB connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }

  /**
   * Get current connection status and metadata.
   */
  public getConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
    host?: string;
    port?: number;
    name?: string;
  } {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  }

  /**
   * Get database statistics for monitoring
   */
  public async getStats(): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      const admin = db.admin();
      const stats = await admin.serverStatus();

      return {
        version: stats.version,
        uptime: stats.uptime,
        connections: stats.connections,
        network: stats.network,
        opcounters: stats.opcounters,
        mem: stats.mem,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Comprehensive health check for the database connection
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          details: { error: 'Not connected to database' },
        };
      }

      // Ping the database
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      await db.admin().ping();

      const connectionStatus = this.getConnectionStatus();

      return {
        status: 'healthy',
        details: {
          ...connectionStatus,
          uri: MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

// Export singleton instance
const database = Database.getInstance();

/**
 * Initialize database connection
 */
export const connectToDatabase = async (): Promise<void> => {
  await database.connect();
};

/**
 * Disconnect from database
 */
export const disconnectFromDatabase = async (): Promise<void> => {
  await database.disconnect();
};

/**
 * Get database connection status
 */
export const getDatabaseStatus = () => {
  return database.getConnectionStatus();
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  return database.getStats();
};

/**
 * Perform database health check
 */
export const performHealthCheck = async () => {
  return database.healthCheck();
};

// Export the database instance for direct access if needed
export default database;