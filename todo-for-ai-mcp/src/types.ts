/**
 * Todo for AI MCP Server Types
 */

export interface TodoConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  apiToken?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  color?: string;
  github_url?: string;
  project_context?: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  created_by: string;
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  statistics?: {
    total_tasks: number;
    todo_tasks: number;
    in_progress_tasks: number;
    review_tasks: number;
    done_tasks: number;
    cancelled_tasks: number;
    completion_rate: number;
  };
  recent_tasks?: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    updated_at: string;
  }>;
}

export interface Task {
  id: number; // Note: This is bigint in database but JavaScript number can handle up to 2^53-1
  project_id: number;
  title: string;
  description?: string;
  content?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  related_files?: string[];
  is_ai_task: boolean;
  feedback_content?: string;
  feedback_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_prev: boolean;
    has_next: boolean;
    prev_num: number | null;
    next_num: number | null;
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    status_code: number;
    timestamp: string;
    path: string;
    code?: string;
    details?: any;
  };
}

export interface GetProjectTasksArgs {
  project_name: string;
  status_filter?: ('todo' | 'in_progress' | 'review')[];
}

export interface GetTaskByIdArgs {
  task_id: number;
}

export interface SubmitTaskFeedbackArgs {
  task_id: number;
  project_name: string;
  feedback_content: string;
  status: 'in_progress' | 'review' | 'done' | 'cancelled';
  ai_identifier?: string;
}

export interface CreateTaskArgs {
  project_id: number;
  title: string;
  content?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  related_files?: string[];
  is_ai_task?: boolean;
  ai_identifier?: string;
}

export interface GetProjectInfoArgs {
  project_id?: number;
  project_name?: string;
}
