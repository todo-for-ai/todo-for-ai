/**
 * 仪表盘API客户端
 */

import { fetchApiClient } from './fetchClient'

// 仪表盘统计数据类型
export interface DashboardStats {
  projects: {
    total: number
    active: number
  }
  tasks: {
    total: number
    todo: number
    in_progress: number
    review: number
    done: number
    ai_executing: number
  }
  recent_projects: Array<{
    id: number
    name: string
    description?: string
    status: string
    created_at: string
    updated_at: string
  }>
  recent_tasks: Array<{
    id: number
    title: string
    content?: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    project?: {
      id: number
      name: string
      color: string
    }
  }>
  activity_stats: {
    total_created: number
    total_updated: number
    total_status_changed: number
    total_activities: number
    active_days: number
    period_days: number
  }
}

// 活跃度热力图数据类型
export interface ActivityHeatmapData {
  date: string
  count: number
  level: number // 0-4，用于颜色等级
  task_created_count: number
  task_updated_count: number
  task_status_changed_count: number
  task_completed_count: number
  first_activity_at: string | null
  last_activity_at: string | null
}

export interface ActivityHeatmapResponse {
  heatmap_data: ActivityHeatmapData[]
  user_id: number
  generated_at: string
}

// 活跃度摘要统计类型
export interface ActivitySummary {
  stats_7d: {
    total_created: number
    total_updated: number
    total_status_changed: number
    total_activities: number
    active_days: number
    period_days: number
  }
  stats_30d: {
    total_created: number
    total_updated: number
    total_status_changed: number
    total_activities: number
    active_days: number
    period_days: number
  }
  stats_90d: {
    total_created: number
    total_updated: number
    total_status_changed: number
    total_activities: number
    active_days: number
    period_days: number
  }
  stats_365d: {
    total_created: number
    total_updated: number
    total_status_changed: number
    total_activities: number
    active_days: number
    period_days: number
  }
  consecutive_active_days: number
  most_active_day: {
    date: string | null
    count: number
  }
}

// 仪表盘API服务类
export class DashboardApi {
  /**
   * 获取仪表盘统计数据
   */
  async getStats(): Promise<DashboardStats> {
    const response = await fetchApiClient.get<DashboardStats>('/dashboard/stats')
    return (response as any).data
  }

  /**
   * 获取活跃度热力图数据
   */
  async getActivityHeatmap(): Promise<ActivityHeatmapResponse> {
    const response = await fetchApiClient.get<ActivityHeatmapResponse>('/dashboard/activity-heatmap')
    return (response as any).data
  }

  /**
   * 获取活跃度摘要统计
   */
  async getActivitySummary(): Promise<ActivitySummary> {
    const response = await fetchApiClient.get<ActivitySummary>('/dashboard/activity-summary')
    return (response as any).data
  }
}

// 导出单例实例
export const dashboardApi = new DashboardApi()
