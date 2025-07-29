import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
  message,
  Select,
  Popconfirm,
  Progress,
  Input,
  DatePicker
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  CopyOutlined,
  RobotOutlined,
  AppstoreOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilterOutlined,
  GithubOutlined,
  LinkOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { useProjectStore, useTaskStore } from '../stores'
import { KanbanBoard } from '../components/Kanban'
import { TaskContentSummary } from '../components/TaskContentPreview'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { Task } from '../api/tasks'

const { Title, Paragraph } = Typography
const { TabPane } = Tabs
const { Option } = Select
const { Search } = Input

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'tasks')

  // 从localStorage加载任务筛选条件
  const loadTaskFiltersFromStorage = () => {
    try {
      const saved = localStorage.getItem('project-task-filters')
      if (saved) {
        return { ...JSON.parse(saved) }
      }
    } catch (error) {
      console.warn('Failed to load task filters from localStorage:', error)
    }
    // 默认筛选条件：只显示待办任务
    return {
      status: 'todo,in_progress,review',
      priority: '',
      search: '',
      sort_by: 'created_at',
      sort_order: 'desc' as 'desc' | 'asc'
    }
  }

  // 任务筛选和搜索状态
  const [taskFilters, setTaskFilters] = useState(loadTaskFiltersFromStorage)



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
    pagination,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    setQueryParams,
    clearError: clearTasksError,
  } = useTaskStore()

  useEffect(() => {
    if (id) {
      fetchProject(parseInt(id))
      // 设置任务查询参数
      const queryParams = {
        project_id: parseInt(id),
        status: taskFilters.status,
        priority: taskFilters.priority,
        search: taskFilters.search,
        sort_by: taskFilters.sort_by,
        sort_order: taskFilters.sort_order,
        per_page: 20
      }
      setQueryParams(queryParams)
      fetchTasks()
    }
  }, [id, taskFilters, fetchProject, fetchTasks, setQueryParams])

  // 设置网页标题
  useEffect(() => {
    if (currentProject) {
      document.title = `${currentProject.name} - Todo for AI`
    }

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [currentProject])


  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    // 更新URL参数以保持标签页状态
    const newSearchParams = new URLSearchParams(searchParams)
    if (key === 'tasks') {
      // tasks是默认标签页，不需要在URL中显示
      newSearchParams.delete('tab')
    } else {
      newSearchParams.set('tab', key)
    }
    setSearchParams(newSearchParams, { replace: true })
  }

  // 处理筛选条件变化
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = {
      ...taskFilters,
      [key]: value
    }
    setTaskFilters(newFilters)

    // 保存到localStorage
    try {
      localStorage.setItem('project-task-filters', JSON.stringify(newFilters))
    } catch (error) {
      console.warn('Failed to save task filters to localStorage:', error)
    }
  }

  // 处理表格变化（排序、分页）
  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    const newFilters = { ...taskFilters }

    if (sorter.field) {
      newFilters.sort_by = sorter.field
      newFilters.sort_order = sorter.order === 'ascend' ? 'asc' : 'desc'
    }

    setTaskFilters(newFilters)

    // 保存到localStorage
    try {
      localStorage.setItem('project-task-filters', JSON.stringify(newFilters))
    } catch (error) {
      console.warn('Failed to save task filters to localStorage:', error)
    }
  }

  // 处理状态变化
  const handleStatusChange = async (task: Task, status: Task['status']) => {
    const success = await updateTaskStatus(task.id, status)
    if (success) {
      message.success('任务状态更新成功')
    }
  }

  // 处理删除任务
  const handleDelete = async (task: Task) => {
    const success = await deleteTask(task.id)
    if (success) {
      message.success('任务删除成功')
    }
  }

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
          <Button type="primary" onClick={() => navigate('/todo-for-ai/pages/projects')}>
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
      width: 200,
      sorter: true,
      render: (text: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Tag color="blue" style={{ fontSize: '10px', padding: '2px 6px', margin: 0, flexShrink: 0 }}>
            #{record.id}
          </Tag>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Button
              type="link"
              style={{ padding: 0, fontWeight: 500, height: 'auto' }}
              onClick={() => navigate(`/todo-for-ai/pages/tasks/${record.id}`)}
            >
              {text}
            </Button>
            {record.description && (
              <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                {record.description.length > 50
                  ? record.description.substring(0, 50) + '...'
                  : record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      sorter: true,
      render: (status: string, record: Task) => (
        <Select
          value={status}
          size="small"
          style={{ width: 100 }}
          onChange={(newStatus) => handleStatusChange(record, newStatus as Task['status'])}
        >
          <Option value="todo">待办</Option>
          <Option value="in_progress">进行中</Option>
          <Option value="review">待审核</Option>
          <Option value="done">已完成</Option>
          <Option value="cancelled">已取消</Option>
        </Select>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      sorter: true,
      render: (date: string) => {
        const dateObj = new Date(date)
        return (
          <div style={{ fontSize: '12px' }}>
            <div>{dateObj.toLocaleDateString('zh-CN')}</div>
            <div style={{ color: '#999' }}>{dateObj.toLocaleTimeString('zh-CN', { hour12: false })}</div>
          </div>
        )
      },
    },
    {
      title: '任务内容',
      dataIndex: 'content',
      key: 'content',
      width: 400,
      render: (content: string) => (
        <TaskContentSummary
          content={content}
          maxLength={120}
          showPreview={true}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Task) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/todo-for-ai/pages/tasks/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/todo-for-ai/pages/tasks/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个任务吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
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
            onClick={() => navigate('/todo-for-ai/pages/projects')}
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
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/todo-for-ai/pages/projects/${id}/edit`)}
            >
              编辑项目
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/todo-for-ai/pages/tasks/create?project_id=${id}`)}
            >
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

      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="项目概览" key="overview">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="基本信息">
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
            </Col>

            {/* 链接信息 */}
            <Col span={24}>
              <Card title="项目链接">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>GitHub仓库：</strong>
                      {currentProject.github_url ? (
                        <div style={{ marginTop: '4px' }}>
                          <Button
                            type="link"
                            icon={<GithubOutlined />}
                            href={currentProject.github_url}
                            target="_blank"
                            style={{ padding: 0 }}
                          >
                            查看仓库
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}> 未设置</span>
                      )}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>本地开发：</strong>
                      {currentProject.local_url ? (
                        <div style={{ marginTop: '4px' }}>
                          <Button
                            type="link"
                            icon={<LinkOutlined />}
                            href={currentProject.local_url}
                            target="_blank"
                            style={{ padding: 0 }}
                          >
                            访问本地
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}> 未设置</span>
                      )}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>生产环境：</strong>
                      {currentProject.production_url ? (
                        <div style={{ marginTop: '4px' }}>
                          <Button
                            type="link"
                            icon={<GlobalOutlined />}
                            href={currentProject.production_url}
                            target="_blank"
                            style={{ padding: 0 }}
                          >
                            访问线上
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}> 未设置</span>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* 项目上下文 */}
            {currentProject.project_context && (
              <Col span={24}>
                <Card title="项目上下文">
                  <MarkdownEditor
                    value={currentProject.project_context}
                    readOnly={true}
                    hideToolbar={true}
                    height="auto"
                  />
                </Card>
              </Col>
            )}
          </Row>
        </TabPane>

        <TabPane tab="任务列表" key="tasks">
          <Card>
            {/* 筛选控件 */}
            <Card style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Row gutter={16} align="middle">
                <Col span={4}>
                  <Space>
                    <FilterOutlined />
                    <span>筛选条件:</span>
                  </Space>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="任务状态"
                    value={taskFilters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Option value="">全部状态</Option>
                    <Option value="todo,in_progress,review">仅待办任务（默认）</Option>
                    <Option value="todo">待办</Option>
                    <Option value="in_progress">进行中</Option>
                    <Option value="review">待审核</Option>
                    <Option value="done">已完成</Option>
                    <Option value="cancelled">已取消</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="优先级"
                    value={taskFilters.priority}
                    onChange={(value) => handleFilterChange('priority', value)}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Option value="">全部优先级</Option>
                    <Option value="low">低</Option>
                    <Option value="medium">中</Option>
                    <Option value="high">高</Option>
                    <Option value="urgent">紧急</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="排序方式"
                    value={taskFilters.sort_by}
                    onChange={(value) => handleFilterChange('sort_by', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="created_at">创建时间</Option>
                    <Option value="updated_at">更新时间</Option>
                    <Option value="due_date">截止时间</Option>
                    <Option value="priority">优先级</Option>
                    <Option value="status">状态</Option>
                    <Option value="title">标题</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="排序顺序"
                    value={taskFilters.sort_order}
                    onChange={(value) => handleFilterChange('sort_order', value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="desc">降序</Option>
                    <Option value="asc">升序</Option>
                  </Select>
                </Col>
                <Col span={3}>
                  <Search
                    placeholder="搜索任务标题或描述"
                    value={taskFilters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onSearch={(value) => handleFilterChange('search', value)}
                    allowClear
                  />
                </Col>
                <Col span={1}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      const defaultFilters = {
                        status: 'todo,in_progress,review',
                        priority: '',
                        search: '',
                        sort_by: 'created_at',
                        sort_order: 'desc' as 'desc' | 'asc'
                      }
                      setTaskFilters(defaultFilters)
                      localStorage.setItem('project-task-filters', JSON.stringify(defaultFilters))
                    }}
                    style={{ fontSize: '12px' }}
                  >
                    重置
                  </Button>
                </Col>
              </Row>
            </Card>

            <Table
              columns={taskColumns}
              dataSource={tasks}
              rowKey="id"
              loading={tasksLoading}
              pagination={{
                current: pagination?.page || 1,
                pageSize: pagination?.per_page || 20,
                total: pagination?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
            />
          </Card>
        </TabPane>

        <TabPane tab="任务看板" key="kanban">
          <Card>
            <KanbanBoard
              projectId={currentProject?.id}
              onTaskClick={(task) => {
                // 可以在这里添加任务点击处理逻辑
                console.log('Task clicked:', task)
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
