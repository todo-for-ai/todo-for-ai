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

// 上下文规则相关类型定义
export interface ContextRule {
  id: number
  project_id?: number
  user_id: number
  name: string
  description: string
  content: string
  priority: number
  is_active: boolean
  apply_to_tasks: boolean
  apply_to_projects: boolean
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
  created_by: string
  is_global: boolean
  project?: {
    id: number
    name: string
    color: string
  }
  user?: {
    id: number
    username: string
    full_name: string
    avatar_url?: string
  }
}

export interface CreateContextRuleData {
  project_id?: number
  name: string
  description?: string
  content: string
  priority?: number
  is_active?: boolean
  apply_to_tasks?: boolean
  apply_to_projects?: boolean
  is_public?: boolean
}

export interface UpdateContextRuleData {
  name?: string
  description?: string
  content?: string
  priority?: number
  is_active?: boolean
  apply_to_tasks?: boolean
  apply_to_projects?: boolean
  is_public?: boolean
}

export interface BuildContextResponse {
  context_string: string
  rules_applied: number
  rules: ContextRule[]
}

export interface ContextRuleQueryParams {
  page?: number
  per_page?: number
  search?: string
  project_id?: number
  scope?: 'global' | 'project'

  is_active?: boolean
  apply_to_tasks?: boolean
  apply_to_projects?: boolean
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
    return fetchApiClient.get<PaginatedResponse<ContextRule>>(url)
  }

  // 获取单个上下文规则
  async getContextRule(id: number) {
    return fetchApiClient.get<ContextRule>(`/context-rules/${id}`)
  }

  // 创建上下文规则
  async createContextRule(data: CreateContextRuleData) {
    return fetchApiClient.post<ContextRule>('/context-rules', data)
  }

  // 更新上下文规则
  async updateContextRule(id: number, data: UpdateContextRuleData) {
    return fetchApiClient.put<ContextRule>(`/context-rules/${id}`, data)
  }

  // 删除上下文规则
  async deleteContextRule(id: number) {
    return fetchApiClient.delete(`/context-rules/${id}`)
  }

  // 切换上下文规则状态
  async toggleContextRule(id: number, is_active: boolean) {
    return fetchApiClient.put<ContextRule>(`/context-rules/${id}`, { is_active })
  }

  // 获取项目的上下文规则
  async getProjectContextRules(projectId: number) {
    return fetchApiClient.get<ContextRule[]>(`/projects/${projectId}/context-rules`)
  }

  // 获取全局上下文规则
  async getGlobalContextRules() {
    return fetchApiClient.get<ContextRule[]>('/context-rules/global')
  }

  // 获取合并后的上下文规则（用于AI）
  async getMergedContextRules(projectId?: number) {
    const url = projectId
      ? `/context-rules/merged?project_id=${projectId}`
      : '/context-rules/merged'
    return fetchApiClient.get<{ content: string; rules: ContextRule[] }>(url)
  }

  // 预览合并后的上下文规则
  async previewMergedRules(projectId?: number) {
    const url = projectId
      ? `/context-rules/preview?project_id=${projectId}`
      : '/context-rules/preview'
    return fetchApiClient.get<{ content: string; rules: ContextRule[] }>(url)
  }

  // 复制上下文规则
  async copyContextRule(id: number, data: { name: string; project_id?: number }) {
    return fetchApiClient.post<ContextRule>(`/context-rules/${id}/copy`, data)
  }

  // 导入上下文规则
  async importContextRules(_file: File) {
    // TODO: 实现文件上传功能
    throw new Error('File upload not implemented with fetch client')
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

    // const _url = `/context-rules/export${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    // TODO: 实现文件下载功能
    throw new Error('File download not implemented with fetch client')
  }

  // 构建项目上下文字符串（用于任务详情页预览）
  async buildProjectContext(projectId: number, forTasks: boolean = true, forProjects: boolean = false) {
    return fetchApiClient.post<BuildContextResponse>('/context-rules/build-context', {
      project_id: projectId,
      for_tasks: forTasks,
      for_projects: forProjects
    })
  }

  // 从规则广场复制规则
  async copyRuleFromMarketplace(ruleId: number, data: {
    name: string;
    copy_as_global: boolean;
    target_project_id?: number
  }) {
    return fetchApiClient.post<ContextRule>(`/context-rules/${ruleId}/copy`, data)
  }
}

// 导出单例实例
export const contextRulesApi = new ContextRulesApi()
