import { fetchApiClient } from './fetchClient'
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
    return fetchApiClient.post<LogoutResponse>('/auth/logout', {
      return_to: returnTo || window.location.origin + '/todo-for-ai/pages'
    })
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<User> {
    return fetchApiClient.get<User>('/auth/me')
  }

  /**
   * 更新当前用户信息
   */
  static async updateCurrentUser(userData: Partial<User>): Promise<User> {
    return fetchApiClient.put<User>('/auth/me', userData)
  }

  /**
   * 验证token
   */
  static async verifyToken(token: string): Promise<{ valid: boolean; message: string }> {
    return fetchApiClient.post<{ valid: boolean; message: string }>('/auth/verify', {
      token
    })
  }

  /**
   * 刷新访问令牌
   */
  static async refreshToken(): Promise<{ access_token: string; token_type: string }> {
    return fetchApiClient.post<{ access_token: string; token_type: string }>('/auth/refresh')
  }

  /**
   * 获取用户列表（管理员功能）
   */
  static async getUsers(params: UserListParams = {}): Promise<UserListResponse> {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })
    const url = `/auth/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return fetchApiClient.get<UserListResponse>(url)
  }

  /**
   * 获取指定用户信息
   */
  static async getUser(userId: number): Promise<User> {
    return fetchApiClient.get<User>(`/auth/users/${userId}`)
  }

  /**
   * 更新用户状态（管理员功能）
   */
  static async updateUserStatus(userId: number, status: UpdateUserStatusRequest['status']): Promise<User> {
    return fetchApiClient.put<User>(`/auth/users/${userId}/status`, { status })
  }
}

export default AuthAPI
