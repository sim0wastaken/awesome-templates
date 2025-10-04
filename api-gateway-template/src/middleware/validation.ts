/**
 * @fileoverview Request validation middleware
 *
 * This middleware provides request validation using Joi schemas for
 * body, query parameters, URL parameters, and headers.
 *
 * @author API Gateway Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors';
import { ValidationSchema } from '../types';

/**
 * Validation middleware factory
 * 
 * @param validationSchema - Validation configuration
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * const createUserSchema = Joi.object({
 *   name: Joi.string().min(2).max(100).required(),
 *   email: Joi.string().email().required(),
 * });
 * 
 * router.post('/users', 
 *   validate({ segment: 'body', schema: createUserSchema }),
 *   asyncHandler(UserController.create)
 * );
 * ```
 */
const validate = (validationSchema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { segment, schema, options = {} } = validationSchema;
    
    // Default validation options
    const validationOptions = {
      allowUnknown: false,
      stripUnknown: true,
      abortEarly: false,
      ...options,
    };

    // Get the data to validate based on segment
    let dataToValidate: any;
    switch (segment) {
      case 'body':
        dataToValidate = req.body;
        break;
      case 'query':
        dataToValidate = req.query;
        break;
      case 'params':
        dataToValidate = req.params;
        break;
      case 'headers':
        dataToValidate = req.headers;
        break;
      default:
        return next(new ValidationError(`Invalid validation segment: ${segment}`));
    }

    // Perform validation
    const { error, value } = schema.validate(dataToValidate, validationOptions);

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(errorMessage, error.details));
    }

    // Replace the original data with the validated (and potentially transformed) data
    switch (segment) {
      case 'body':
        req.body = value;
        break;
      case 'query':
        req.query = value;
        break;
      case 'params':
        req.params = value;
        break;
      case 'headers':
        // Don't replace headers as it might break other middleware
        break;
    }

    next();
  };
};

// ===========================
// COMMON VALIDATION SCHEMAS
// ===========================

/**
 * Common pagination query parameters schema
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Common ID parameter schema
 */
export const idParamSchema = Joi.object({
  id: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
    Joi.number().integer().positive(),          // Integer ID
    Joi.string().uuid()                         // UUID
  ).required(),
});

/**
 * Common search query schema
 */
export const searchQuerySchema = Joi.object({
  query: Joi.string().min(1).max(255).trim().optional(),
  ...paginationSchema.describe().keys,
});

/**
 * Common date range schema
 */
export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
});

/**
 * Validate pagination parameters
 */
export const validatePagination = validate({
  segment: 'query',
  schema: paginationSchema,
});

/**
 * Validate ID parameter
 */
export const validateIdParam = validate({
  segment: 'params',
  schema: idParamSchema,
});

/**
 * Validate search query
 */
export const validateSearchQuery = validate({
  segment: 'query',
  schema: searchQuerySchema,
});

/**
 * Validate date range
 */
export const validateDateRange = validate({
  segment: 'query',
  schema: dateRangeSchema,
});

// ===========================
// VALIDATION HELPERS
// ===========================

/**
 * Create a validation schema for request body
 */
export const validateBody = (schema: Joi.Schema) => validate({
  segment: 'body',
  schema,
});

/**
 * Create a validation schema for query parameters
 */
export const validateQuery = (schema: Joi.Schema) => validate({
  segment: 'query',
  schema,
});

/**
 * Create a validation schema for URL parameters
 */
export const validateParams = (schema: Joi.Schema) => validate({
  segment: 'params',
  schema,
});

/**
 * Create a validation schema for headers
 */
export const validateHeaders = (schema: Joi.Schema) => validate({
  segment: 'headers',
  schema,
});

export default validate;