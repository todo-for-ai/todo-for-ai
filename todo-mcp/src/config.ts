import { config } from 'dotenv';
import { TodoConfig } from './types.js';

// Load environment variables
config();

/**
 * Get configuration from environment variables with defaults
 */
export function getConfig(): TodoConfig {
  return {
    apiBaseUrl: process.env.TODO_API_BASE_URL || 'http://localhost:50110',
    apiTimeout: parseInt(process.env.TODO_API_TIMEOUT || '10000', 10),
    apiToken: process.env.TODO_API_TOKEN,
    logLevel: (process.env.LOG_LEVEL as TodoConfig['logLevel']) || 'info',
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: TodoConfig): void {
  if (!config.apiBaseUrl) {
    throw new Error('TODO_API_BASE_URL is required');
  }

  if (!config.apiBaseUrl.startsWith('http')) {
    throw new Error('TODO_API_BASE_URL must be a valid HTTP URL');
  }

  if (config.apiTimeout < 1000) {
    throw new Error('TODO_API_TIMEOUT must be at least 1000ms');
  }

  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }
}

export const CONFIG = getConfig();
validateConfig(CONFIG);
