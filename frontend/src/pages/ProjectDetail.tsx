import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Space, 
  Tabs, 
  Table, 
  Tag,
  Breadcrumb,
  Spin,
  message
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  CopyOutlined,
  RobotOutlined
} from '@ant-design/icons'
import { useProjectStore, useTaskStore } from '../stores'
import type { Task } from '../api/tasks'

const { Title, Paragraph } = Typography
const { TabPane } = Tabs

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const {
    currentProject,
    loading: projectLoading,
    error: projectError,
    fetchProject,
    clearError: clearProjectError,
  } = useProjectStore()

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasks,
    setQueryParams,
    clearError: clearTasksError,
  } = useTaskStore()

  useEffect(() => {
    if (id) {
      fetchProject(parseInt(id))
      setQueryParams({ project_id: parseInt(id) })
      fetchTasks()
    }
  }, [id, fetchProject, fetchTasks, setQueryParams])

  const handleCopyProjectPrompt = () => {
    if (!currentProject) return

    // 获取待执行的任务
    const pendingTasks = tasks.filter(task =>
      ['todo', 'in_progress', 'review'].includes(task.status)
    )

    const prompt = `请帮我执行项目"${currentProject.name}"中的所有待办任务：

**项目信息**:
- 项目名称: ${currentProject.name}
- 项目描述: ${currentProject.description || '无'}
- GitHub仓库: ${currentProject.github_url || '无'}
- 项目上下文: ${currentProject.project_context || '无'}

**待执行任务数量**: ${pendingTasks.length}个

**执行指引**:
1. 请使用MCP工具连接到Todo系统: http://localhost:50110
2. 使用get_project_tasks_by_name工具获取项目任务列表:
   - 项目名称: "${currentProject.name}"
   - 状态筛选: ["todo", "in_progress", "review"]
3. 按照任务的创建时间顺序，逐个执行任务
4. 对于每个任务，使用get_task_by_id获取详细信息
5. 完成任务后，使用submit_task_feedback提交反馈
6. 继续执行下一个任务，直到所有任务完成

**任务概览**:
${pendingTasks.length > 0 ? pendingTasks.map((task, index) =>
  `${index + 1}. [${task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : task.priority === 'high' ? '高' : '紧急'}] ${task.title} (ID: ${task.id})`
).join('\n') : '暂无待执行任务'}

请开始执行这个项目的任务，并在每个任务完成后提交反馈。`

    navigator.clipboard.writeText(prompt).then(() => {
      message.success('项目执行提示词已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败，请手动复制')
    })
  }

  useEffect(() => {
    if (projectError) {
      message.error(projectError)
      clearProjectError()
    }
    if (tasksError) {
      message.error(tasksError)
      clearTasksError()
    }
  }, [projectError, tasksError, clearProjectError, clearTasksError])

  if (projectLoading && !currentProject) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={3}>项目不存在</Title>
          <Button type="primary" onClick={() => navigate('/projects')}>
            返回项目列表
          </Button>
        </div>
      </div>
    )
  }

  const taskColumns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Task) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.description && (
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          todo: { color: 'default', text: '待办' },
          in_progress: { color: 'processing', text: '进行中' },
          review: { color: 'warning', text: '待审核' },
          done: { color: 'success', text: '已完成' },
          cancelled: { color: 'error', text: '已取消' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.todo
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const priorityConfig = {
          low: { color: 'green', text: '低' },
          medium: { color: 'orange', text: '中' },
          high: { color: 'red', text: '高' },
          urgent: { color: 'magenta', text: '紧急' },
        }
        const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '分配给',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 120,
      render: (assignee: string) => assignee || '-',
    },
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-',
    },
  ]

  const stats = currentProject.stats || {
    total_tasks: 0,
    todo_tasks: 0,
    in_progress_tasks: 0,
    done_tasks: 0,
    context_rules_count: 0,
  }

  return (
    <div className="page-container">
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <Button 
            type="link" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/projects')}
            style={{ padding: 0 }}
          >
            项目管理
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{currentProject.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <div className="flex-between">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  backgroundColor: currentProject.color,
                  flexShrink: 0
                }} 
              />
              <Title level={2} className="page-title" style={{ margin: 0 }}>
                {currentProject.name}
              </Title>
              <Tag color={currentProject.status === 'active' ? 'green' : 'orange'}>
                {currentProject.status === 'active' ? '活跃' : '已归档'}
              </Tag>
            </div>
            {currentProject.description && (
              <Paragraph className="page-description">
                {currentProject.description}
              </Paragraph>
            )}
          </div>
          <Space>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyProjectPrompt}
              title="复制AI执行项目任务的提示词"
            >
              复制AI Prompt
            </Button>
            <Button icon={<EditOutlined />}>
              编辑项目
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              新建任务
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={stats.total_tasks}
              prefix={<CheckSquareOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待办任务"
              value={stats.todo_tasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="进行中"
              value={stats.in_progress_tasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.done_tasks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="项目概览" key="overview">
          <Card title="项目信息">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ marginBottom: '16px' }}>
                  <strong>创建时间：</strong>
                  {new Date(currentProject.created_at).toLocaleString('zh-CN')}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>更新时间：</strong>
                  {new Date(currentProject.updated_at).toLocaleString('zh-CN')}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>创建者：</strong>
                  {currentProject.created_by || '-'}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: '16px' }}>
                  <strong>项目颜色：</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div 
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '4px', 
                        backgroundColor: currentProject.color,
                        border: '1px solid #d9d9d9'
                      }} 
                    />
                    <span style={{ fontFamily: 'monospace' }}>{currentProject.color}</span>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>上下文规则：</strong>
                  {stats.context_rules_count} 条
                </div>
              </Col>
            </Row>
          </Card>
        </TabPane>

        <TabPane tab="任务列表" key="tasks">
          <Card>
            <Table
              columns={taskColumns}
              dataSource={tasks}
              rowKey="id"
              loading={tasksLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="上下文规则" key="context">
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <CheckSquareOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>上下文规则功能开发中...</div>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default ProjectDetail
