import { api } from './client'
import type { PaginatedResponse } from './client'

// 项目相关类型定义
export interface Project {
  id: number
  name: string
  description: string
  color: string
  status: 'active' | 'archived' | 'deleted'
  created_at: string
  updated_at: string
  created_by: string
  stats?: {
    total_tasks: number
    todo_tasks: number
    in_progress_tasks: number
    done_tasks: number
    context_rules_count: number
  }
}

export interface CreateProjectData {
  name: string
  description?: string
  color?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  color?: string
  status?: 'active' | 'archived' | 'deleted'
}

export interface ProjectQueryParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// 项目API服务
export class ProjectsApi {
  // 获取项目列表
  async getProjects(params?: ProjectQueryParams) {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const url = `/api/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return api.get<PaginatedResponse<Project>>(url)
  }

  // 获取单个项目
  async getProject(id: number) {
    return api.get<Project>(`/api/projects/${id}`)
  }

  // 创建项目
  async createProject(data: CreateProjectData) {
    return api.post<Project>('/api/projects', data)
  }

  // 更新项目
  async updateProject(id: number, data: UpdateProjectData) {
    return api.put<Project>(`/api/projects/${id}`, data)
  }

  // 删除项目
  async deleteProject(id: number) {
    return api.delete(`/api/projects/${id}`)
  }

  // 归档项目
  async archiveProject(id: number) {
    return api.post<Project>(`/api/projects/${id}/archive`)
  }

  // 恢复项目
  async restoreProject(id: number) {
    return api.post<Project>(`/api/projects/${id}/restore`)
  }

  // 获取项目任务
  async getProjectTasks(id: number, params?: {
    page?: number
    per_page?: number
    search?: string
    status?: string
    priority?: string
    assignee?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }) {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const url = `/api/projects/${id}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return api.get(url)
  }

  // 获取项目上下文规则
  async getProjectContextRules(id: number) {
    return api.get(`/api/projects/${id}/context-rules`)
  }
}

// 导出单例实例
export const projectsApi = new ProjectsApi()
