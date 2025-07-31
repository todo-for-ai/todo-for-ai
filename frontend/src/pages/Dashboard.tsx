import { useEffect, useState } from 'react'
import { Typography, Card, Row, Col, Statistic, Spin, message, List, Tag } from 'antd'
import {
  ProjectOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { dashboardApi, type DashboardStats } from '../api/dashboard'
import ActivityHeatmap from '../components/ActivityHeatmap'
import { usePageTranslation } from '../i18n/hooks/useTranslation'

const { Title, Paragraph } = Typography

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { tp, tc, pageTitle } = usePageTranslation('dashboard')

  // 设置网页标题
  useEffect(() => {
    document.title = `${pageTitle} - Todo for AI`

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [pageTitle])

  // 加载仪表盘数据
  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      const data = await dashboardApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('加载仪表盘数据失败:', error)
      message.error(tc('messages.error.general'))
    } finally {
      setLoading(false)
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }

  // 获取任务状态标签颜色
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'todo': 'default',
      'in_progress': 'processing',
      'review': 'warning',
      'done': 'success',
      'cancelled': 'error'
    }
    return colors[status] || 'default'
  }

  // 获取任务状态文本
  const getStatusText = (status: string) => {
    const statusKey = `taskStatus.${status}`
    try {
      return tp(statusKey)
    } catch {
      return status
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    )
  }
  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="page-title">
          {pageTitle}
        </Title>
        <Paragraph className="page-description">
          {tp('subtitle')}
        </Paragraph>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={tp('stats.totalProjects')}
              value={stats?.projects.total || 0}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={tp('misc.totalTasks')}
              value={stats?.tasks.total || 0}
              prefix={<CheckSquareOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={tp('taskStatus.in_progress')}
              value={(stats?.tasks.in_progress || 0) + (stats?.tasks.review || 0)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={tp('taskStatus.ai_executing')}
              value={stats?.tasks.ai_executing || 0}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 活跃度热力图 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <ActivityHeatmap />
        </Col>
      </Row>

      {/* 最近项目和任务 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={tp('sections.recentProjects')} variant="borderless">
            {stats?.recent_projects && stats.recent_projects.length > 0 ? (
              <List
                dataSource={stats.recent_projects}
                renderItem={(project) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<ProjectOutlined style={{ color: '#1890ff' }} />}
                      title={project.name}
                      description={
                        <div>
                          <div>{project.description || tp('misc.noDescription')}</div>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            <CalendarOutlined style={{ marginRight: '4px' }} />
                            {formatDate(project.updated_at)}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <ProjectOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>暂无项目数据</div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={tp('sections.recentTasks')} variant="borderless">
            {stats?.recent_tasks && stats.recent_tasks.length > 0 ? (
              <List
                dataSource={stats.recent_tasks}
                renderItem={(task) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<CheckSquareOutlined style={{ color: '#52c41a' }} />}
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{task.title}</span>
                          <Tag color={getStatusColor(task.status)}>
                            {getStatusText(task.status)}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ color: '#666' }}>
                            {task.project?.name || tp('misc.unknownProject')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            <CalendarOutlined style={{ marginRight: '4px' }} />
                            {formatDate(task.updated_at)}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <CheckSquareOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>暂无任务数据</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
