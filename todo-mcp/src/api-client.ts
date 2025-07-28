import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  TodoConfig,
  ApiResponse,
  ApiError,
  GetProjectTasksArgs,
  GetTaskByIdArgs,
  SubmitTaskFeedbackArgs,
  Task,
  Project,
} from './types.js';
import { logger } from './logger.js';

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryDelayMultiplier: number;
}

export class TodoApiClient {
  private client: AxiosInstance;
  private config: TodoConfig;
  private retryConfig: RetryConfig;

  constructor(config: TodoConfig) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryDelayMultiplier: 2,
    };

    this.client = axios.create({
      baseURL: `${config.apiBaseUrl}/api`,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'todo-for-ai-mcp/1.0.0',
      },
    });

    // Add auth token if provided
    if (config.apiToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.apiToken}`;
    }

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`, {
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      const apiError = error.response.data as ApiError;
      if (apiError && apiError.error) {
        return new Error(`API Error: ${apiError.error.message}`);
      }
      return new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else if (error.request) {
      return new Error(`Network Error: Unable to connect to ${this.config.apiBaseUrl}`);
    } else {
      return new Error(`Request Error: ${error.message}`);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private shouldRetry(error: AxiosError, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on network errors or 5xx server errors
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && error.message.includes('AxiosError')) {
          const axiosError = error as AxiosError;

          if (this.shouldRetry(axiosError, attempt)) {
            const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryDelayMultiplier, attempt);
            logger.warn(`${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), retrying in ${delay}ms...`, error.message);
            await this.sleep(delay);
            continue;
          }
        }

        // Don't retry for non-retryable errors
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Get all pending tasks for a project by project name
   */
  async getProjectTasksByName(args: GetProjectTasksArgs): Promise<any> {
    logger.info(`Getting tasks for project: ${args.project_name}`);

    return this.executeWithRetry(async () => {
      const response = await this.client.post<any>('/mcp/call', {
        name: 'get_project_tasks_by_name',
        arguments: {
          project_name: args.project_name,
          status_filter: args.status_filter || ['todo', 'in_progress', 'review'],
        },
      });

      const result = response.data;

      if (result.error) {
        throw new Error(result.error);
      }

      logger.info(`Found ${result.total_tasks || 0} tasks for project: ${args.project_name}`);
      return result;
    }, `getProjectTasksByName(${args.project_name})`);
  }

  /**
   * Get detailed task information by task ID
   */
  async getTaskById(args: GetTaskByIdArgs): Promise<Task> {
    logger.info(`Getting task details for ID: ${args.task_id}`);
    
    try {
      const response = await this.client.post<Task>('/mcp/call', {
        name: 'get_task_by_id',
        arguments: {
          task_id: args.task_id,
        },
      });

      const result = response.data;
      
      if ('error' in result) {
        throw new Error((result as any).error);
      }

      logger.info(`Retrieved task: ${(result as Task).title}`);
      return result as Task;
    } catch (error) {
      logger.error(`Failed to get task ${args.task_id}:`, error);
      throw error;
    }
  }

  /**
   * Submit feedback for a completed or in-progress task
   */
  async submitTaskFeedback(args: SubmitTaskFeedbackArgs): Promise<any> {
    logger.info(`Submitting feedback for task ${args.task_id} in project ${args.project_name}`);
    
    try {
      const response = await this.client.post<any>('/mcp/call', {
        name: 'submit_task_feedback',
        arguments: {
          task_id: args.task_id,
          project_name: args.project_name,
          feedback_content: args.feedback_content,
          status: args.status,
          ai_identifier: args.ai_identifier || 'MCP Client',
        },
      });

      const result = response.data;
      
      if (result.error) {
        throw new Error(result.error);
      }

      logger.info(`Successfully submitted feedback for task ${args.task_id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to submit feedback for task ${args.task_id}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to the Todo API
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing connection to Todo API...');
      const response = await this.client.get('/health');
      logger.info('Connection test successful');
      return true;
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }
}
