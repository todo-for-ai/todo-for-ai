import { TodoMcpServer } from './server.js';
import { logger } from './logger.js';
import { CONFIG } from './config.js';
import { setupGlobalErrorHandlers } from './error-handler.js';

/**
 * Main entry point for the Todo for AI MCP Server
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  const processId = process.pid;

  console.log('[MAIN] Todo for AI MCP Server starting...', {
    processId,
    startTime: new Date(startTime).toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    argv: process.argv
  });

  // Setup global error handlers
  console.log('[MAIN] Setting up global error handlers...');
  setupGlobalErrorHandlers();
  console.log('[MAIN] Global error handlers setup complete');

  logger.info('[MAIN] Initializing Todo for AI MCP Server...', {
    processId,
    startupTime: Date.now() - startTime + 'ms'
  });

  logger.debug('[MAIN] Configuration details:', {
    apiBaseUrl: CONFIG.apiBaseUrl,
    apiTimeout: CONFIG.apiTimeout,
    logLevel: CONFIG.logLevel,
    hasApiToken: !!CONFIG.apiToken,
    processId,
    memoryUsage: process.memoryUsage()
  });

  logger.debug('[MAIN] Creating TodoMcpServer instance...');
  const server = new TodoMcpServer();

  logger.debug('[MAIN] Starting server...');
  await server.run();

  const totalStartupTime = Date.now() - startTime;
  logger.info('[MAIN] Todo for AI MCP Server startup complete', {
    processId,
    totalStartupTime: totalStartupTime + 'ms',
    memoryUsage: process.memoryUsage()
  });
}

// Handle process signals
process.on('SIGINT', () => {
  logger.info('[MAIN] Received SIGINT, shutting down gracefully...', {
    processId: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('[MAIN] Received SIGTERM, shutting down gracefully...', {
    processId: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('[MAIN] Fatal error during startup:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    processId: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
  process.exit(1);
});
