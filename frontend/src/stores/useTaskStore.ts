import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { tasksApi } from '../api/tasks'
import type { Task, TaskQueryParams, CreateTaskData, UpdateTaskData } from '../api/tasks'

interface TaskState {
  // 状态
  tasks: Task[]
  currentTask: Task | null
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
  queryParams: TaskQueryParams

  // 操作方法
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setQueryParams: (params: Partial<TaskQueryParams>) => void
  
  // API操作
  fetchTasks: () => Promise<void>
  fetchTasksByParams: (params: TaskQueryParams) => Promise<Task[]>
  fetchTask: (id: number) => Promise<void>
  getTask: (id: number) => Promise<Task | null>
  createTask: (data: CreateTaskData) => Promise<Task | null>
  updateTask: (id: number, data: UpdateTaskData) => Promise<Task | null>
  deleteTask: (id: number) => Promise<boolean>
  updateTaskStatus: (id: number, status: Task['status']) => Promise<boolean>
  updateTaskProgress: (id: number, completion_rate: number) => Promise<boolean>
  assignTask: (id: number, assignee: string) => Promise<boolean>
  
  // 工具方法
  clearError: () => void
  reset: () => void
}

const initialState = {
  tasks: [],
  currentTask: null,
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

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setQueryParams: (params) => 
        set((state) => ({
          queryParams: { ...state.queryParams, ...params }
        })),

      fetchTasks: async () => {
        const { queryParams } = get()
        set({ loading: true, error: null })

        try {
          const response = await tasksApi.getTasks(queryParams)
          set({
            tasks: response.data?.items || [],
            pagination: response.data?.pagination || null,
            loading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '获取任务列表失败',
            loading: false,
          })
        }
      },

      fetchTasksByParams: async (params) => {
        try {
          const response = await tasksApi.getTasks(params)
          return response.data?.items || []
        } catch (error: any) {
          console.error('获取任务列表失败:', error)
          return []
        }
      },

      fetchTask: async (id) => {
        set({ loading: true, error: null })

        try {
          const response = await tasksApi.getTask(id)
          set({
            currentTask: response.data || null,
            loading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '获取任务详情失败',
            loading: false,
          })
        }
      },

      getTask: async (id) => {
        try {
          const response = await tasksApi.getTask(id)
          return response.data || null
        } catch (error: any) {
          console.error('获取任务失败:', error)
          return null
        }
      },

      createTask: async (data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await tasksApi.createTask(data)
          const newTask = response.data
          
          if (newTask) {
            set((state) => ({
              tasks: [newTask, ...state.tasks],
              loading: false,
            }))
            return newTask
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '创建任务失败',
            loading: false,
          })
          return null
        }
      },

      updateTask: async (id, data) => {
        set({ loading: true, error: null })
        
        try {
          const response = await tasksApi.updateTask(id, data)
          const updatedTask = response.data
          
          if (updatedTask) {
            set((state) => ({
              tasks: state.tasks.map((t) => 
                t.id === id ? updatedTask : t
              ),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
              loading: false,
            }))
            return updatedTask
          }
          return null
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '更新任务失败',
            loading: false,
          })
          return null
        }
      },

      deleteTask: async (id) => {
        set({ loading: true, error: null })
        
        try {
          await tasksApi.deleteTask(id)
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            currentTask: state.currentTask?.id === id ? null : state.currentTask,
            loading: false,
          }))
          return true
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '删除任务失败',
            loading: false,
          })
          return false
        }
      },

      updateTaskStatus: async (id, status) => {
        try {
          const response = await tasksApi.updateTaskStatus(id, status)
          const updatedTask = response.data
          
          if (updatedTask) {
            set((state) => ({
              tasks: state.tasks.map((t) => 
                t.id === id ? updatedTask : t
              ),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            }))
            return true
          }
          return false
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '更新任务状态失败',
          })
          return false
        }
      },

      updateTaskProgress: async (id, completion_rate) => {
        try {
          const response = await tasksApi.updateTaskProgress(id, completion_rate)
          const updatedTask = response.data
          
          if (updatedTask) {
            set((state) => ({
              tasks: state.tasks.map((t) => 
                t.id === id ? updatedTask : t
              ),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            }))
            return true
          }
          return false
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '更新任务进度失败',
          })
          return false
        }
      },

      assignTask: async (id, assignee) => {
        try {
          // 暂时注释掉assignTask调用，因为API中没有这个方法
          // const response = await tasksApi.assignTask(id, assignee)
          const response = await tasksApi.updateTask(id, { created_by: assignee })
          const updatedTask = response.data
          
          if (updatedTask) {
            set((state) => ({
              tasks: state.tasks.map((t) => 
                t.id === id ? updatedTask : t
              ),
              currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
            }))
            return true
          }
          return false
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || '分配任务失败',
          })
          return false
        }
      },

      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'task-store',
    }
  )
)
