import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { contextRulesApi } from '../api/contextRules'
import type {
  ContextRule,
  ContextRuleQueryParams,
  CreateContextRuleData,
  UpdateContextRuleData
} from '../api/contextRules'

interface ContextRuleState {
  // 状态
  contextRules: ContextRule[]
  currentContextRule: ContextRule | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
    has_prev: boolean
    has_next: boolean
  } | null

  // 查询参数
  queryParams: ContextRuleQueryParams

  // 预览相关
  previewContent: string
  previewRules: ContextRule[]
  previewLoading: boolean

  // 操作方法
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setQueryParams: (params: Partial<ContextRuleQueryParams>) => void
  
  // API操作
  fetchContextRules: () => Promise<void>
  fetchContextRule: (id: number) => Promise<void>
  createContextRule: (data: CreateContextRuleData) => Promise<ContextRule | null>
  updateContextRule: (id: number, data: UpdateContextRuleData) => Promise<ContextRule | null>
  deleteContextRule: (id: number) => Promise<boolean>
  toggleContextRule: (id: number, is_active: boolean) => Promise<boolean>
  copyContextRule: (id: number, data: { name: string; project_id?: number }) => Promise<ContextRule | null>
  copyRuleFromMarketplace: (id: number, data: { name: string; copy_as_global: boolean; target_project_id?: number }) => Promise<ContextRule | null>
  
  // 预览功能
  previewMergedRules: (projectId?: number) => Promise<void>
  getMergedContextRules: (projectId?: number) => Promise<{ content: string; rules: ContextRule[] } | null>
  
  // 工具方法
  clearError: () => void
  reset: () => void
}

const initialState = {
  contextRules: [],
  currentContextRule: null,
  loading: false,
  error: null,
  pagination: null,
  queryParams: {
    page: 1,
    per_page: 20,
    sort_by: 'priority',
    sort_order: 'desc' as const,
  },
  previewContent: '',
  previewRules: [],
  previewLoading: false,
}

export const useContextRuleStore = create<ContextRuleState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setQueryParams: (params) => 
        set((state) => ({
          queryParams: { ...state.queryParams, ...params }
        })),

      fetchContextRules: async () => {
        const { queryParams } = get()
        set({ loading: true, error: null })
        
        try {
          const response = await contextRulesApi.getContextRules(queryParams)
          set({
            contextRules: response.data?.items || [],
            pagination: response.data?.pagination || null,
            loading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '获取上下文规则列表失败',
            loading: false,
          })
        }
      },

      fetchContextRule: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await contextRulesApi.getContextRule(id)
          set({
            currentContextRule: response.data || null,
            loading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '获取上下文规则详情失败',
            loading: false,
          })
        }
      },

      createContextRule: async (data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await contextRulesApi.createContextRule(data)
          const newRule = response.data
          
          if (newRule) {
            set((state) => ({
              contextRules: [newRule, ...state.contextRules],
              loading: false,
            }))
            return newRule
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '创建上下文规则失败',
            loading: false,
          })
          return null
        }
      },

      updateContextRule: async (id, data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await contextRulesApi.updateContextRule(id, data)
          const updatedRule = response.data
          
          if (updatedRule) {
            set((state) => ({
              contextRules: state.contextRules.map((rule) => 
                rule.id === id ? updatedRule : rule
              ),
              currentContextRule: state.currentContextRule?.id === id ? updatedRule : state.currentContextRule,
              loading: false,
            }))
            return updatedRule
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '更新上下文规则失败',
            loading: false,
          })
          return null
        }
      },

      deleteContextRule: async (id) => {
        set({ loading: true, error: null })
        
        try {
          await contextRulesApi.deleteContextRule(id)
          set((state) => ({
            contextRules: state.contextRules.filter((rule) => rule.id !== id),
            currentContextRule: state.currentContextRule?.id === id ? null : state.currentContextRule,
            loading: false,
          }))
          return true
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '删除上下文规则失败',
            loading: false,
          })
          return false
        }
      },

      toggleContextRule: async (id, is_active) => {
        try {
          const response = await contextRulesApi.toggleContextRule(id, is_active)
          const updatedRule = response.data
          
          if (updatedRule) {
            set((state) => ({
              contextRules: state.contextRules.map((rule) => 
                rule.id === id ? updatedRule : rule
              ),
              currentContextRule: state.currentContextRule?.id === id ? updatedRule : state.currentContextRule,
            }))
            return true
          }
          return false
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '切换上下文规则状态失败',
          })
          return false
        }
      },

      copyContextRule: async (id, data) => {
        set({ loading: true, error: null })

        try {
          const response = await contextRulesApi.copyContextRule(id, data)
          const newRule = response.data

          if (newRule) {
            set((state) => ({
              contextRules: [newRule, ...state.contextRules],
              loading: false,
            }))
            return newRule
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '复制上下文规则失败',
            loading: false,
          })
          return null
        }
      },

      copyRuleFromMarketplace: async (id, data) => {
        set({ loading: true, error: null })

        try {
          const response = await contextRulesApi.copyRuleFromMarketplace(id, data)
          const newRule = response.data

          if (newRule) {
            set((state) => ({
              contextRules: [newRule, ...state.contextRules],
              loading: false,
            }))
            return newRule
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '从规则广场复制规则失败',
            loading: false,
          })
          return null
        }
      },

      previewMergedRules: async (projectId) => {
        set({ previewLoading: true, error: null })
        
        try {
          const response = await contextRulesApi.previewMergedRules(projectId)
          set({
            previewContent: response.data?.content || '',
            previewRules: response.data?.rules || [],
            previewLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '预览合并规则失败',
            previewLoading: false,
          })
        }
      },

      getMergedContextRules: async (projectId) => {
        try {
          const response = await contextRulesApi.getMergedContextRules(projectId)
          return response.data || null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '获取合并规则失败',
          })
          return null
        }
      },

      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'context-rule-store',
    }
  )
)
