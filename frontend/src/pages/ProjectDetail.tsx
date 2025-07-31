import { useEffect, useState, useCallback } from 'react'
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
  Input
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  CopyOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  GithubOutlined,
  LinkOutlined,
  GlobalOutlined,
  PushpinOutlined,
  PushpinFilled
} from '@ant-design/icons'
import { useProjectStore, useTaskStore, useContextRuleStore } from '../stores'
import { KanbanBoard } from '../components/Kanban'
import { TaskContentSummary } from '../components/TaskContentPreview'
import { pinsApi } from '../api/pins'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { LinkButton } from '../components/SmartLink'
import type { Task } from '../api/tasks'
import type { ContextRule } from '../api/contextRules'
import { useTranslation, usePageTranslation } from '../i18n/hooks/useTranslation'

const { Title, Paragraph } = Typography
const { TabPane } = Tabs
const { Option } = Select
const { Search } = Input

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'tasks')
  const { t } = useTranslation('pinManager')
  const { tp } = usePageTranslation('projectDetail')

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
      sort_by: 'updated_at',
      sort_order: 'desc' as 'desc' | 'asc'
    }
  }

  // 从localStorage加载分页设置
  const loadPaginationFromStorage = () => {
    try {
      const saved = localStorage.getItem('project-task-pagination')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          pageSize: parsed.pageSize || 20, // 默认20条每页
          current: 1 // 总是从第一页开始
        }
      }
    } catch (error) {
      console.warn('Failed to load pagination from localStorage:', error)
    }
    return {
      pageSize: 20, // 默认20条每页
      current: 1
    }
  }

  // 保存分页设置到localStorage
  const savePaginationToStorage = (pageSize: number) => {
    try {
      const paginationSettings = { pageSize }
      localStorage.setItem('project-task-pagination', JSON.stringify(paginationSettings))
      console.log('📄 分页设置已保存:', paginationSettings)
    } catch (error) {
      console.warn('Failed to save pagination to localStorage:', error)
    }
  }

  // 任务筛选和搜索状态
  const [taskFilters, setTaskFilters] = useState(loadTaskFiltersFromStorage)
  const [paginationSettings, setPaginationSettings] = useState(loadPaginationFromStorage())

  // 多选任务状态
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([])

  // Pin状态
  const [isPinned, setIsPinned] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

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
    queryParams,
    fetchTasks,
    deleteTask,
    updateTaskStatus,
    setQueryParams,
    clearError: clearTasksError,
  } = useTaskStore()

  // 检查项目Pin状态
  const checkPinStatus = useCallback(async () => {
    if (!id) return
    try {
      const response = await pinsApi.checkPinStatus(parseInt(id))
      console.log('Pin status check response:', response)

      // 更宽松的响应检查，支持多种响应格式
      let isPinnedValue = false

      if (response) {
        // 直接响应格式：{is_pinned: true, project_id: 24}
        if (typeof response.is_pinned === 'boolean') {
          isPinnedValue = response.is_pinned
        }
        // 包装响应格式：{data: {is_pinned: true, project_id: 24}, ...}
        else if (response.data && typeof response.data.is_pinned === 'boolean') {
          isPinnedValue = response.data.is_pinned
        }
        // 其他可能的格式
        else if (typeof response === 'boolean') {
          isPinnedValue = response
        }
      }

      console.log('Setting isPinned to:', isPinnedValue)
      setIsPinned(isPinnedValue)
    } catch (error) {
      console.error('Failed to check pin status:', error)
      // 出错时不改变当前状态，避免错误的状态重置
      console.log('Keeping current pin status due to error')
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchProject(parseInt(id))
      // 设置任务查询参数，使用保存的分页大小
      const queryParams = {
        project_id: parseInt(id),
        status: taskFilters.status,
        priority: taskFilters.priority,
        search: taskFilters.search,
        sort_by: taskFilters.sort_by,
        sort_order: taskFilters.sort_order,
        per_page: paginationSettings.pageSize, // 使用保存的分页大小
        page: 1 // 重新加载时从第一页开始
      }
      setQueryParams(queryParams)
      fetchTasks()
    }
  }, [id, taskFilters, paginationSettings.pageSize, fetchProject, fetchTasks, setQueryParams])

  // 检查Pin状态
  useEffect(() => {
    checkPinStatus()
  }, [checkPinStatus])

  // 切换Pin状态
  const handleTogglePin = useCallback(async () => {
    if (!id) return

    setPinLoading(true)
    try {
      if (isPinned) {
        await pinsApi.unpinProject(parseInt(id))
        setIsPinned(false)
        message.success(t('messages.unpinSuccess'))
      } else {
        // 检查Pin数量限制
        const pinsResponse = await pinsApi.getUserPins()
        if (pinsResponse && pinsResponse.pins && pinsResponse.pins.length >= 10) {
          message.warning(t('messages.pinLimitReached'))
          return
        }

        await pinsApi.pinProject(parseInt(id))
        setIsPinned(true)
        message.success(t('messages.pinSuccess'))
      }
      // 通知导航栏更新（通过自定义事件）
      window.dispatchEvent(new CustomEvent('pinUpdated'))
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || t('messages.pinFailed')
      message.error(errorMessage)
    } finally {
      setPinLoading(false)
    }
  }, [id, isPinned])

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + P 快速Pin/取消Pin
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault()
        if (!pinLoading) {
          handleTogglePin()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pinLoading, handleTogglePin])

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

  // 处理刷新任务列表
  const handleRefreshTasks = async () => {
    if (!id) return

    try {
      // 使用当前的筛选和排序条件重新获取任务数据
      const queryParams = {
        project_id: parseInt(id),
        status: taskFilters.status,
        priority: taskFilters.priority,
        search: taskFilters.search,
        sort_by: taskFilters.sort_by,
        sort_order: taskFilters.sort_order,
        per_page: paginationSettings.pageSize, // 使用保存的分页大小
        page: 1 // 刷新时从第一页开始
      }
      setQueryParams(queryParams)

      // 同时刷新任务列表和项目统计信息
      await Promise.all([
        fetchTasks(),
        fetchProject(parseInt(id))
      ])

      message.success('任务列表和统计信息已刷新')
    } catch (error) {
      console.error('刷新失败:', error)
      message.error('刷新失败')
    }
  }

  // 处理表格变化（排序、分页）
  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    console.log('📊 表格变化:', { pagination, sorter })

    const newFilters = { ...taskFilters }
    let needsRefresh = false

    // 处理排序变化
    if (sorter.field) {
      newFilters.sort_by = sorter.field
      newFilters.sort_order = sorter.order === 'ascend' ? 'asc' : 'desc'
      needsRefresh = true
    }

    // 处理分页大小变化
    if (pagination.pageSize !== paginationSettings.pageSize) {
      console.log('📄 分页大小变化:', pagination.pageSize)
      const newPaginationSettings = {
        pageSize: pagination.pageSize,
        current: 1 // 改变分页大小时从第一页开始
      }
      setPaginationSettings(newPaginationSettings)
      savePaginationToStorage(pagination.pageSize)
      needsRefresh = true
    }

    // 处理页码变化
    if (pagination.current !== (queryParams.page || 1)) {
      console.log('📄 页码变化:', pagination.current)
      needsRefresh = true
    }

    // 更新筛选条件
    if (needsRefresh) {
      setTaskFilters(newFilters)

      // 保存筛选条件到localStorage
      try {
        localStorage.setItem('project-task-filters', JSON.stringify(newFilters))
      } catch (error) {
        console.warn('Failed to save task filters to localStorage:', error)
      }

      // 更新查询参数并重新获取数据
      if (id) {
        const newQueryParams = {
          project_id: parseInt(id),
          status: newFilters.status,
          priority: newFilters.priority,
          search: newFilters.search,
          sort_by: newFilters.sort_by,
          sort_order: newFilters.sort_order,
          per_page: pagination.pageSize || paginationSettings.pageSize,
          page: pagination.current || 1
        }
        setQueryParams(newQueryParams)
        fetchTasks()
      }
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
      // 如果删除的任务在选中列表中，也要移除
      setSelectedTaskIds(prev => prev.filter(id => id !== task.id))
    }
  }

  // 处理任务多选
  const handleTaskSelection = {
    selectedRowKeys: selectedTaskIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedTaskIds(selectedRowKeys as number[])
    },
    onSelectAll: (selected: boolean, _selectedRows: Task[], changeRows: Task[]) => {
      if (selected) {
        // 全选：添加当前页面所有任务
        const newSelectedIds = [...selectedTaskIds, ...changeRows.map(task => task.id)]
        setSelectedTaskIds([...new Set(newSelectedIds)]) // 去重
      } else {
        // 取消全选：移除当前页面所有任务
        const changeRowIds = changeRows.map(task => task.id)
        setSelectedTaskIds(prev => prev.filter(id => !changeRowIds.includes(id)))
      }
    },
    onSelect: (record: Task, selected: boolean) => {
      if (selected) {
        setSelectedTaskIds(prev => [...prev, record.id])
      } else {
        setSelectedTaskIds(prev => prev.filter(id => id !== record.id))
      }
    },
  }

  // 清除选中
  const handleClearSelection = () => {
    setSelectedTaskIds([])
  }

  const handleCopyProjectPrompt = () => {
    if (!currentProject) return

    // 根据是否有选中任务来决定要执行的任务
    let targetTasks: Task[]
    let promptTitle: string

    if (selectedTaskIds.length > 0) {
      // 如果有选中任务，只处理选中的任务
      targetTasks = tasks.filter(task => selectedTaskIds.includes(task.id))
      promptTitle = `请帮我执行项目"${currentProject.name}"中的指定任务：`
    } else {
      // 如果没有选中任务，处理所有待执行任务
      targetTasks = tasks.filter(task =>
        ['todo', 'in_progress', 'review'].includes(task.status)
      )
      promptTitle = `请帮我执行项目"${currentProject.name}"中的所有待办任务：`
    }

    const prompt = `${promptTitle}

**项目信息**:
- 项目名称: ${currentProject.name}
- 项目描述: ${currentProject.description || '无'}
- GitHub仓库: ${currentProject.github_url || '无'}
- 项目上下文: ${currentProject.project_context || '无'}

**${selectedTaskIds.length > 0 ? '指定' : '待执行'}任务数量**: ${targetTasks.length}个

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
${targetTasks.length > 0 ? targetTasks.map((task, index) =>
  `${index + 1}. [${task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : task.priority === 'high' ? '高' : '紧急'}] ${task.title} (ID: ${task.id})`
).join('\n') : '暂无待执行任务'}

请开始执行这个项目的任务，并在每个任务完成后提交反馈。`

    navigator.clipboard.writeText(prompt).then(() => {
      const message_text = selectedTaskIds.length > 0
        ? `已复制${targetTasks.length}个指定任务的执行提示词到剪贴板`
        : '项目执行提示词已复制到剪贴板'
      message.success(message_text)
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

  // 根据任务状态获取标题颜色
  const getTaskTitleColor = (status: string) => {
    const statusColors = {
      todo: '#000000',        // 黑色 - 待办
      in_progress: '#1890ff', // 蓝色 - 进行中
      review: '#fa8c16',      // 橙色 - 待审核
      done: '#52c41a',        // 绿色 - 已完成
      cancelled: '#ff4d4f'    // 红色 - 已取消
    }
    return statusColors[status as keyof typeof statusColors] || '#000000'
  }

  const taskColumns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Tag color="blue" style={{ fontSize: '10px', padding: '2px 6px', margin: 0, flexShrink: 0 }}>
            #{record.id}
          </Tag>
          <div style={{ flex: 1, minWidth: 0, color: getTaskTitleColor(record.status) }}>
            <LinkButton
              to={`/todo-for-ai/pages/tasks/${record.id}`}
              type="link"
              style={{
                padding: 0,
                fontWeight: 500,
                height: 'auto',
                color: 'inherit'
              }}
            >
              {text}
            </LinkButton>
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
      title: '最后修改时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
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
          <LinkButton
            to={`/todo-for-ai/pages/tasks/${record.id}`}
            type="text"
            icon={<EyeOutlined />}
            size="small"
          >
            查看
          </LinkButton>
          <LinkButton
            to={`/todo-for-ai/pages/tasks/${record.id}/edit`}
            type="text"
            icon={<EditOutlined />}
            size="small"
          >
            编辑
          </LinkButton>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: currentProject.color,
                  flexShrink: 0
                }}
              />
              <Title level={3} className="page-title" style={{ margin: 0, fontSize: '18px' }}>
                {currentProject.name}
              </Title>
              <Tag color={currentProject.status === 'active' ? 'green' : 'orange'}>
                {tp(`status.${currentProject.status}`)}
              </Tag>
            </div>
            {currentProject.description && (
              <Paragraph className="page-description">
                {currentProject.description}
              </Paragraph>
            )}
          </div>
          <Space size="small">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopyProjectPrompt}
              title={selectedTaskIds.length > 0
                ? `复制选中的${selectedTaskIds.length}个任务的执行提示词`
                : "复制AI执行项目任务的提示词"
              }
            >
              复制AI Prompt
              {selectedTaskIds.length > 0 && (
                <span style={{
                  marginLeft: '4px',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '0 6px',
                  fontSize: '12px'
                }}>
                  {selectedTaskIds.length}
                </span>
              )}
            </Button>
            {selectedTaskIds.length > 0 && (
              <Button
                size="small"
                onClick={handleClearSelection}
                title="清除选中的任务"
              >
                清除选中
              </Button>
            )}
            <Button
              size="small"
              icon={isPinned ? <PushpinFilled /> : <PushpinOutlined />}
              onClick={handleTogglePin}
              loading={pinLoading}
              title={isPinned ? "取消Pin项目" : "Pin项目到导航栏"}
              type={isPinned ? "primary" : "default"}
              style={{
                backgroundColor: isPinned ? '#52c41a' : undefined,
                borderColor: isPinned ? '#52c41a' : undefined,
                color: isPinned ? '#fff' : undefined,
                fontWeight: isPinned ? 'bold' : 'normal'
              }}
            >
              {isPinned ? "已Pin" : "Pin"}
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/todo-for-ai/pages/projects/${id}/edit`)}
            >
              编辑项目
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/todo-for-ai/pages/tasks/create?project_id=${id}`)}
            >
              新建任务
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: '12px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ padding: '8px 12px' }} bodyStyle={{ padding: '8px' }}>
            <Statistic
              title="总任务数"
              value={stats.total_tasks}
              prefix={<CheckSquareOutlined style={{ fontSize: '14px' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '18px' }}
              style={{ textAlign: 'center' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ padding: '8px 12px' }} bodyStyle={{ padding: '8px' }}>
            <Statistic
              title="待办任务"
              value={stats.todo_tasks}
              prefix={<ClockCircleOutlined style={{ fontSize: '14px' }} />}
              valueStyle={{ color: '#faad14', fontSize: '18px' }}
              style={{ textAlign: 'center' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ padding: '8px 12px' }} bodyStyle={{ padding: '8px' }}>
            <Statistic
              title="进行中"
              value={stats.in_progress_tasks}
              prefix={<ClockCircleOutlined style={{ fontSize: '14px' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '18px' }}
              style={{ textAlign: 'center' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ padding: '8px 12px' }} bodyStyle={{ padding: '8px' }}>
            <Statistic
              title="已完成"
              value={stats.done_tasks}
              prefix={<CheckCircleOutlined style={{ fontSize: '14px' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '18px' }}
              style={{ textAlign: 'center' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab={tp('tabs.overview')} key="overview">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title={tp('overview.basicInfo.title')}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>{tp('overview.basicInfo.createdAt')}：</strong>
                      {new Date(currentProject.created_at).toLocaleString('zh-CN')}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>{tp('overview.basicInfo.updatedAt')}：</strong>
                      {new Date(currentProject.updated_at).toLocaleString('zh-CN')}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>{tp('overview.basicInfo.createdBy')}：</strong>
                      {currentProject.created_by || '-'}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>{tp('overview.basicInfo.projectColor')}：</strong>
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
                      <strong>{tp('overview.basicInfo.contextRulesCount')}：</strong>
                      {stats.context_rules_count} 条
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* 链接信息 */}
            <Col span={24}>
              <Card title={tp('overview.projectLinks.title')}>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>{tp('overview.projectLinks.githubRepo')}：</strong>
                      {currentProject.github_url ? (
                        <div style={{ marginTop: '4px' }}>
                          <Button
                            type="link"
                            icon={<GithubOutlined />}
                            href={currentProject.github_url}
                            target="_blank"
                            style={{ padding: 0 }}
                          >
                            {tp('overview.projectLinks.viewRepo')}
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}> {tp('overview.projectLinks.notSet')}</span>
                      )}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>{tp('overview.projectLinks.localEnv')}：</strong>
                      {currentProject.local_url ? (
                        <div style={{ marginTop: '4px' }}>
                          <Button
                            type="link"
                            icon={<LinkOutlined />}
                            href={currentProject.local_url}
                            target="_blank"
                            style={{ padding: 0 }}
                          >
                            {tp('overview.projectLinks.visitLocal')}
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}> {tp('overview.projectLinks.notSet')}</span>
                      )}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>{tp('overview.projectLinks.productionEnv')}：</strong>
                      {currentProject.production_url ? (
                        <div style={{ marginTop: '4px' }}>
                          <Button
                            type="link"
                            icon={<GlobalOutlined />}
                            href={currentProject.production_url}
                            target="_blank"
                            style={{ padding: 0 }}
                          >
                            {tp('overview.projectLinks.visitOnline')}
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}> {tp('overview.projectLinks.notSet')}</span>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* 项目上下文 */}
            {currentProject.project_context && (
              <Col span={24}>
                <Card title={tp('overview.projectContext.title')}>
                  <MarkdownEditor
                    value={currentProject.project_context}
                    readOnly={true}
                    hideToolbar={true}
                    height={400}
                  />
                </Card>
              </Col>
            )}
          </Row>
        </TabPane>

        <TabPane tab={tp('tabs.tasks')} key="tasks">
          <Card>
            {/* 筛选控件 */}
            <Card style={{ marginBottom: 6, backgroundColor: '#fafafa' }} bodyStyle={{ padding: '6px 12px' }}>
              <Row gutter={6} align="middle" style={{ minHeight: '28px' }}>
                <Col span={3}>
                  <Space size={4}>
                    <FilterOutlined style={{ fontSize: '12px' }} />
                    <span style={{ fontSize: '12px' }}>筛选:</span>
                  </Space>
                </Col>
                <Col span={4}>
                  <Select
                    size="small"
                    placeholder="任务状态"
                    value={taskFilters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                    style={{ width: '100%', height: '22px' }}
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
                <Col span={3}>
                  <Select
                    size="small"
                    placeholder="优先级"
                    value={taskFilters.priority}
                    onChange={(value) => handleFilterChange('priority', value)}
                    style={{ width: '100%', height: '22px' }}
                    allowClear
                  >
                    <Option value="">全部优先级</Option>
                    <Option value="low">低</Option>
                    <Option value="medium">中</Option>
                    <Option value="high">高</Option>
                    <Option value="urgent">紧急</Option>
                  </Select>
                </Col>
                <Col span={3}>
                  <Select
                    size="small"
                    placeholder="排序方式"
                    value={taskFilters.sort_by}
                    onChange={(value) => handleFilterChange('sort_by', value)}
                    style={{ width: '100%', height: '22px' }}
                  >
                    <Option value="updated_at">{tp('tasks.filters.sortBy.updatedAt')}</Option>
                    <Option value="created_at">{tp('tasks.filters.sortBy.createdAt')}</Option>
                    <Option value="due_date">{tp('tasks.filters.sortBy.dueDate')}</Option>
                    <Option value="priority">{tp('tasks.filters.sortBy.priority')}</Option>
                    <Option value="status">{tp('tasks.filters.sortBy.status')}</Option>
                    <Option value="title">{tp('tasks.filters.sortBy.title')}</Option>
                  </Select>
                </Col>
                <Col span={3}>
                  <Select
                    size="small"
                    placeholder="排序顺序"
                    value={taskFilters.sort_order}
                    onChange={(value) => handleFilterChange('sort_order', value)}
                    style={{ width: '100%', height: '22px' }}
                  >
                    <Option value="desc">降序</Option>
                    <Option value="asc">升序</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Search
                    size="small"
                    placeholder="搜索任务标题或描述"
                    value={taskFilters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onSearch={(value) => handleFilterChange('search', value)}
                    style={{ height: '22px' }}
                    allowClear
                  />
                </Col>
                <Col span={1}>
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined style={{ fontSize: '12px' }} />}
                    onClick={handleRefreshTasks}
                    loading={tasksLoading}
                    style={{ fontSize: '11px', height: '22px', padding: '0 4px' }}
                    title="刷新任务列表"
                  >
                    刷新
                  </Button>
                </Col>
              </Row>
            </Card>

            <Table
              columns={taskColumns}
              dataSource={tasks}
              rowKey="id"
              loading={tasksLoading}
              size="small"
              rowSelection={handleTaskSelection}
              pagination={{
                current: pagination?.page || 1,
                pageSize: pagination?.per_page || paginationSettings.pageSize,
                total: pagination?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50', '100', '200'],
                size: 'small',
                defaultPageSize: 20, // 设置默认分页大小为20
                onShowSizeChange: (current, size) => {
                  console.log('📄 分页大小直接变化:', { current, size })
                  // 这个回调会在用户直接选择分页大小时触发
                  // handleTableChange 也会被调用，所以这里不需要额外处理
                }
              }}
              onChange={handleTableChange}
            />
          </Card>
        </TabPane>

        <TabPane tab={tp('tabs.kanban')} key="kanban">
          <Card>
            <KanbanBoard
              projectId={currentProject?.id}
              onTaskClick={(task) => {
                // 跳转到任务详情页面
                navigate(`/todo-for-ai/pages/tasks/${task.id}`)
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab={tp('tabs.context')} key="context">
          <ContextRulesTab projectId={parseInt(id!, 10)} />
        </TabPane>
      </Tabs>


    </div>
  )
}

// 上下文规则标签页组件
const ContextRulesTab: React.FC<{ projectId: number }> = ({ projectId }) => {
  const navigate = useNavigate()
  const { tp } = usePageTranslation('projectDetail')
  const {
    contextRules,
    loading,
    fetchContextRules,
    setQueryParams,
    deleteContextRule,
    toggleContextRule
  } = useContextRuleStore()

  useEffect(() => {
    // 设置查询参数为当前项目
    setQueryParams({ project_id: projectId })
    fetchContextRules()
  }, [projectId, setQueryParams, fetchContextRules])

  const handleCreate = () => {
    navigate(`/todo-for-ai/pages/context-rules/create?project_id=${projectId}`)
  }

  const handleEdit = (rule: ContextRule) => {
    navigate(`/todo-for-ai/pages/context-rules/${rule.id}/edit`)
  }

  const handleDelete = async (rule: ContextRule) => {
    const success = await deleteContextRule(rule.id)
    if (success) {
      message.success(tp('contextRules.messages.deleteSuccess'))
    }
  }

  const handleToggle = async (rule: ContextRule) => {
    const success = await toggleContextRule(rule.id, !rule.is_active)
    if (success) {
      const messageKey = rule.is_active ? 'disableSuccess' : 'enableSuccess'
      message.success(tp(`contextRules.messages.${messageKey}`))
    }
  }



  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ContextRule) => (
        <Button
          type="link"
          onClick={() => handleEdit(record)}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '应用范围',
      key: 'apply_scope',
      width: 120,
      render: (record: ContextRule) => (
        <Space direction="vertical" size={0}>
          {record.apply_to_tasks && <Tag>任务</Tag>}
          {record.apply_to_projects && <Tag>{tp('contextRules.tags.project')}</Tag>}
        </Space>
      ),
    },
    {
      title: tp('contextRules.table.columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: ContextRule) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleEdit(record)}
          >
            查看
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            type={record.is_active ? 'default' : 'primary'}
            onClick={() => handleToggle(record)}
          >
            {record.is_active ? tp('contextRules.actions.disable') : tp('contextRules.actions.enable')}
          </Button>
          <Popconfirm
            title={tp('contextRules.confirm.deleteTitle')}
            description={tp('contextRules.confirm.deleteDescription')}
            onConfirm={() => handleDelete(record)}
            okText={tp('contextRules.confirm.ok')}
            cancelText={tp('contextRules.confirm.cancel')}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>{tp('contextRules.title')}</Title>
          <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            {tp('contextRules.description')}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          {tp('contextRules.createButton')}
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={contextRules}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <CheckSquareOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>{tp('contextRules.empty.title')}</div>
                <div style={{ marginTop: '8px' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    {tp('contextRules.empty.createFirst')}
                  </Button>
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  )
}

export default ProjectDetail
