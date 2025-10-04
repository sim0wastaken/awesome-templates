/**
 * @fileoverview Tests for error normalizer middleware
 *
 * This file tests the error normalization functionality to ensure
 * consistent error responses across all gateway endpoints.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import errorNormalizer from '../../src/middleware/errorNormalizer';
import { AppError, ValidationError, NotFoundError } from '../../src/errors';

describe('Error Normalizer Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      originalUrl: '/api/test',
      method: 'GET',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  it('should normalize AppError instances', () => {
    const error = new ValidationError('Invalid input', { field: 'name' });

    errorNormalizer(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      },
      timestamp: expect.any(String),
    });
  });

  it('should normalize Joi validation errors', () => {
    const joiError = {
      isJoi: true,
      details: [
        { message: 'name is required' },
        { message: 'email must be valid' },
      ],
    };

    errorNormalizer(joiError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'name is required, email must be valid',
      },
      timestamp: expect.any(String),
    });
  });

  it('should normalize axios response errors', () => {
    const axiosError = {
      response: {
        status: 404,
        data: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
        },
      },
      message: 'Request failed with status code 404',
    };

    errorNormalizer(axiosError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
      timestamp: expect.any(String),
    });
  });

  it('should normalize legacy service errors', () => {
    const legacyError = {
      response: {
        status: 409,
        data: {
          success: false,
          error: 'duplicate key error collection: users index: email_1',
        },
      },
    };

    errorNormalizer(legacyError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'duplicate key error collection: users index: email_1',
      },
      timestamp: expect.any(String),
    });
  });

  it('should normalize MongoDB duplicate key errors', () => {
    const mongoError = {
      code: 11000,
      keyValue: { email: 'test@example.com' },
      message: 'E11000 duplicate key error',
    };

    errorNormalizer(mongoError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'Duplicate email',
      },
      timestamp: expect.any(String),
    });
  });

  it('should normalize Mongoose cast errors', () => {
    const castError = {
      name: 'CastError',
      path: 'id',
      value: 'invalid-id',
      kind: 'ObjectId',
      message: 'Cast to ObjectId failed',
    };

    errorNormalizer(castError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CAST_ERROR',
        message: 'Invalid id: invalid-id',
      },
      timestamp: expect.any(String),
    });
  });

  it('should handle generic errors with status codes', () => {
    const genericError = {
      status: 403,
      message: 'Access denied',
    };

    errorNormalizer(genericError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
      },
      timestamp: expect.any(String),
    });
  });

  it('should handle unknown errors', () => {
    const unknownError = new Error('Something went wrong');

    errorNormalizer(unknownError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong',
      },
      timestamp: expect.any(String),
    });
  });

  it('should include details in non-production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new ValidationError('Invalid input', { field: 'name', value: '' });

    errorNormalizer(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'name', value: '' },
      },
      timestamp: expect.any(String),
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include details in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new ValidationError('Invalid input', { field: 'name', value: '' });

    errorNormalizer(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      },
      timestamp: expect.any(String),
    });

    process.env.NODE_ENV = originalEnv;
  });
});