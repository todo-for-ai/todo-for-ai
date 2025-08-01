import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TodoApiClient } from './api-client.js';
import { logger } from './logger.js';
import { CONFIG } from './config.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

export class TodoMcpServer {
  private server: Server;
  private apiClient: TodoApiClient;
  private instanceId: string;

  constructor() {
    // Generate unique instance ID for concurrent support
    this.instanceId = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('[MCP_SERVER] Starting TodoMcpServer initialization...', {
      instanceId: this.instanceId,
      version: VERSION,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      configLogLevel: CONFIG.logLevel
    });

    logger.debug('[MCP_SERVER] Creating MCP Server instance...', {
      serverName: 'todo-for-ai-mcp',
      serverVersion: VERSION,
      capabilities: ['tools'],
      instanceId: this.instanceId
    });

    this.server = new Server(
      {
        name: 'todo-for-ai-mcp',
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    logger.info(`[MCP_SERVER] MCP Server instance created: ${this.instanceId}`, {
      serverName: 'todo-for-ai-mcp',
      serverVersion: VERSION,
      instanceId: this.instanceId
    });

    logger.debug('[MCP_SERVER] Initializing API client...', {
      apiBaseUrl: CONFIG.apiBaseUrl,
      hasToken: !!CONFIG.apiToken,
      timeout: CONFIG.apiTimeout,
      instanceId: this.instanceId
    });

    this.apiClient = new TodoApiClient(CONFIG);

    logger.debug('[MCP_SERVER] Setting up request handlers...', {
      instanceId: this.instanceId
    });
    this.setupHandlers();

    logger.info('[MCP_SERVER] TodoMcpServer initialization complete', {
      instanceId: this.instanceId,
      handlersSetup: true,
      apiClientReady: true,
      serverReady: true
    });
  }

  private setupHandlers(): void {
    logger.debug('[MCP_SERVER] Setting up request handlers...', {
      instanceId: this.instanceId,
      handlersToSetup: ['ListTools', 'CallTool']
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('[MCP_SERVER] ListTools request received', {
        instanceId: this.instanceId,
        timestamp: new Date().toISOString()
      });
      logger.debug('Received list_tools request');
      
      const tools: Tool[] = [
        {
          name: 'get_project_tasks_by_name',
          description: 'Get all pending tasks for a project by project name, sorted by creation time',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: {
                type: 'string',
                description: 'The name of the project to get tasks for',
              },
              status_filter: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['todo', 'in_progress', 'review'],
                },
                description: 'Filter tasks by status (default: todo, in_progress, review)',
                default: ['todo', 'in_progress', 'review'],
              },
            },
            required: ['project_name'],
          },
        },
        {
          name: 'get_task_by_id',
          description: 'Get detailed task information by task ID',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The ID of the task to retrieve',
              },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'submit_task_feedback',
          description: 'Submit feedback for a completed or in-progress task',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'integer',
                description: 'The ID of the task to provide feedback for',
              },
              project_name: {
                type: 'string',
                description: 'The name of the project this task belongs to',
              },
              feedback_content: {
                type: 'string',
                description: 'The feedback content describing what was done',
              },
              status: {
                type: 'string',
                enum: ['in_progress', 'review', 'done', 'cancelled'],
                description: 'The new status of the task after feedback',
              },
              ai_identifier: {
                type: 'string',
                description: 'Identifier of the AI providing feedback (optional)',
              },
            },
            required: ['task_id', 'project_name', 'feedback_content', 'status'],
          },
        },
        {
          name: 'create_task',
          description: 'Create a new task in the specified project',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: {
                type: 'integer',
                description: 'The ID of the project to create the task in',
              },
              title: {
                type: 'string',
                description: 'The title of the task',
              },
              content: {
                type: 'string',
                description: 'The detailed content/description of the task',
              },
              status: {
                type: 'string',
                enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'],
                description: 'The initial status of the task (default: todo)',
                default: 'todo',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'The priority of the task (default: medium)',
                default: 'medium',
              },
              assignee: {
                type: 'string',
                description: 'The person assigned to this task (optional)',
              },
              due_date: {
                type: 'string',
                description: 'The due date in YYYY-MM-DD format (optional)',
              },
              estimated_hours: {
                type: 'number',
                description: 'Estimated hours to complete the task (optional)',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags associated with the task (optional)',
              },
              related_files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files related to this task (optional)',
              },
              is_ai_task: {
                type: 'boolean',
                description: 'Whether this task was created by AI (default: true)',
                default: true,
              },
              ai_identifier: {
                type: 'string',
                description: 'Identifier of the AI creating the task (optional)',
              },
            },
            required: ['project_id', 'title'],
          },
        },
        {
          name: 'get_project_info',
          description: 'Get detailed project information including statistics and configuration. Provide either project_id or project_name.',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: {
                type: 'integer',
                description: 'The ID of the project to retrieve (optional if project_name is provided)',
              },
              project_name: {
                type: 'string',
                description: 'The name of the project to retrieve (optional if project_id is provided)',
              },
            },
            required: [],
          },
        },
      ];

      logger.info(`Returning ${tools.length} available tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const callStartTime = Date.now();

      logger.info(`[MCP_SERVER] ========== TOOL CALL START ==========`, {
        requestId,
        toolName: name,
        instanceId: this.instanceId,
        timestamp: new Date().toISOString(),
        callStartTime
      });

      logger.info(`[MCP_SERVER] Tool call received: ${name}`, {
        requestId,
        toolName: name,
        hasArgs: !!args,
        argsCount: args ? Object.keys(args).length : 0,
        argsKeys: args ? Object.keys(args) : [],
        argsSize: args ? JSON.stringify(args).length : 0,
        instanceId: this.instanceId,
        memoryUsage: process.memoryUsage()
      });

      logger.debug(`[MCP_SERVER] Tool call full arguments: ${name}`, {
        requestId,
        args,
        argsStringified: JSON.stringify(args, null, 2)
      });

      try {
        let result;
        const startTime = Date.now();

        switch (name) {
          case 'get_project_tasks_by_name':
            logger.info(`[MCP_SERVER] Executing get_project_tasks_by_name`, {
              requestId,
              instanceId: this.instanceId,
              projectName: args?.project_name,
              hasProjectName: !!args?.project_name
            });
            result = await this.handleGetProjectTasksByName(args);
            break;

          case 'get_task_by_id':
            logger.info(`[MCP_SERVER] Executing get_task_by_id`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              hasTaskId: !!args?.task_id
            });
            result = await this.handleGetTaskById(args);
            break;

          case 'submit_task_feedback':
            logger.info(`[MCP_SERVER] Executing submit_task_feedback`, {
              requestId,
              instanceId: this.instanceId,
              taskId: args?.task_id,
              status: args?.status,
              hasContent: !!args?.feedback_content
            });
            result = await this.handleSubmitTaskFeedback(args);
            break;

          case 'create_task':
            logger.info(`[MCP_SERVER] Executing create_task`, {
              requestId,
              instanceId: this.instanceId,
              projectId: args?.project_id,
              title: args?.title,
              priority: args?.priority
            });
            result = await this.handleCreateTask(args);
            break;

          case 'get_project_info':
            logger.info(`[MCP_SERVER] Executing get_project_info`, {
              requestId,
              instanceId: this.instanceId,
              projectId: args?.project_id,
              projectName: args?.project_name,
              hasProjectId: !!args?.project_id,
              hasProjectName: !!args?.project_name
            });
            result = await this.handleGetProjectInfo(args);
            break;

          default:
            const error = new Error(`Unknown tool: ${name}`);
            logger.error(`[MCP_SERVER] Unknown tool requested`, {
              requestId,
              instanceId: this.instanceId,
              toolName: name,
              error: error.message,
              availableTools: ['get_project_tasks_by_name', 'get_task_by_id', 'submit_task_feedback', 'create_task', 'get_project_info']
            });
            throw error;
        }

        const duration = Date.now() - startTime;
        const totalCallDuration = Date.now() - callStartTime;

        logger.info(`[MCP_SERVER] Tool call completed successfully: ${name}`, {
          requestId,
          instanceId: this.instanceId,
          duration: `${duration}ms`,
          totalCallDuration: `${totalCallDuration}ms`,
          hasResult: !!result,
          resultType: typeof result,
          resultSize: result ? JSON.stringify(result).length : 0,
          memoryUsage: process.memoryUsage()
        });

        logger.debug(`[MCP_SERVER] Tool call result structure: ${name}`, {
          requestId,
          result: result,
          resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
        });

        logger.info(`[MCP_SERVER] ========== TOOL CALL END ==========`, {
          requestId,
          toolName: name,
          instanceId: this.instanceId,
          success: true,
          totalDuration: `${totalCallDuration}ms`,
          timestamp: new Date().toISOString()
        });

        return result;
      } catch (error) {
        const totalCallDuration = Date.now() - callStartTime;

        logger.error(`[MCP_SERVER] Tool call failed: ${name}`, {
          requestId,
          instanceId: this.instanceId,
          toolName: name,
          totalCallDuration: `${totalCallDuration}ms`,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          args,
          memoryUsage: process.memoryUsage()
        });

        logger.error(`[MCP_SERVER] ========== TOOL CALL END (ERROR) ==========`, {
          requestId,
          toolName: name,
          instanceId: this.instanceId,
          success: false,
          totalDuration: `${totalCallDuration}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });

        throw error;
      }
    });
  }

  private async handleGetProjectTasksByName(args: any) {
    const result = await this.apiClient.getProjectTasksByName(args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetTaskById(args: any) {
    const result = await this.apiClient.getTaskById(args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSubmitTaskFeedback(args: any) {
    const result = await this.apiClient.submitTaskFeedback(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleCreateTask(args: any) {
    const result = await this.apiClient.createTask(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetProjectInfo(args: any) {
    const handlerStartTime = Date.now();
    const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    logger.info('[MCP_SERVER] ========== HANDLER START: handleGetProjectInfo ==========', {
      handlerId,
      instanceId: this.instanceId,
      args,
      hasProjectId: !!args?.project_id,
      hasProjectName: !!args?.project_name,
      timestamp: new Date().toISOString()
    });

    logger.debug('[MCP_SERVER] handleGetProjectInfo input validation', {
      handlerId,
      projectId: args?.project_id,
      projectName: args?.project_name,
      argsType: typeof args,
      argsKeys: args ? Object.keys(args) : [],
      isValidInput: !!(args?.project_id || args?.project_name)
    });

    try {
      logger.info('[MCP_SERVER] handleGetProjectInfo calling API client...', {
        handlerId,
        instanceId: this.instanceId,
        apiMethod: 'getProjectInfo',
        args
      });

      const apiCallStartTime = Date.now();
      const result = await this.apiClient.getProjectInfo(args);
      const apiCallDuration = Date.now() - apiCallStartTime;

      logger.info('[MCP_SERVER] handleGetProjectInfo API call successful', {
        handlerId,
        instanceId: this.instanceId,
        apiCallDuration: `${apiCallDuration}ms`,
        projectId: result.id,
        projectName: result.name,
        projectStatus: result.status,
        hasStats: !!result.statistics,
        hasRecentTasks: !!result.recent_tasks,
        resultSize: JSON.stringify(result).length,
        resultKeys: Object.keys(result)
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo API result details', {
        handlerId,
        result: result,
        statistics: result.statistics,
        recentTasks: result.recent_tasks
      });

      logger.debug('[MCP_SERVER] handleGetProjectInfo preparing response...', {
        handlerId,
        responseFormat: 'MCP tool response',
        contentType: 'text',
        willStringify: true
      });

      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

      const handlerDuration = Date.now() - handlerStartTime;
      logger.info('[MCP_SERVER] handleGetProjectInfo response prepared', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        responseSize: JSON.stringify(response).length,
        contentType: response.content[0]?.type,
        contentCount: response.content.length,
        textLength: response.content[0]?.text?.length
      });

      logger.info('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: true,
        totalDuration: `${handlerDuration}ms`,
        timestamp: new Date().toISOString()
      });

      return response;
    } catch (error) {
      const handlerDuration = Date.now() - handlerStartTime;

      logger.error('[MCP_SERVER] handleGetProjectInfo failed', {
        handlerId,
        instanceId: this.instanceId,
        handlerDuration: `${handlerDuration}ms`,
        args,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });

      logger.error('[MCP_SERVER] ========== HANDLER END: handleGetProjectInfo (ERROR) ==========', {
        handlerId,
        instanceId: this.instanceId,
        success: false,
        totalDuration: `${handlerDuration}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  async run(): Promise<void> {
    logger.info('[MCP_SERVER] Starting Todo for AI MCP Server...', {
      instanceId: this.instanceId,
      apiBaseUrl: CONFIG.apiBaseUrl,
      hasApiToken: !!CONFIG.apiToken,
      logLevel: CONFIG.logLevel,
      version: VERSION
    });

    logger.debug('[MCP_SERVER] Creating transport...', {
      transportType: 'StdioServerTransport',
      instanceId: this.instanceId
    });

    const transport = new StdioServerTransport();

    logger.debug('[MCP_SERVER] Connecting to transport...', {
      instanceId: this.instanceId,
      timestamp: new Date().toISOString()
    });

    try {
      await this.server.connect(transport);

      logger.info('[MCP_SERVER] Todo for AI MCP Server is running', {
        instanceId: this.instanceId,
        apiBaseUrl: CONFIG.apiBaseUrl,
        connected: true,
        ready: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[MCP_SERVER] Failed to start MCP Server', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}
