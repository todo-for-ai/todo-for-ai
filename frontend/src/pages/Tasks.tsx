import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Table,
  Space,
  Tag,
  Select,
  message,
  Popconfirm,
  Progress,
  Checkbox
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  CopyOutlined,
  RobotOutlined
} from '@ant-design/icons'
import { useTaskStore, useProjectStore } from '../stores'

import type { Task, CreateTaskData, UpdateTaskData } from '../api/tasks'
import dayjs from 'dayjs'

const { Title, Paragraph } = Typography
const { Option } = Select

const Tasks = () => {
  const navigate = useNavigate()


  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    pagination,
    queryParams,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    setQueryParams,
    clearError: clearTasksError,
  } = useTaskStore()

  const {
    projects,
    fetchProjects,
  } = useProjectStore()

  useEffect(() => {
    fetchTasks()
    fetchProjects()
  }, [fetchTasks, fetchProjects])

  useEffect(() => {
    if (tasksError) {
      message.error(tasksError)
      clearTasksError()
    }
  }, [tasksError, clearTasksError])

  // 设置网页标题
  useEffect(() => {
    document.title = '所有任务 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

  const handleCreate = () => {
    navigate('/todo-for-ai/pages/tasks/create')
  }

  const handleEdit = (task: Task) => {
    navigate(`/todo-for-ai/pages/tasks/${task.id}/edit`)
  }

  const handleView = (task: Task) => {
    navigate(`/todo-for-ai/pages/tasks/${task.id}`)
  }

  const handleCopyPrompt = (task: Task) => {
    const project = projects.find(p => p.id === task.project_id)
    const prompt = `请帮我执行以下任务：

**项目名称**: ${project?.name || '未知项目'}
**任务标题**: ${task.title}
**任务描述**: ${task.description || '无'}
**任务内容**:
${task.content || '无详细内容'}

**任务要求**:
- 优先级: ${task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : task.priority === 'high' ? '高' : '紧急'}
- 截止时间: ${task.due_date ? dayjs(task.due_date).format('YYYY-MM-DD') : '无'}
- 执行方式: ${task.is_ai_task ? 'AI执行' : '人工执行'}

**相关文件**: ${task.related_files && task.related_files.length > 0 ? task.related_files.join(', ') : '无'}

**执行指引**:
1. 请使用MCP工具连接到Todo系统: http://localhost:50110
2. 使用get_task_by_id工具获取任务详情: 任务ID ${task.id}
3. 完成任务后，使用submit_task_feedback工具提交反馈
4. 项目名称: "${project?.name || ''}", 任务ID: ${task.id}

请开始执行这个任务，并在完成后提交反馈。`

    navigator.clipboard.writeText(prompt).then(() => {
      message.success('任务提示词已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败，请手动复制')
    })
  }



  const handleDelete = async (task: Task) => {
    const success = await deleteTask(task.id)
    if (success) {
      message.success('任务删除成功')
    }
  }

  const handleStatusChange = async (task: Task, status: Task['status']) => {
    const success = await updateTaskStatus(task.id, status)
    if (success) {
      message.success('任务状态更新成功')
    }
  }



  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    const newParams: any = {
      page: pagination.current,
      per_page: pagination.pageSize,
    }

    if (sorter.field) {
      newParams.sort_by = sorter.field
      newParams.sort_order = sorter.order === 'ascend' ? 'asc' : 'desc'
    }

    setQueryParams(newParams)
    fetchTasks()
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

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      render: (text: string, record: Task) => (
        <div>
          <Button
            type="link"
            style={{
              padding: 0,
              fontWeight: 500,
              height: 'auto',
              color: getTaskTitleColor(record.status)
            }}
            onClick={() => handleView(record)}
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
      ),
    },
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
      width: 120,
      render: (_project: any, record: Task) => {
        const projectInfo = projects.find(p => p.id === record.project_id)
        return projectInfo ? (
          <Tag color={projectInfo.color}>{projectInfo.name}</Tag>
        ) : (
          <Tag>未知项目</Tag>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: Task) => {
        // const statusConfig = {
        //   todo: { color: 'default', text: '待办' },
        //   in_progress: { color: 'processing', text: '进行中' },
        //   review: { color: 'warning', text: '待审核' },
        //   done: { color: 'success', text: '已完成' },
        //   cancelled: { color: 'error', text: '已取消' },
        // }
        // const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.todo
        return (
          <Select
            value={status}
            size="small"
            style={{ width: 90 }}
            onChange={(newStatus) => handleStatusChange(record, newStatus as Task['status'])}
          >
            <Option value="todo">待办</Option>
            <Option value="in_progress">进行中</Option>
            <Option value="review">待审核</Option>
            <Option value="done">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
        )
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
      title: '进度',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      width: 100,
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          status={rate === 100 ? 'success' : 'active'}
        />
      ),
    },
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 100,
      sorter: true,
      render: (date: string) => {
        if (!date) return '-'
        const dueDate = dayjs(date)
        const now = dayjs()
        const isOverdue = dueDate.isBefore(now, 'day')
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dueDate.format('MM-DD')}
          </span>
        )
      },
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
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <Title level={2} className="page-title">
              任务管理
            </Title>
            <Paragraph className="page-description">
              创建和管理任务，使用Markdown编辑器编写详细描述
            </Paragraph>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchTasks()}
              loading={tasksLoading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新建任务
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Space>
          <Select
            placeholder="选择项目"
            style={{ width: 200 }}
            allowClear
            value={queryParams.project_id}
            onChange={(value) => {
              setQueryParams({ project_id: value })
              fetchTasks()
            }}
          >
            {projects.map(project => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="选择状态"
            style={{ width: 120 }}
            allowClear
            value={queryParams.status}
            onChange={(value) => {
              setQueryParams({ status: value })
              fetchTasks()
            }}
          >
            <Option value="todo">待办</Option>
            <Option value="in_progress">进行中</Option>
            <Option value="review">待审核</Option>
            <Option value="done">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <Select
            placeholder="选择优先级"
            style={{ width: 120 }}
            allowClear
            value={queryParams.priority}
            onChange={(value) => {
              setQueryParams({ priority: value })
              fetchTasks()
            }}
          >
            <Option value="low">低</Option>
            <Option value="medium">中</Option>
            <Option value="high">高</Option>
            <Option value="urgent">紧急</Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
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
    </div>
  )
}

export default Tasks
