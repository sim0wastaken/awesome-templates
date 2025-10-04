/**
 * @fileoverview Case conversion utilities
 *
 * Provides utilities for converting object keys between different
 * case formats (camelCase, snake_case, etc.) for API consistency.
 *
 * @author MongoDB Service Template
 * @version 1.0.0
 */

/**
 * Convert a string from snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a string from camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively convert all object keys to camelCase
 */
export function deepCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepCamelCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = deepCamelCase(value);
    }
    return result;
  }

  return obj;
}

/**
 * Recursively convert all object keys to snake_case
 */
export function deepSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepSnakeCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = deepSnakeCase(value);
    }
    return result;
  }

  return obj;
}