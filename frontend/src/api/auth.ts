import { api } from './client'
import type { User } from '../stores/useAuthStore'

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface LogoutResponse {
  logout_url: string
  params: {
    client_id: string
    returnTo: string
  }
  message: string
}

export interface UserListResponse {
  users: User[]
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
    has_prev: boolean
    has_next: boolean
  }
}

export interface UserListParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
  role?: string
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'inactive' | 'suspended'
}

export class AuthAPI {
  /**
   * 启动登录流程（默认GitHub）
   */
  static login(redirectUri?: string): void {
    AuthAPI.loginWithGitHub(redirectUri)
  }

  /**
   * 启动GitHub登录流程
   */
  static loginWithGitHub(redirectUri?: string): void {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:50110/todo-for-ai/api/v1'
    const returnTo = redirectUri || window.location.href

    window.location.href = `${baseUrl}/auth/login/github?return_to=${encodeURIComponent(returnTo)}`
  }

  /**
   * 启动Google登录流程
   */
  static loginWithGoogle(redirectUri?: string): void {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:50110/todo-for-ai/api/v1'
    const returnTo = redirectUri || window.location.href

    window.location.href = `${baseUrl}/auth/login/google?return_to=${encodeURIComponent(returnTo)}`
  }

  /**
   * 登出
   */
  static async logout(returnTo?: string): Promise<LogoutResponse> {
    const response = await api.post<LogoutResponse>('/auth/logout', {
      return_to: returnTo || window.location.origin + '/todo-for-ai/pages'
    })
    return response.data!
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me')
    return response.data!
  }

  /**
   * 更新当前用户信息
   */
  static async updateCurrentUser(userData: Partial<User>): Promise<User> {
    const response = await api.put<User>('/auth/me', userData)
    return response.data!
  }

  /**
   * 验证token
   */
  static async verifyToken(token: string): Promise<{ valid: boolean; message: string }> {
    const response = await api.post<{ valid: boolean; message: string }>('/auth/verify', {
      token
    })
    return response.data!
  }

  /**
   * 刷新访问令牌
   */
  static async refreshToken(): Promise<{ access_token: string; token_type: string }> {
    const response = await api.post<{ access_token: string; token_type: string }>('/auth/refresh')
    return response.data!
  }

  /**
   * 获取用户列表（管理员功能）
   */
  static async getUsers(params: UserListParams = {}): Promise<UserListResponse> {
    const response = await api.get<UserListResponse>('/auth/users', { params })
    return response.data!
  }

  /**
   * 获取指定用户信息
   */
  static async getUser(userId: number): Promise<User> {
    const response = await api.get<User>(`/auth/users/${userId}`)
    return response.data!
  }

  /**
   * 更新用户状态（管理员功能）
   */
  static async updateUserStatus(userId: number, status: UpdateUserStatusRequest['status']): Promise<User> {
    const response = await api.put<User>(`/auth/users/${userId}/status`, { status })
    return response.data!
  }
}

export default AuthAPI
