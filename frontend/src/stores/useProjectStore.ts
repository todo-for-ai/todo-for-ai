import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { projectsApi } from '../api/projects'
import type { Project, ProjectQueryParams, CreateProjectData, UpdateProjectData } from '../api/projects'

interface ProjectState {
  // 状态
  projects: Project[]
  currentProject: Project | null
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
  queryParams: ProjectQueryParams

  // 操作方法
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setQueryParams: (params: Partial<ProjectQueryParams>) => void
  
  // API操作
  fetchProjects: () => Promise<void>
  fetchProject: (id: number) => Promise<void>
  createProject: (data: CreateProjectData) => Promise<Project | null>
  updateProject: (id: number, data: UpdateProjectData) => Promise<Project | null>
  deleteProject: (id: number) => Promise<boolean>
  archiveProject: (id: number) => Promise<boolean>
  restoreProject: (id: number) => Promise<boolean>
  
  // 工具方法
  clearError: () => void
  reset: () => void
}

const initialState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  pagination: null,
  queryParams: {
    page: 1,
    per_page: 20,
    sort_by: 'created_at',
    sort_order: 'desc' as const,
  },
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setQueryParams: (params) => 
        set((state) => ({
          queryParams: { ...state.queryParams, ...params }
        })),

      fetchProjects: async () => {
        const { queryParams } = get()
        set({ loading: true, error: null })
        
        try {
          const response = await projectsApi.getProjects(queryParams)
          set({
            projects: Array.isArray(response.data) ? response.data : (response.data as any)?.data || [],
            pagination: (response.data as any)?.pagination || null,
            loading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '获取项目列表失败',
            loading: false,
          })
        }
      },

      fetchProject: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await projectsApi.getProject(id)
          set({
            currentProject: response.data || null,
            loading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '获取项目详情失败',
            loading: false,
          })
        }
      },

      createProject: async (data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await projectsApi.createProject(data)
          const newProject = response.data
          
          if (newProject) {
            set((state) => ({
              projects: [newProject, ...state.projects],
              loading: false,
            }))
            return newProject
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '创建项目失败',
            loading: false,
          })
          return null
        }
      },

      updateProject: async (id, data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await projectsApi.updateProject(id, data)
          const updatedProject = response.data
          
          if (updatedProject) {
            set((state) => ({
              projects: state.projects.map((p) => 
                p.id === id ? updatedProject : p
              ),
              currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject,
              loading: false,
            }))
            return updatedProject
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '更新项目失败',
            loading: false,
          })
          return null
        }
      },

      deleteProject: async (id) => {
        set({ loading: true, error: null })
        
        try {
          await projectsApi.deleteProject(id)
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            currentProject: state.currentProject?.id === id ? null : state.currentProject,
            loading: false,
          }))
          return true
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '删除项目失败',
            loading: false,
          })
          return false
        }
      },

      archiveProject: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await projectsApi.archiveProject(id)
          const archivedProject = response.data
          
          if (archivedProject) {
            set((state) => ({
              projects: state.projects.map((p) => 
                p.id === id ? archivedProject : p
              ),
              currentProject: state.currentProject?.id === id ? archivedProject : state.currentProject,
              loading: false,
            }))
            return true
          }
          return false
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '归档项目失败',
            loading: false,
          })
          return false
        }
      },

      restoreProject: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await projectsApi.restoreProject(id)
          const restoredProject = response.data
          
          if (restoredProject) {
            set((state) => ({
              projects: state.projects.map((p) => 
                p.id === id ? restoredProject : p
              ),
              currentProject: state.currentProject?.id === id ? restoredProject : state.currentProject,
              loading: false,
            }))
            return true
          }
          return false
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '恢复项目失败',
            loading: false,
          })
          return false
        }
      },

      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'project-store',
    }
  )
)
