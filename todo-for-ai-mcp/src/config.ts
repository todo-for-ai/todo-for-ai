import { config } from 'dotenv';
import { TodoConfig } from './types.js';

// Load environment variables
config();

function parseArgs(): { [key: string]: string } {
  const args: { [key: string]: string } = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++; // Skip the value in next iteration
      } else {
        args[key] = 'true'; // Boolean flag
      }
    }
  }

  return args;
}

/**
 * Get configuration from command line arguments, environment variables, or defaults
 * Priority: CLI args > Environment variables > Defaults
 */
export function getConfig(): TodoConfig {
  console.log('[CONFIG] Starting configuration initialization...');

  // Parse command line arguments
  const args = parseArgs();
  console.log('[CONFIG] Command line arguments:', Object.keys(args).length > 0 ? args : 'none');

  // Log all relevant environment variables
  const envVars = {
    TODO_API_BASE_URL: process.env.TODO_API_BASE_URL,
    TODO_API_TIMEOUT: process.env.TODO_API_TIMEOUT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    TODO_API_TOKEN: process.env.TODO_API_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    PWD: process.env.PWD
  };

  console.log('[CONFIG] Environment variables detected:', {
    TODO_API_BASE_URL: envVars.TODO_API_BASE_URL || 'undefined',
    TODO_API_TIMEOUT: envVars.TODO_API_TIMEOUT || 'undefined',
    LOG_LEVEL: envVars.LOG_LEVEL || 'undefined',
    TODO_API_TOKEN: envVars.TODO_API_TOKEN ? `${envVars.TODO_API_TOKEN.substring(0, 8)}...` : 'NOT_SET',
    NODE_ENV: envVars.NODE_ENV || 'undefined',
    PWD: envVars.PWD || 'undefined'
  });

  // Priority: CLI args > Environment variables > Defaults
  let apiBaseUrl = args['api-base-url'] || args['base-url'] || process.env.TODO_API_BASE_URL || 'http://localhost:50110/todo-for-ai/api/v1';

  // Normalize baseURL - ensure it doesn't end with a slash for consistent axios behavior
  if (apiBaseUrl.endsWith('/')) {
    apiBaseUrl = apiBaseUrl.slice(0, -1);
  }

  const config: TodoConfig = {
    apiBaseUrl,
    apiTimeout: parseInt(args['api-timeout'] || args['timeout'] || process.env.TODO_API_TIMEOUT || '10000', 10),
    logLevel: (args['log-level'] || process.env.LOG_LEVEL || 'info') as TodoConfig['logLevel'],
  };

  console.log('[CONFIG] Base configuration created:', {
    apiBaseUrl: config.apiBaseUrl,
    apiTimeout: config.apiTimeout,
    logLevel: config.logLevel,
    isDefaultBaseUrl: !args['api-base-url'] && !args['base-url'] && !process.env.TODO_API_BASE_URL,
    isDefaultTimeout: !args['api-timeout'] && !args['timeout'] && !process.env.TODO_API_TIMEOUT,
    isDefaultLogLevel: !args['log-level'] && !process.env.LOG_LEVEL,
    configSource: {
      baseUrl: args['api-base-url'] || args['base-url'] ? 'args' : (process.env.TODO_API_BASE_URL ? 'env' : 'default'),
      timeout: args['api-timeout'] || args['timeout'] ? 'args' : (process.env.TODO_API_TIMEOUT ? 'env' : 'default'),
      logLevel: args['log-level'] ? 'args' : (process.env.LOG_LEVEL ? 'env' : 'default')
    }
  });

  // Handle API token - Priority: CLI args > Environment variables
  const apiToken = args['api-token'] || args['token'] || process.env.TODO_API_TOKEN;

  if (apiToken) {
    config.apiToken = apiToken;
    console.log('[CONFIG] API token found and added to config:', {
      tokenLength: config.apiToken.length,
      tokenPrefix: config.apiToken.substring(0, 8) + '...',
      tokenSuffix: '...' + config.apiToken.substring(config.apiToken.length - 4),
      tokenSource: args['api-token'] || args['token'] ? 'args' : 'env'
    });
  } else {
    console.log('[CONFIG] No API token found in command line arguments or environment variables');
  }

  console.log('[CONFIG] Final configuration summary:', {
    apiBaseUrl: config.apiBaseUrl,
    apiTimeout: config.apiTimeout,
    logLevel: config.logLevel,
    hasApiToken: !!config.apiToken,
    apiTokenPrefix: config.apiToken ? `${config.apiToken.substring(0, 8)}...` : 'NOT_SET',
    configurationComplete: true
  });

  return config;
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
