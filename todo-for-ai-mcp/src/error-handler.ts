import { logger } from './logger.js';

export class McpError extends Error {
  public readonly code: string;
  public readonly statusCode: number | undefined;
  public readonly details: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode?: number, details?: any) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends McpError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ApiConnectionError extends McpError {
  constructor(message: string, details?: any) {
    super(message, 'API_CONNECTION_ERROR', 503, details);
    this.name = 'ApiConnectionError';
  }
}

export class AuthenticationError extends McpError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends McpError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND_ERROR', 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    
    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
        stack: reason.stack,
      } : reason,
      promise: promise.toString(),
    });
    
    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

/**
 * Validate required arguments for MCP tools
 */
export function validateArgs(args: any, requiredFields: string[]): void {
  if (!args || typeof args !== 'object') {
    throw new ValidationError('Arguments must be an object');
  }

  const missingFields = requiredFields.filter(field => !(field in args) || args[field] === undefined || args[field] === null);
  
  if (missingFields.length > 0) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`, {
      missingFields,
      providedFields: Object.keys(args),
    });
  }
}

/**
 * Sanitize error for client response
 */
export function sanitizeError(error: Error): any {
  if (error instanceof McpError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  // Don't expose internal error details to clients
  return {
    error: 'An internal error occurred',
    code: 'INTERNAL_ERROR',
  };
}

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`Error in ${context}:`, error);
      throw error;
    }
  };
}
