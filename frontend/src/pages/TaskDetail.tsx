import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Space,
  Card,
  Tag,
  Descriptions,
  Progress,
  Breadcrumb,
  Spin,
  message,
  Row,
  Col,
  Popconfirm,
  Select,
  Collapse
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  CopyOutlined,
  FileTextOutlined,
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useTaskStore, useProjectStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { Task } from '../api/tasks'
import { contextRulesApi, type BuildContextResponse } from '../api/contextRules'
import type { ApiResponse } from '../api/client'
import { useTranslation, usePageTranslation } from '../i18n/hooks/useTranslation'
import dayjs from 'dayjs'
import styles from './TaskDetail.module.css'

const { Title, Paragraph } = Typography

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [projectContext, setProjectContext] = useState<ApiResponse<BuildContextResponse> | null>(null)
  const [contextLoading, setContextLoading] = useState(false)

  const { getTask, deleteTask, fetchTasksByParams } = useTaskStore()
  const { projects, fetchProjects } = useProjectStore()
  const { t: tc } = useTranslation('common')
  const { t, tp } = usePageTranslation('taskDetail')

  useEffect(() => {
    if (id) {
      loadTask(parseInt(id, 10))
    }
  }, [id])

  // 加载项目列表
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // 设置网页标题
  useEffect(() => {
    if (task && projects.length > 0) {
      const project = projects.find(p => p.id === task.project_id)
      const projectName = project?.name || tp('taskInfo.unknownProject')
      document.title = `${projectName} - ${tp('title')} - Todo for AI`
    }

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [task, projects, tp])

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 只在没有焦点在输入框时响应快捷键
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          handlePreviousTask()
          break
        case 'ArrowRight':
          event.preventDefault()
          handleNextTask()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [projectTasks, task])

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

  const loadTask = async (taskId: number) => {
    try {
      setLoading(true)
      const result = await getTask(taskId)
      if (result) {
        setTask(result)
        // 从localStorage获取用户在列表页设置的筛选条件
        const taskFilters = loadTaskFiltersFromStorage()

        // 加载同项目的任务，使用与列表页相同的筛选和排序条件
        const projectTasksResult = await fetchTasksByParams({
          project_id: result.project_id,
          status: taskFilters.status,
          priority: taskFilters.priority,
          search: taskFilters.search,
          sort_by: taskFilters.sort_by,
          sort_order: taskFilters.sort_order
        })
        setProjectTasks(projectTasksResult)

        // 加载项目上下文规则
        if (result.project_id) {
          loadProjectContext(result.project_id)
        }
      } else {
        message.error(tp('messages.taskNotFound'))
        navigate('/todo-for-ai/pages/tasks')
      }
    } catch (error) {
      console.error('加载任务失败:', error)
      message.error(tp('messages.loadTaskFailed'))
      navigate('/todo-for-ai/pages/tasks')
    } finally {
      setLoading(false)
    }
  }

  const loadProjectContext = async (projectId: number) => {
    try {
      setContextLoading(true)
      const result = await contextRulesApi.buildProjectContext(projectId, true, false)
      setProjectContext(result)
    } catch (error) {
      console.error('加载项目上下文失败:', error)
      // 不显示错误消息，因为这不是关键功能
    } finally {
      setContextLoading(false)
    }
  }

  const handleEdit = () => {
    if (task) {
      navigate(`/todo-for-ai/pages/tasks/${task.id}/edit`)
    }
  }

  const handleDelete = async () => {
    if (!task) return

    try {
      await deleteTask(task.id)
      message.success(tp('messages.deleteSuccess'))
      navigate(`/todo-for-ai/pages/projects/${task.project_id}?tab=tasks`)
    } catch (error) {
      console.error('删除任务失败:', error)
      message.error(tp('messages.deleteFailed'))
    }
  }

  // 获取当前任务在项目任务列表中的索引
  const getCurrentTaskIndex = () => {
    if (!task || !projectTasks.length) return -1
    return projectTasks.findIndex(t => t.id === task.id)
  }

  // 上一个任务
  const handlePreviousTask = () => {
    const currentIndex = getCurrentTaskIndex()
    if (currentIndex > 0) {
      const previousTask = projectTasks[currentIndex - 1]
      navigate(`/todo-for-ai/pages/tasks/${previousTask.id}`)
    }
  }

  // 下一个任务
  const handleNextTask = () => {
    const currentIndex = getCurrentTaskIndex()
    if (currentIndex >= 0 && currentIndex < projectTasks.length - 1) {
      const nextTask = projectTasks[currentIndex + 1]
      navigate(`/todo-for-ai/pages/tasks/${nextTask.id}`)
    }
  }

  // 创建新任务
  const handleCreateTask = () => {
    if (task) {
      navigate(`/todo-for-ai/pages/tasks/create?project_id=${task.project_id}`)
    }
  }

  // 修改任务状态
  const handleStatusChange = async (newStatus: string) => {
    if (!task) return

    try {
      // 计算新状态对应的进度
      const newProgress = getTaskProgress(newStatus, task.completion_rate)

      // 准备更新数据
      const updateData: any = {
        status: newStatus as 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
      }

      // 如果进度需要更新，也一起更新
      if (newProgress !== task.completion_rate) {
        updateData.completion_rate = newProgress
      }

      // 调用更新任务的API
      const { updateTask } = useTaskStore.getState()
      const updatedTask = await updateTask(task.id, updateData)

      if (updatedTask) {
        // 更新本地状态
        setTask(updatedTask)
        const statusText = getStatusText(newStatus)
        const progressText = newProgress !== task.completion_rate ? tp('messages.progressUpdateSuccess') + `${newProgress}%` : ''
        message.success(`${tp('messages.statusUpdateSuccess')}"${statusText}"${progressText}`)
      }
    } catch (error) {
      console.error('更新任务状态失败:', error)
      message.error(tp('messages.statusUpdateFailed'))
    }
  }

  // 复制MCP执行任务的提示词
  const handleCopyMCPPrompt = () => {
    if (!task) return

    const prompt = `请使用todo-for-ai MCP工具获取任务ID为${task.id}的详细信息，然后执行这个任务，完成后提交任务反馈报告。`

    navigator.clipboard.writeText(prompt).then(() => {
      message.success(tp('messages.mcpPromptCopied'))
    }).catch(() => {
      message.error(tp('messages.copyFailedManual'))
    })
  }

  // 复制AI助手执行任务的详细提示词
  const handleCopyAIPrompt = () => {
    if (!task) return

    const project = projects.find(p => p.id === task.project_id)
    const prompt = `请帮我执行以下任务，这是一个完整的任务信息：

**项目信息**：
- 项目名称：${project?.name || '未知项目'}
- 任务ID：${task.id}
- 任务标题：${task.title}
- 任务描述：${task.description || '无'}
- 优先级：${task.priority}
- 截止时间：${task.due_date ? dayjs(task.due_date).format('YYYY-MM-DD') : '无'}

**任务详细内容**：
${task.content || '无详细内容'}

**执行要求**：
请仔细阅读任务内容，按照要求完成任务，并在完成后提供详细的执行报告和结果说明。`

    navigator.clipboard.writeText(prompt).then(() => {
      message.success(tp('messages.aiPromptCopied'))
    }).catch(() => {
      message.error(tp('messages.copyFailed'))
    })
  }

  // 复制任务完成确认提示词
  const handleCopyTaskCompletionPrompt = () => {
    if (!task) return

    const prompt = `请检查并确认任务ID为${task.id}的任务执行状态：

**任务信息**：
- 任务ID：${task.id}
- 任务标题：${task.title}
- 当前状态：${task.status}
- 完成进度：${task.completion_rate || 0}%

**检查要求**：
1. 仔细检查任务是否已经完全完成
2. 如果任务已完成：
   - 使用MCP工具将任务状态更新为"已完成"(done)
   - 设置完成进度为100%
   - 提交详细的任务完成报告
3. 如果任务未完成：
   - 继续执行任务内容直到完成
   - 确保所有要求都已满足
   - 完成后再次运行此检查

**任务详细内容**：
${task.content || '无详细内容'}

请开始检查并执行相应操作。`

    navigator.clipboard.writeText(prompt).then(() => {
      message.success(tp('messages.completionPromptCopied'))
    }).catch(() => {
      message.error(tp('messages.copyFailed'))
    })
  }

  // 复制快速完成任务提示词
  const handleCopyQuickCompletePrompt = () => {
    if (!task) return

    const prompt = `请立即执行并完成任务ID为${task.id}的任务，完成后直接关闭：

**任务信息**：
- 任务ID：${task.id}
- 任务标题：${task.title}
- 优先级：${task.priority}

**任务内容**：
${task.content || '无详细内容'}

**执行要求**：
1. 立即开始执行上述任务内容
2. 完成所有要求的工作
3. 使用MCP工具将任务状态更新为"已完成"(done)
4. 设置完成进度为100%
5. 提交简要的完成报告

请开始执行并在完成后立即关闭任务。`

    navigator.clipboard.writeText(prompt).then(() => {
      message.success(tp('messages.quickCompletePromptCopied'))
    }).catch(() => {
      message.error(tp('messages.copyFailed'))
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      todo: 'default',
      in_progress: 'processing',
      review: 'warning',
      done: 'success',
      cancelled: 'error'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const getStatusText = (status: string) => {
    const statusKey = status === 'in_progress' ? 'inProgress' : status
    return tp(`status.${statusKey}`) || status
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'green',
      medium: 'blue',
      high: 'orange',
      urgent: 'red'
    }
    return colors[priority as keyof typeof colors] || 'blue'
  }

  const getPriorityText = (priority: string) => {
    return tp(`priority.${priority}`) || priority
  }

  const getStatusTag = (status: string) => {
    const statusConfig = {
      todo: { color: 'default' },
      in_progress: { color: 'processing' },
      review: { color: 'warning' },
      done: { color: 'success' },
      cancelled: { color: 'error' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default' }
    return <Tag color={config.color}>{getStatusText(status)}</Tag>
  }

  // 根据任务状态计算进度条百分比
  const getTaskProgress = (status: string, completion_rate?: number) => {
    switch (status) {
      case 'todo':
        return 0 // 待办：0%
      case 'in_progress':
        return completion_rate || 25 // 进行中：使用completion_rate或默认25%
      case 'review':
        return completion_rate || 80 // 待审核：使用completion_rate或默认80%
      case 'done':
        return 100 // 已完成：100%
      case 'cancelled':
        return completion_rate || 0 // 已取消：使用completion_rate或0%
      default:
        return completion_rate || 0
    }
  }

  const getPriorityTag = (priority: string) => {
    const priorityConfig = {
      low: { color: 'green' },
      medium: { color: 'blue' },
      high: { color: 'orange' },
      urgent: { color: 'red' }
    }
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { color: 'blue' }
    const text = priority === 'urgent' ? tp('priority.urgent') : tp(`priority.${priority}Priority`)
    return <Tag color={config.color}>{text}</Tag>
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!task) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={3}>{tp('messages.taskNotFound')}</Title>
        <Button type="primary" onClick={() => navigate('/todo-for-ai/pages/tasks')}>
          {tp('messages.returnToTaskList')}
        </Button>
      </div>
    )
  }

  const project = projects.find(p => p.id === task.project_id)

  return (
    <div className={styles.taskDetailContainer}>
      {/* 顶部导航栏 */}
      <Card className={styles.topNavCard} style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            {/* 左上角：上一个任务 + 返回项目任务列表按钮 - 符合用户操作习惯 */}
            <Space>
              <Button
                type="primary"
                icon={<LeftOutlined />}
                onClick={handlePreviousTask}
                disabled={getCurrentTaskIndex() <= 0}
                title={tp('tooltips.previousTask')}
                style={{
                  backgroundColor: '#1890ff',
                  borderColor: '#1890ff'
                }}
              >
                {tp('navigation.previousTask')}
              </Button>
              <Button
                type="primary"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/todo-for-ai/pages/projects/${task.project_id}?tab=tasks`)}
                title={tp('tooltips.returnToProjectTaskList')}
                style={{
                  backgroundColor: '#1890ff',
                  borderColor: '#1890ff'
                }}
              >
                {tp('navigation.returnToProjectTaskList')}
              </Button>
            </Space>
          </Col>
          <Col>
            {/* 中间：面包屑导航 */}
            <Breadcrumb>
              <Breadcrumb.Item>
                <HomeOutlined />
                <span onClick={() => navigate('/todo-for-ai/pages')} style={{ cursor: 'pointer', marginLeft: '8px' }}>
                  {tp('navigation.home')}
                </span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <span
                  onClick={() => navigate(`/todo-for-ai/pages/projects/${task.project_id}?tab=tasks`)}
                  style={{ cursor: 'pointer' }}
                >
                  {tp('navigation.projectTaskList')}
                </span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>{task.title}</Breadcrumb.Item>
            </Breadcrumb>
          </Col>
          <Col>
            {/* 右上角：下一个任务按钮 */}
            <Button
              type="primary"
              icon={<RightOutlined />}
              onClick={handleNextTask}
              disabled={getCurrentTaskIndex() >= projectTasks.length - 1 || getCurrentTaskIndex() === -1}
              title={tp('tooltips.nextTask')}
              style={{
                backgroundColor: '#1890ff',
                borderColor: '#1890ff'
              }}
            >
              {tp('navigation.nextTask')}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 页面标题和状态 */}
      <Card className={styles.titleCard}>
        <Row gutter={[24, 16]}>
          <Col span={24}>
            {/* 任务标题行 - 单独一行，符合UI设计对齐原则 */}
            <div className={styles.taskTitleRow}>
              {/* 任务ID徽标 */}
              <div className={styles.taskIdBadge}>
                #{task.id}
              </div>
              {/* 任务标题 - 支持省略号和tooltip */}
              <div className={styles.taskTitleContainer}>
                <Title
                  level={2}
                  className={styles.taskTitle}
                  title={task.title} // 鼠标悬停时显示完整标题
                  ellipsis={{
                    tooltip: task.title.length > 50 ? task.title : false
                  }}
                >
                  {task.title}
                </Title>
              </div>
            </div>

            {/* 状态和其他信息行 */}
            <div className={styles.taskMetaRow}>
              <Space size="middle" wrap>
                {getStatusTag(task.status)}
                {getPriorityTag(task.priority)}
                {task.due_date && (
                  <Tag icon={<FileTextOutlined />} color="default">
                    {tp('dueDateFormat', { date: dayjs(task.due_date).format('MM-DD') })}
                  </Tag>
                )}
              </Space>
            </div>

            {task.description && (
              <Paragraph type="secondary" className={styles.titleDescription}>
                {task.description}
              </Paragraph>
            )}
          </Col>
        </Row>

        {/* 底部进度条 - 紧贴Card底部 */}
        <div className={styles.bottomProgressBar}>
          <Progress
            percent={getTaskProgress(task.status, task.completion_rate)}
            status={task.status === 'done' ? 'success' : task.status === 'cancelled' ? 'exception' : 'active'}
            strokeWidth={4}
            showInfo={false}
            className={styles.titleCardProgress}
          />
        </div>
      </Card>


        
      {/* 操作按钮组 - 符合UI设计亲密性原则，相关操作放在一起 */}
      <Card className={styles.actionCard}>
        <Row gutter={[16, 16]} className={styles.actionGrid}>
          {/* 任务状态快捷修改 */}
          <Col xs={24} sm={8} md={6} className={styles.actionCol}>
            <div className={styles.actionSection}>{tp('actions.taskStatus')}</div>
            <Select
              value={task.status}
              onChange={handleStatusChange}
              style={{ width: '100%' }}
              placeholder={tp('status.selectStatus')}
            >
              <Select.Option value="todo">{tp('status.todo')}</Select.Option>
              <Select.Option value="in_progress">{tp('status.inProgress')}</Select.Option>
              <Select.Option value="review">{tp('status.review')}</Select.Option>
              <Select.Option value="done">{tp('status.done')}</Select.Option>
            </Select>
          </Col>

          {/* 任务操作 - 合并所有操作按钮 */}
          <Col xs={24} sm={16} md={18} className={styles.actionCol}>
            <div className={styles.actionSection}>{tp('actions.taskActions')}</div>
            <div className={styles.taskActionButtons}>
              {/* 创建任务按钮 - 绿色系，表示积极的创建操作 */}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateTask}
                style={{
                  backgroundColor: '#52c41a',
                  borderColor: '#52c41a'
                }}
                title={tp('tooltips.createTask')}
              >
                {tp('actions.createTask')}
              </Button>
              {/* 编辑任务按钮 - 橙色系，表示中性的修改操作 */}
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
                style={{
                  backgroundColor: '#fa8c16',
                  borderColor: '#fa8c16'
                }}
                title={tp('tooltips.editTask')}
              >
                {tp('actions.edit')}
              </Button>
              {/* 删除任务按钮 - 红色系，表示危险的删除操作 */}
              <Popconfirm
                title={tp('confirmations.deleteTitle')}
                description={tp('confirmations.deleteDescription')}
                onConfirm={handleDelete}
                okText={tp('confirmations.confirmText')}
                cancelText={tp('confirmations.cancelText')}
              >
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  style={{
                    backgroundColor: '#ff4d4f',
                    borderColor: '#ff4d4f'
                  }}
                  title={tp('tooltips.deleteTask')}
                >
                  {tp('actions.delete')}
                </Button>
              </Popconfirm>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 复制提示词面板 - 符合UI设计重复原则，统一按钮样式 */}
      <Card className={styles.actionCard}>
        <Title level={4} style={{ marginBottom: '16px', color: '#1890ff' }}>
          <CopyOutlined style={{ marginRight: '8px' }} />
          {tp('copyPrompts.title')}
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionSection}>{tp('copyPrompts.mcpExecution')}</div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyMCPPrompt}
              block
              title={tp('tooltips.mcpPrompt')}
              style={{
                backgroundColor: '#1890ff',
                borderColor: '#1890ff'
              }}
            >
              {tp('copyPrompts.mcpPromptButton')}
            </Button>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {tp('copyPrompts.mcpPromptDesc')}
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionSection}>{tp('copyPrompts.aiExecution')}</div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyAIPrompt}
              block
              title={tp('tooltips.aiPrompt')}
              style={{
                backgroundColor: '#1890ff',
                borderColor: '#1890ff'
              }}
            >
              {tp('copyPrompts.aiPromptButton')}
            </Button>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {tp('copyPrompts.aiPromptDesc')}
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionSection}>{tp('copyPrompts.taskCompletion')}</div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyTaskCompletionPrompt}
              block
              title={tp('tooltips.completionPrompt')}
              style={{
                backgroundColor: '#1890ff',
                borderColor: '#1890ff'
              }}
            >
              {tp('copyPrompts.completionPromptButton')}
            </Button>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {tp('copyPrompts.completionPromptDesc')}
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionSection}>{tp('copyPrompts.quickComplete')}</div>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyQuickCompletePrompt}
              block
              title={tp('tooltips.quickCompletePrompt')}
              style={{
                backgroundColor: '#1890ff',
                borderColor: '#1890ff'
              }}
            >
              {tp('copyPrompts.quickCompleteButton')}
            </Button>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {tp('copyPrompts.quickCompleteDesc')}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 任务信息 */}
      <Card className={styles.infoCard}>
        <Title level={3} className={styles.infoTitle}>{tp('taskInfo.title')}</Title>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          size="middle"
          bordered
          styles={{
            label: { fontWeight: 500, backgroundColor: '#fafafa' },
            content: { backgroundColor: '#fff' }
          }}
        >
              <Descriptions.Item label={tp('taskInfo.project')}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {project && (
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: project.color,
                        marginRight: '8px'
                      }}
                    />
                  )}
                  {project?.name || tp('taskInfo.unknownProject')}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label={tp('taskInfo.status')}>
                <Tag color={getStatusColor(task.status)}>
                  {getStatusText(task.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={tp('taskInfo.priority')}>
                <Tag color={getPriorityColor(task.priority)}>
                  {getPriorityText(task.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={tp('taskInfo.dueDate')}>
                {task.due_date ? dayjs(task.due_date).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={tp('taskInfo.progress')}>
                <Progress
                  percent={getTaskProgress(task.status, task.completion_rate)}
                  size="small"
                  status={task.status === 'done' ? 'success' : task.status === 'cancelled' ? 'exception' : 'active'}
                />
              </Descriptions.Item>
              <Descriptions.Item label={tp('taskInfo.createdAt')}>
                {dayjs(task.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label={tp('taskInfo.updatedAt')}>
                {dayjs(task.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label={tp('taskInfo.createdBy')}>
                {task.created_by || '-'}
              </Descriptions.Item>
            </Descriptions>

        {task.tags && task.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            <div className={styles.tagsLabel}>{tp('taskInfo.tags')}</div>
            <div>
              {task.tags.map((tag, index) => (
                <Tag key={index} color="blue" style={{ marginBottom: '4px', marginRight: '8px' }}>
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 任务内容 */}
      <Card className={styles.contentCard}>
        <Title level={3} className={styles.contentTitle}>{tp('taskContent.title')}</Title>
        {task.content ? (
          <div className={styles.markdownContainer}>
            <MarkdownEditor
              key={`task-content-${task.id}`}
              value={task.content}
              readOnly
              autoHeight={true}
              hideToolbar
              preview="preview"
            />
          </div>
        ) : (
          <div className={styles.emptyContent}>
            <FileTextOutlined className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>{tp('taskContent.empty.title')}</div>
            <div className={styles.emptySubtitle}>{tp('taskContent.empty.subtitle')}</div>
          </div>
        )}
      </Card>

      {/* 项目上下文规则预览 */}
      <Card className={styles.contentCard}>
        <Title level={3} className={styles.contentTitle}>
          <Space>
            <SettingOutlined />
            {tp('projectContext.title')}
          </Space>
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
          {tp('projectContext.description')}
        </Paragraph>

        {contextLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>{tp('projectContext.loading')}</div>
          </div>
        ) : projectContext && projectContext.data && projectContext.data.context_string ? (
          <Collapse
            items={[
              {
                key: 'context',
                label: (
                  <Space>
                    <span>{tp('projectContext.rulesLabel')}</span>
                    <Tag color="blue">{projectContext.data.rules.length} 条规则</Tag>
                  </Space>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <Tag color="green">{tp('projectContext.appliedRules')}</Tag>
                      {projectContext.data.rules.map(rule => (
                        <Tag
                          key={rule.id}
                          color={rule.is_global ? 'purple' : 'blue'}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/todo-for-ai/pages/context-rules/${rule.id}/edit`)}
                        >
                          {rule.is_global ? '🌐' : '📁'} {rule.name}
                        </Tag>
                      ))}
                    </div>
                    <div className={styles.markdownContainer}>
                      <MarkdownEditor
                        key={`project-context-${task.id}`}
                        value={projectContext.data.context_string}
                        readOnly
                        autoHeight={true}
                        hideToolbar
                        preview="preview"
                      />
                    </div>
                  </div>
                )
              }
            ]}
            defaultActiveKey={[]}
            ghost
          />
        ) : (
          <div className={styles.emptyContent}>
            <SettingOutlined className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>{tp('projectContext.empty.title')}</div>
            <div className={styles.emptySubtitle}>{tp('projectContext.empty.subtitle')}</div>
          </div>
        )}
      </Card>

      {/* 任务执行反馈 */}
      {task.feedback_content && (
        <Card className={styles.contentCard}>
          <Title level={3} className={styles.contentTitle}>
            <Space>
              <CheckCircleOutlined />
              {tp('taskFeedback.title')}
            </Space>
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
            {tp('taskFeedback.description')}
            {task.feedback_at && (
              <span style={{ marginLeft: '8px' }}>
                {tp('taskFeedback.feedbackTime')}{dayjs(task.feedback_at).format('YYYY-MM-DD HH:mm:ss')}
              </span>
            )}
          </Paragraph>

          <div className={styles.markdownContainer}>
            <MarkdownEditor
              key={`task-feedback-${task.id}`}
              value={task.feedback_content}
              readOnly
              autoHeight={true}
              hideToolbar
              preview="preview"
            />
          </div>
        </Card>
      )}
    </div>
  )
}

export default TaskDetail
