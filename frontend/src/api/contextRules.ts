import { api } from './client'
import type { PaginatedResponse } from './client'

// 上下文规则相关类型定义
export interface ContextRule {
  id: number
  project_id?: number
  name: string
  description: string
  content: string
  rule_type: 'global' | 'project'
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
  project?: {
    id: number
    name: string
    color: string
  }
}

export interface CreateContextRuleData {
  project_id?: number
  name: string
  description?: string
  content: string
  rule_type: 'global' | 'project'
  priority?: number
  is_active?: boolean
}

export interface UpdateContextRuleData {
  name?: string
  description?: string
  content?: string
  priority?: number
  is_active?: boolean
}

export interface ContextRuleQueryParams {
  page?: number
  per_page?: number
  search?: string
  project_id?: number
  rule_type?: 'global' | 'project'
  is_active?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// 上下文规则API服务
export class ContextRulesApi {
  // 获取上下文规则列表
  async getContextRules(params?: ContextRuleQueryParams) {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const url = `/context-rules${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return api.get<PaginatedResponse<ContextRule>>(url)
  }

  // 获取单个上下文规则
  async getContextRule(id: number) {
    return api.get<ContextRule>(`/context-rules/${id}`)
  }

  // 创建上下文规则
  async createContextRule(data: CreateContextRuleData) {
    return api.post<ContextRule>('/context-rules', data)
  }

  // 更新上下文规则
  async updateContextRule(id: number, data: UpdateContextRuleData) {
    return api.put<ContextRule>(`/context-rules/${id}`, data)
  }

  // 删除上下文规则
  async deleteContextRule(id: number) {
    return api.delete(`/context-rules/${id}`)
  }

  // 切换上下文规则状态
  async toggleContextRule(id: number, is_active: boolean) {
    return api.put<ContextRule>(`/context-rules/${id}`, { is_active })
  }

  // 获取项目的上下文规则
  async getProjectContextRules(projectId: number) {
    return api.get<ContextRule[]>(`/projects/${projectId}/context-rules`)
  }

  // 获取全局上下文规则
  async getGlobalContextRules() {
    return api.get<ContextRule[]>('/context-rules/global')
  }

  // 获取合并后的上下文规则（用于AI）
  async getMergedContextRules(projectId?: number) {
    const url = projectId
      ? `/context-rules/merged?project_id=${projectId}`
      : '/context-rules/merged'
    return api.get<{ content: string; rules: ContextRule[] }>(url)
  }

  // 预览合并后的上下文规则
  async previewMergedRules(projectId?: number) {
    const url = projectId
      ? `/context-rules/preview?project_id=${projectId}`
      : '/context-rules/preview'
    return api.get<{ content: string; rules: ContextRule[] }>(url)
  }

  // 复制上下文规则
  async copyContextRule(id: number, data: { name: string; project_id?: number }) {
    return api.post<ContextRule>(`/context-rules/${id}/copy`, data)
  }

  // 导入上下文规则
  async importContextRules(file: File) {
    return api.upload('/context-rules/import', file)
  }

  // 导出上下文规则
  async exportContextRules(params?: { project_id?: number; rule_type?: string }) {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const url = `/context-rules/export${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return api.download(url, 'context-rules.json')
  }
}

// 导出单例实例
export const contextRulesApi = new ContextRulesApi()
