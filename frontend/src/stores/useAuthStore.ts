import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { fetchApiClient } from '../api/fetchClient'

export interface User {
  id: number
  auth0_user_id: string
  email: string
  email_verified: boolean
  username?: string
  nickname?: string
  full_name?: string
  avatar_url?: string
  bio?: string
  provider?: string
  role: 'admin' | 'user' | 'viewer'
  status: 'active' | 'inactive' | 'suspended'
  last_login_at?: string
  last_active_at?: string
  preferences?: Record<string, any>
  timezone?: string
  locale?: string
  created_at: string
  updated_at: string
}

interface AuthState {
  // 状态
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // 操作
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (redirectUri?: string) => void
  loginWithGitHub: (redirectUri?: string) => void
  loginWithGoogle: (redirectUri?: string) => void
  logout: () => Promise<void>
  fetchCurrentUser: () => Promise<void>
  updateUser: (userData: Partial<User>) => Promise<void>
  checkAuth: () => Promise<boolean>
  clearAuth: () => void
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setUser: (user) => {
          set({ 
            user, 
            isAuthenticated: !!user 
          })
        },

        setToken: (token) => {
          set({ token, isAuthenticated: !!token })
          
          // 更新localStorage
          if (token) {
            localStorage.setItem('auth_token', token)
          } else {
            localStorage.removeItem('auth_token')
          }
        },

        setLoading: (isLoading) => set({ isLoading }),

        setError: (error) => set({ error }),

        login: (redirectUri) => {
          // 默认使用GitHub登录（保持向后兼容）
          get().loginWithGitHub(redirectUri)
        },

        loginWithGitHub: (redirectUri) => {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:50110/todo-for-ai/api/v1'
          const returnTo = redirectUri || window.location.href

          // 重定向到GitHub登录端点
          window.location.href = `${baseUrl}/auth/login/github?return_to=${encodeURIComponent(returnTo)}`
        },

        loginWithGoogle: (redirectUri) => {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:50110/todo-for-ai/api/v1'
          const returnTo = redirectUri || window.location.href

          // 重定向到Google登录端点
          window.location.href = `${baseUrl}/auth/login/google?return_to=${encodeURIComponent(returnTo)}`
        },

        logout: async () => {
          const { token } = get()
          
          try {
            set({ isLoading: true, error: null })
            
            if (token) {
              // 调用后端登出接口
              await fetchApiClient.post('/auth/logout', {
                return_to: window.location.origin + '/todo-for-ai/pages'
              })
            }
          } catch (error: any) {
            console.error('Logout error:', error)
            // 即使后端登出失败，也要清除本地状态
          } finally {
            // 清除本地状态
            get().clearAuth()
            
            // 重定向到登录页面
            window.location.href = '/todo-for-ai/pages/login'
          }
        },

        fetchCurrentUser: async () => {
          const { token } = get()
          
          if (!token) {
            set({ user: null, isAuthenticated: false })
            return
          }

          try {
            set({ isLoading: true, error: null })
            
            const response = await fetchApiClient.get('/auth/me')
            const user = response.data
            
            set({ 
              user, 
              isAuthenticated: true,
              isLoading: false 
            })
          } catch (error: any) {
            console.error('Failed to fetch current user:', error)
            
            // 如果是401错误，清除认证状态
            if (error.response?.status === 401) {
              get().clearAuth()
            }
            
            set({ 
              error: error.response?.data?.error?.message || '获取用户信息失败',
              isLoading: false 
            })
          }
        },

        updateUser: async (userData) => {
          try {
            set({ isLoading: true, error: null })
            
            const response = await fetchApiClient.put('/auth/me', userData)
            const updatedUser = response.data
            
            set({ 
              user: updatedUser,
              isLoading: false 
            })
          } catch (error: any) {
            set({ 
              error: error.response?.data?.error?.message || '更新用户信息失败',
              isLoading: false 
            })
            throw error
          }
        },

        checkAuth: async () => {
          const { token } = get()
          
          if (!token) {
            return false
          }

          try {
            // 验证token是否有效
            await get().fetchCurrentUser()
            return get().isAuthenticated
          } catch (error) {
            console.error('Auth check failed:', error)
            get().clearAuth()
            return false
          }
        },

        clearAuth: () => {
          // 清除localStorage
          localStorage.removeItem('auth_token')
          
          // 重置状态
          set({
            ...initialState
          })
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          token: state.token,
          user: state.user,
        }),
        onRehydrateStorage: () => (state) => {
          // 从localStorage恢复token
          const token = localStorage.getItem('auth_token')
          if (token && state) {
            state.token = token
            state.isAuthenticated = !!token
          }
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// 初始化时检查认证状态
const initializeAuth = () => {
  const { token, checkAuth } = useAuthStore.getState()
  
  // 检查URL中是否有token参数（来自OAuth回调）
  const urlParams = new URLSearchParams(window.location.search)
  const urlToken = urlParams.get('token')
  
  if (urlToken) {
    // 从URL中获取token并保存
    useAuthStore.getState().setToken(urlToken)
    
    // 清除URL中的token参数
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('token')
    window.history.replaceState({}, '', newUrl.toString())
    
    // 获取用户信息
    useAuthStore.getState().fetchCurrentUser()
  } else if (token) {
    // 如果有保存的token，验证其有效性
    checkAuth()
  }
}

// 在模块加载时初始化
if (typeof window !== 'undefined') {
  initializeAuth()
}

export default useAuthStore
