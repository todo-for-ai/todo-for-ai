// 基础配置
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:50110/todo-for-ai/api/v1'

// 创建fetch客户端
class FetchApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    // 获取认证token
    const token = localStorage.getItem('auth_token')

    // 设置最简单的headers
    const headers: HeadersInit = {}

    // 添加认证token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // 只在POST/PUT请求时添加Content-Type
    if (options.method === 'POST' || options.method === 'PUT') {
      headers['Content-Type'] = 'application/json'
    }

    console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`, options.body)

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`[API Response] ${options.method || 'GET'} ${endpoint}`, data)
      return data
    } catch (error) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}`, error)
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const fetchApiClient = new FetchApiClient(BASE_URL)
