import React, { useEffect, useState } from 'react'
import { Card, Tooltip, Spin, message } from 'antd'
import { dashboardApi, type ActivityHeatmapData } from '../api/dashboard'

interface ActivityHeatmapProps {
  className?: string
  style?: React.CSSProperties
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ className, style }) => {
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapData[]>([])
  const [loading, setLoading] = useState(true)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    loadHeatmapData()
  }, [])

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const loadHeatmapData = async () => {
    try {
      setLoading(true)
      const response = await dashboardApi.getActivityHeatmap()
      setHeatmapData(response.heatmap_data)
    } catch (error) {
      console.error('加载活跃度热力图失败:', error)
      message.error('加载活跃度热力图失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取颜色等级对应的颜色
  const getColorByLevel = (level: number): string => {
    const colors = [
      '#ebedf0', // level 0 - 无活动
      '#9be9a8', // level 1 - 低活动
      '#40c463', // level 2 - 中等活动
      '#30a14e', // level 3 - 高活动
      '#216e39'  // level 4 - 非常高活动
    ]
    return colors[level] || colors[0]
  }

  // 格式化日期显示
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 获取活动描述
  const getActivityDescription = (count: number): string => {
    if (count === 0) return '无活动'
    if (count === 1) return '1次活动'
    return `${count}次活动`
  }

  // 按周分组数据
  const groupDataByWeeks = (data: ActivityHeatmapData[]) => {
    const weeks: ActivityHeatmapData[][] = []
    let currentWeek: ActivityHeatmapData[] = []
    
    data.forEach((item, index) => {
      const date = new Date(item.date)
      const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ...
      
      // 如果是周日或者是第一个元素，开始新的一周
      if (dayOfWeek === 0 || index === 0) {
        if (currentWeek.length > 0) {
          weeks.push(currentWeek)
        }
        currentWeek = []
      }
      
      currentWeek.push(item)
    })
    
    // 添加最后一周
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    return weeks
  }

  const weeks = groupDataByWeeks(heatmapData)

  if (loading) {
    return (
      <Card title="活跃度热力图" className={className} style={style}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    )
  }

  // 计算响应式方块尺寸
  const calculateCellSize = () => {
    const availableWidth = Math.min(windowWidth - 280, 1400) // 减去侧边栏(240px)和padding(40px)
    const totalWeeks = weeks.length
    if (totalWeeks === 0) return 12 // 默认尺寸

    const maxCellSize = Math.floor((availableWidth - 60) / totalWeeks) // 60px for labels and gaps
    return Math.max(Math.min(maxCellSize, 18), 10) // 最小10px，最大18px
  }

  const cellSize = calculateCellSize()
  const gap = Math.max(Math.floor(cellSize / 4), 1) // 间隙为方块尺寸的1/4，最小1px

  return (
    <Card title="活跃度热力图" className={className} style={style}>
      <div style={{ padding: '16px 0' }}>
        {/* 月份标签 */}
        <div style={{
          display: 'flex',
          marginBottom: '12px',
          fontSize: '14px',
          color: '#666',
          fontWeight: 500
        }}>
          <div style={{ width: '100%', textAlign: 'center' }}>
            过去一年的活跃度
          </div>
        </div>

        {/* 热力图网格 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${gap}px`,
          overflowX: 'auto',
          width: '100%'
        }}>
          {/* 星期标签 */}
          <div style={{ display: 'flex', gap: `${gap}px`, marginBottom: '8px' }}>
            <div style={{
              width: `${cellSize + 8}px`,
              fontSize: `${Math.max(cellSize - 2, 10)}px`,
              color: '#666',
              textAlign: 'center'
            }}>
              周
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
                {week.map((day, dayIndex) => {
                  const date = new Date(day.date)
                  const dayOfWeek = date.getDay()
                  const dayLabels = ['日', '一', '二', '三', '四', '五', '六']

                  return (
                    <div
                      key={dayIndex}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        fontSize: `${Math.max(cellSize - 4, 8)}px`,
                        color: '#666',
                        textAlign: 'center',
                        lineHeight: `${cellSize}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {weekIndex === 0 ? dayLabels[dayOfWeek] : ''}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* 热力图方块 */}
          <div style={{ display: 'flex', gap: `${gap}px` }}>
            <div style={{ width: `${cellSize + 8}px` }}></div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
                {week.map((day, dayIndex) => (
                  <Tooltip
                    key={dayIndex}
                    title={`${formatDate(day.date)}: ${getActivityDescription(day.count)}`}
                  >
                    <div
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        backgroundColor: getColorByLevel(day.level),
                        border: '1px solid #e1e4e8',
                        borderRadius: `${Math.max(Math.floor(cellSize / 4), 2)}px`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          borderColor: '#1890ff'
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)'
                        e.currentTarget.style.borderColor = '#1890ff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.borderColor = '#e1e4e8'
                      }}
                    />
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 图例 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: '20px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span style={{ marginRight: '12px' }}>少</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              style={{
                width: `${Math.max(cellSize - 2, 10)}px`,
                height: `${Math.max(cellSize - 2, 10)}px`,
                backgroundColor: getColorByLevel(level),
                border: '1px solid #e1e4e8',
                borderRadius: `${Math.max(Math.floor(cellSize / 4), 2)}px`,
                marginRight: `${gap}px`
              }}
            />
          ))}
          <span style={{ marginLeft: '12px' }}>多</span>
        </div>
      </div>
    </Card>
  )
}

export default ActivityHeatmap
