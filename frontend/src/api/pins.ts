import { api } from './client'

// Pin相关类型定义
export interface UserProjectPin {
  id: number
  user_id: number
  project_id: number
  pin_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  project: {
    id: number
    name: string
    color: string
    status: string
  }
}

export interface PinStats {
  pin_count: number
  max_pins: number
  remaining: number
}

export interface PinOrderItem {
  project_id: number
  pin_order: number
}

// Pin API接口
export const pinsApi = {
  // 获取用户的Pin配置
  getUserPins: async (): Promise<{ pins: UserProjectPin[]; total: number }> => {
    const response = await api.get<{ pins: UserProjectPin[]; total: number }>('/pins')
    return response.data
  },

  // Pin一个项目
  pinProject: async (projectId: number, pinOrder?: number): Promise<{ message: string; pin: UserProjectPin }> => {
    const response = await api.post('/pins', {
      project_id: projectId,
      pin_order: pinOrder
    })
    return response.data
  },

  // 取消Pin一个项目
  unpinProject: async (projectId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/pins/${projectId}`)
    return response.data
  },

  // 重新排序Pin
  reorderPins: async (pinOrders: PinOrderItem[]): Promise<{ message: string }> => {
    const response = await api.put('/pins/reorder', {
      pin_orders: pinOrders
    })
    return response.data
  },

  // 检查项目的Pin状态
  checkPinStatus: async (projectId: number): Promise<{ project_id: number; is_pinned: boolean }> => {
    const response = await api.get(`/pins/check/${projectId}`)
    return response.data
  },

  // 获取Pin统计信息
  getPinStats: async (): Promise<PinStats> => {
    const response = await api.get('/pins/stats')
    return response.data
  }
}
