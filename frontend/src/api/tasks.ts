import { api } from './client'
import type { PaginatedResponse } from './client'

// 任务相关类型定义
export interface Task {
  id: number
  project_id: number
  title: string
  content: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  actual_hours?: number
  completion_rate: number
  completed_at?: string
  tags: string[]
  created_at: string
  updated_at: string
  created_by: string
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
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  tags?: string[]
  is_ai_task?: boolean
}

export interface UpdateTaskData {
  title?: string
  content?: string
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  actual_hours?: number
  completion_rate?: number
  tags?: string[]
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
    
    const url = `/api/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return api.get<PaginatedResponse<Task>>(url)
  }

  // 获取单个任务
  async getTask(id: number) {
    return api.get<Task>(`/api/tasks/${id}`)
  }

  // 创建任务
  async createTask(data: CreateTaskData) {
    return api.post<Task>('/api/tasks', data)
  }

  // 更新任务
  async updateTask(id: number, data: UpdateTaskData) {
    return api.put<Task>(`/api/tasks/${id}`, data)
  }

  // 删除任务
  async deleteTask(id: number) {
    return api.delete(`/api/tasks/${id}`)
  }

  // 更新任务状态
  async updateTaskStatus(id: number, status: Task['status']) {
    return api.put<Task>(`/api/tasks/${id}`, { status })
  }

  // 更新任务进度
  async updateTaskProgress(id: number, completion_rate: number) {
    return api.put<Task>(`/api/tasks/${id}`, { completion_rate })
  }



  // 获取任务历史
  async getTaskHistory(id: number) {
    return api.get(`/api/tasks/${id}/history`)
  }

  // 获取任务附件
  async getTaskAttachments(id: number) {
    return api.get(`/api/tasks/${id}/attachments`)
  }

  // 上传任务附件
  async uploadTaskAttachment(id: number, file: File, onProgress?: (progress: number) => void) {
    return api.upload(`/api/tasks/${id}/attachments`, file, onProgress)
  }

  // 删除任务附件
  async deleteTaskAttachment(taskId: number, attachmentId: number) {
    return api.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
  }
}

// 导出单例实例
export const tasksApi = new TasksApi()
