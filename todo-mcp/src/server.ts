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

export class TodoMcpServer {
  private server: Server;
  private apiClient: TodoApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'todo-for-ai-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiClient = new TodoApiClient(CONFIG);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
      ];

      logger.info(`Returning ${tools.length} available tools`);
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.debug(`Received call_tool request: ${name}`, args);

      try {
        switch (name) {
          case 'get_project_tasks_by_name':
            return await this.handleGetProjectTasksByName(args);
          
          case 'get_task_by_id':
            return await this.handleGetTaskById(args);
          
          case 'submit_task_feedback':
            return await this.handleSubmitTaskFeedback(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
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

  async run(): Promise<void> {
    logger.info('Starting Todo for AI MCP Server...');
    logger.info(`API Base URL: ${CONFIG.apiBaseUrl}`);
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('Todo for AI MCP Server is running');
  }
}
