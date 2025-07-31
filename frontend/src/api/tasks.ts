import { fetchApiClient } from './fetchClient'

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pages: number
    per_page: number
    total: number
    has_next: boolean
    has_prev: boolean
    next_num?: number
    prev_num?: number
  }
  message: string
  success: boolean
  timestamp: string
}

// 任务相关类型定义
export interface Task {
  id: number
  project_id: number
  title: string
  content: string
  description?: string  // 添加缺失的description属性
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  completion_rate: number
  completed_at?: string
  tags: string[]
  created_at: string
  updated_at: string
  created_by: string
  feedback_content?: string
  feedback_at?: string
  is_ai_task?: boolean  // 添加缺失的is_ai_task属性
  related_files?: string[]  // 添加缺失的related_files属性
  creator_type?: string  // 添加缺失的creator_type属性
  creator_identifier?: string  // 添加缺失的creator_identifier属性
  project?: {
    id: number
    name: string
    color: string
  }
  stats?: {
    attachments_count: number
    history_count: number
    is_overdue: boolean
    days_until_due?: number
  }
}

export interface CreateTaskData {
  project_id: number
  title?: string
  content?: string
  description?: string  // 添加description属性
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  tags?: string[]
  is_ai_task?: boolean
  related_files?: string[]  // 添加related_files属性
  creator_type?: string  // 添加creator_type属性
  creator_identifier?: string  // 添加creator_identifier属性
}

export interface UpdateTaskData {
  title?: string
  content?: string
  description?: string  // 添加description属性
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  completion_rate?: number
  tags?: string[]
  is_ai_task?: boolean  // 添加is_ai_task属性
  related_files?: string[]  // 添加related_files属性
  created_by?: string  // 添加created_by属性
}

export interface TaskQueryParams {
  page?: number
  per_page?: number
  search?: string
  project_id?: number
  status?: string
  priority?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// 任务API服务
export class TasksApi {
  // 获取任务列表
  async getTasks(params?: TaskQueryParams) {
    const queryParams = new URLSearchParams()

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const url = `/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return fetchApiClient.get<PaginatedResponse<Task>>(url)
  }

  // 获取单个任务
  async getTask(id: number) {
    return fetchApiClient.get<Task>(`/tasks/${id}`)
  }

  // 创建任务
  async createTask(data: CreateTaskData) {
    return fetchApiClient.post<Task>('/tasks', data)
  }

  // 更新任务
  async updateTask(id: number, data: UpdateTaskData) {
    return fetchApiClient.put<Task>(`/tasks/${id}`, data)
  }

  // 删除任务
  async deleteTask(id: number) {
    return fetchApiClient.delete(`/tasks/${id}`)
  }

  // 更新任务状态
  async updateTaskStatus(id: number, status: Task['status']) {
    return fetchApiClient.put<Task>(`/tasks/${id}`, { status })
  }

  // 更新任务进度
  async updateTaskProgress(id: number, completion_rate: number) {
    return fetchApiClient.put<Task>(`/tasks/${id}`, { completion_rate })
  }



  // 获取任务历史
  async getTaskHistory(id: number) {
    return fetchApiClient.get(`/tasks/${id}/history`)
  }

  // 获取任务附件
  async getTaskAttachments(id: number) {
    return fetchApiClient.get(`/tasks/${id}/attachments`)
  }

  // 上传任务附件
  async uploadTaskAttachment(_id: number, _file: File, _onProgress?: (progress: number) => void) {
    // TODO: 实现文件上传功能
    throw new Error('File upload not implemented with fetch client')
  }

  // 删除任务附件
  async deleteTaskAttachment(taskId: number, attachmentId: number) {
    return fetchApiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`)
  }
}

// 导出单例实例
export const tasksApi = new TasksApi()
