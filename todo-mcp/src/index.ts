#!/usr/bin/env node

import { TodoMcpServer } from './server.js';
import { logger } from './logger.js';
import { CONFIG } from './config.js';

/**
 * Main entry point for the Todo for AI MCP Server
 */
async function main(): Promise<void> {
  try {
    logger.info('Initializing Todo for AI MCP Server...');
    logger.debug('Configuration:', {
      apiBaseUrl: CONFIG.apiBaseUrl,
      apiTimeout: CONFIG.apiTimeout,
      logLevel: CONFIG.logLevel,
      hasApiToken: !!CONFIG.apiToken,
    });

    const server = new TodoMcpServer();
    await server.run();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}
