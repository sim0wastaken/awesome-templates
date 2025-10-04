/**
 * @fileoverview Request validation middleware
 *
 * Provides Joi-based validation for request segments (query, params, body, headers)
 * with consistent error handling and response formatting.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Joi, { Schema, ValidationErrorItem } from 'joi';
import { ValidationError } from '../errors/httpErrors';

type Segment = 'query' | 'params' | 'body' | 'headers';

export interface ValidateOptions {
  segment?: Segment;
  schema: Schema;
  // Pass-through unknown keys by default to avoid breaking API shape
  joiOptions?: Joi.ValidationOptions;
}

/**
 * Creates an Express middleware that validates a request segment
 * against a provided Joi schema. On error, forwards a typed ValidationError.
 * It merges the validated value back into the original segment
 * without mutating the segment reference (Express v5 getters).
 *
 * Response semantics on error are handled by the centralized error handler,
 * which maps `ValidationError` to a 400 response with a consistent envelope.
 *
 * @param options Validation configuration
 * @param options.segment Request segment to validate ('query', 'params', 'body', 'headers')
 * @param options.schema Joi schema for validation
 * @param options.joiOptions Additional Joi validation options
 * @returns Express middleware function
 */
export function validate({
  segment = 'query',
  schema,
  joiOptions,
}: ValidateOptions) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const valueToValidate = (req as any)[segment];
    const { error, value } = schema.validate(valueToValidate, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
      ...joiOptions,
    });

    if (error) {
      const details = error.details?.map((d: ValidationErrorItem) => ({
        message: d.message,
        path: d.path,
        type: d.type,
        context: d.context,
      }));
      return next(new ValidationError('Invalid request', details));
    }

    // Merge validated values back into segment object
    Object.assign((req as any)[segment], value);
    return next();
  };
}

export default validate;