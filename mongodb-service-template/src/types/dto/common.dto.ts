/**
 * @fileoverview Common DTO schemas for validation
 *
 * Provides reusable Joi validation schemas for common request patterns
 * like pagination, IDs, and standard query parameters.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

import Joi from 'joi';

/**
 * MongoDB ObjectId validation schema
 */
export const ObjectIdDto = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ObjectId format');

/**
 * Pagination query parameters
 */
export const PaginationQueryDto = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Search query parameters
 */
export const SearchQueryDto = Joi.object({
  search: Joi.string().min(1).max(200).trim(),
  ...PaginationQueryDto.describe().keys,
});

/**
 * Sort query parameters
 */
export const SortQueryDto = Joi.object({
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Common ID parameter validation
 */
export const IdParamsDto = Joi.object({
  id: ObjectIdDto.required(),
});

/**
 * Date range query parameters
 */
export const DateRangeQueryDto = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
});

/**
 * Limit query parameter (for endpoints that only need limit)
 */
export const LimitQueryDto = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
});