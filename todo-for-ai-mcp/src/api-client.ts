import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  TodoConfig,
  ApiResponse,
  ApiError,
  GetProjectTasksArgs,
  GetTaskByIdArgs,
  SubmitTaskFeedbackArgs,
  CreateTaskArgs,
  GetProjectInfoArgs,
  Task,
  Project,
} from './types.js';
import { logger } from './logger.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Extend Axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      startTime: number;
    };
  }
}

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

    logger.info('[API_CLIENT] Initializing TodoApiClient', {
      baseURL: config.apiBaseUrl,
      timeout: config.apiTimeout,
      hasToken: !!config.apiToken,
      tokenPrefix: config.apiToken ? config.apiToken.substring(0, 8) + '...' : 'none'
    });

    // Normalize baseURL - ensure it doesn't end with a slash for consistent axios behavior
    let normalizedBaseUrl = config.apiBaseUrl;
    if (normalizedBaseUrl.endsWith('/')) {
      normalizedBaseUrl = normalizedBaseUrl.slice(0, -1);
    }

    this.client = axios.create({
      baseURL: normalizedBaseUrl,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `todo-for-ai-mcp/${this.getVersion()}`,
      },
    });

    // Add auth token if provided
    if (config.apiToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.apiToken}`;
      logger.debug('[API_CLIENT] Authorization header set', {
        tokenPrefix: config.apiToken.substring(0, 8) + '...'
      });
    } else {
      logger.warn('[API_CLIENT] No API token provided - requests may fail');
    }

    // Add detailed request/response interceptors for debugging
    this.client.interceptors.request.use(
      (config) => {
        const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        config.metadata = { requestId, startTime: Date.now() };

        logger.info(`[REQUEST_START] ${requestId} ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
          headers: {
            'Content-Type': config.headers?.['Content-Type'],
            'Authorization': config.headers?.['Authorization'] ? 'Bearer ***' : 'none',
            'User-Agent': config.headers?.['User-Agent']
          },
          hasData: !!config.data,
          dataSize: config.data ? JSON.stringify(config.data).length : 0,
          timeout: config.timeout
        });

        if (config.data) {
          logger.debug(`[REQUEST_DATA] ${requestId}`, config.data);
        }

        return config;
      },
      (error) => {
        logger.error(`[REQUEST_ERROR] Failed to setup request`, error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.metadata?.requestId || 'unknown';
        const startTime = response.config.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        logger.info(`[RESPONSE_SUCCESS] ${requestId} ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          hasData: !!response.data,
          dataSize: response.data ? JSON.stringify(response.data).length : 0,
          contentType: response.headers?.['content-type']
        });

        if (response.data) {
          logger.debug(`[RESPONSE_DATA] ${requestId}`, response.data);
        }

        return response;
      },
      (error) => {
        const requestId = error.config?.metadata?.requestId || 'unknown';
        const startTime = error.config?.metadata?.startTime || Date.now();
        const duration = Date.now() - startTime;

        if (error.response) {
          logger.error(`[RESPONSE_ERROR] ${requestId} ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response.status,
            statusText: error.response.statusText,
            duration: `${duration}ms`,
            data: error.response.data,
            headers: error.response.headers,
            config: {
              baseURL: error.config?.baseURL,
              url: error.config?.url,
              method: error.config?.method
            }
          });
        } else if (error.request) {
          logger.error(`[NETWORK_ERROR] ${requestId} No response received`, {
            duration: `${duration}ms`,
            code: error.code,
            message: error.message,
            config: {
              baseURL: error.config?.baseURL,
              url: error.config?.url,
              method: error.config?.method,
              timeout: error.config?.timeout
            }
          });
        } else {
          logger.error(`[REQUEST_SETUP_ERROR] ${requestId}`, {
            message: error.message,
            code: error.code
          });
        }
        return Promise.reject(error);
      }
    );

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
    // Also retry on 502 Bad Gateway (common in concurrent scenarios)
    return (status >= 500 && status < 600) || status === 502;
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

          logger.error(`${operationName} AxiosError details:`, {
            message: axiosError.message,
            code: axiosError.code,
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            url: axiosError.config?.url,
            baseURL: axiosError.config?.baseURL,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers,
            responseData: axiosError.response?.data,
            responseHeaders: axiosError.response?.headers
          });

          if (this.shouldRetry(axiosError, attempt)) {
            const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryDelayMultiplier, attempt);
            logger.warn(`${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), retrying in ${delay}ms...`, error.message);
            await this.sleep(delay);
            continue;
          }
        } else {
          const err = error as Error;
          logger.error(`${operationName} non-Axios error:`, {
            message: err.message,
            stack: err.stack,
            name: err.name
          });
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
      const response = await this.client.post<any>('mcp/call', {
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
      const response = await this.client.post<Task>('mcp/call', {
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
      const response = await this.client.post<any>('mcp/call', {
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
   * Create a new task in the specified project
   */
  async createTask(args: CreateTaskArgs): Promise<Task> {
    logger.info(`Creating task "${args.title}" in project ${args.project_id}`);

    try {
      const response = await this.client.post<Task>('mcp/call', {
        name: 'create_task',
        arguments: {
          project_id: args.project_id,
          title: args.title,
          content: args.content,
          status: args.status || 'todo',
          priority: args.priority || 'medium',
          assignee: args.assignee,
          due_date: args.due_date,
          estimated_hours: args.estimated_hours,
          tags: args.tags,
          related_files: args.related_files,
          is_ai_task: args.is_ai_task !== undefined ? args.is_ai_task : true,
          ai_identifier: args.ai_identifier || 'MCP Client',
        },
      });

      const result = response.data;

      if ('error' in result) {
        throw new Error((result as any).error);
      }

      logger.info(`Successfully created task: ${(result as Task).title}`);
      return result as Task;
    } catch (error) {
      logger.error(`Failed to create task "${args.title}":`, error);
      throw error;
    }
  }

  /**
   * Get detailed project information
   */
  async getProjectInfo(args: GetProjectInfoArgs): Promise<Project> {
    const apiCallStartTime = Date.now();
    const apiCallId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    logger.info('[API_CLIENT] ========== API CALL START: getProjectInfo ==========', {
      apiCallId,
      timestamp: new Date().toISOString(),
      args
    });

    // Validate that at least one identifier is provided
    if (!args.project_id && !args.project_name) {
      const error = new Error('Either project_id or project_name must be provided');
      logger.error('[API_CLIENT] getProjectInfo validation failed', {
        apiCallId,
        args,
        error: error.message,
        validationRule: 'project_id OR project_name required'
      });
      throw error;
    }

    const identifier = args.project_id ? `ID ${args.project_id}` : `name "${args.project_name}"`;
    logger.info(`[API_CLIENT] getProjectInfo starting for ${identifier}`, {
      apiCallId,
      project_id: args.project_id,
      project_name: args.project_name,
      identifier,
      hasToken: !!this.config.apiToken,
      tokenPrefix: this.config.apiToken ? this.config.apiToken.substring(0, 8) + '...' : 'none',
      baseURL: this.config.apiBaseUrl,
      timeout: this.config.apiTimeout
    });

    try {
      logger.debug('[API_CLIENT] Preparing MCP call request', {
        apiCallId,
        endpoint: 'mcp/call',
        method: 'POST',
        toolName: 'get_project_info',
        arguments: args,
        fullUrl: `${this.config.apiBaseUrl}/mcp/call`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.apiToken ? 'Bearer ***' : 'none',
          'User-Agent': this.client.defaults.headers['User-Agent']
        }
      });

      const requestPayload = {
        name: 'get_project_info',
        arguments: {
          project_id: args.project_id,
          project_name: args.project_name,
        },
      };

      logger.debug('[API_CLIENT] Request payload prepared', {
        apiCallId,
        payload: requestPayload,
        payloadSize: JSON.stringify(requestPayload).length
      });

      const httpCallStartTime = Date.now();
      logger.info('[API_CLIENT] Making HTTP request...', {
        apiCallId,
        url: '/mcp/call',
        method: 'POST',
        timestamp: new Date().toISOString()
      });

      const response = await this.client.post<Project>('mcp/call', requestPayload);
      const httpCallDuration = Date.now() - httpCallStartTime;

      logger.info('[API_CLIENT] HTTP response received', {
        apiCallId,
        httpCallDuration: `${httpCallDuration}ms`,
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataSize: response.data ? JSON.stringify(response.data).length : 0,
        headers: {
          'content-type': response.headers['content-type'],
          'content-length': response.headers['content-length']
        }
      });

      logger.debug('[API_CLIENT] Response data details', {
        apiCallId,
        data: response.data,
        dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : []
      });

      const result = response.data;

      logger.debug('[API_CLIENT] Checking for error in response', {
        apiCallId,
        hasError: 'error' in result,
        resultType: typeof result,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : []
      });

      if ('error' in result) {
        const errorMsg = (result as any).error;
        logger.error('[API_CLIENT] MCP call returned error', {
          apiCallId,
          error: errorMsg,
          identifier,
          fullResponse: result
        });
        throw new Error(errorMsg);
      }

      const project = result as Project;
      const totalDuration = Date.now() - apiCallStartTime;

      logger.info(`[API_CLIENT] getProjectInfo successful for ${identifier}`, {
        apiCallId,
        totalDuration: `${totalDuration}ms`,
        projectName: project.name,
        projectId: project.id,
        projectStatus: project.status,
        hasStats: !!project.statistics,
        hasRecentTasks: !!(project as any).recent_tasks,
        totalTasks: project.total_tasks,
        completionRate: project.completion_rate
      });

      logger.info('[API_CLIENT] ========== API CALL END: getProjectInfo ==========', {
        apiCallId,
        success: true,
        totalDuration: `${totalDuration}ms`,
        timestamp: new Date().toISOString()
      });

      return project;
    } catch (error) {
      const totalDuration = Date.now() - apiCallStartTime;

      logger.error(`[API_CLIENT] getProjectInfo failed for ${identifier}`, {
        apiCallId,
        totalDuration: `${totalDuration}ms`,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        args,
        config: {
          baseURL: this.config.apiBaseUrl,
          timeout: this.config.apiTimeout,
          hasToken: !!this.config.apiToken
        }
      });

      logger.error('[API_CLIENT] ========== API CALL END: getProjectInfo (ERROR) ==========', {
        apiCallId,
        success: false,
        totalDuration: `${totalDuration}ms`,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

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

  private getVersion(): string {
    try {
      // Get current directory for ES modules
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      // Try multiple possible paths for package.json
      const possiblePaths = [
        join(__dirname, '../package.json'),
        join(__dirname, '../../package.json'),
        join(__dirname, '../../../package.json'),
        join(process.cwd(), 'package.json')
      ];
      
      for (const path of possiblePaths) {
        try {
          const packageJson = JSON.parse(readFileSync(path, 'utf-8'));
          if (packageJson.version) {
            return packageJson.version;
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      logger.warn('Could not read package version from any path');
      return '1.0.8'; // Use current version as fallback
    } catch (error) {
      logger.warn('Could not read package version:', error);
      return '1.0.8'; // Use current version as fallback
    }
  }
}
