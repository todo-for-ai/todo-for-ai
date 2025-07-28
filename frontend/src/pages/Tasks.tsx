import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Table,
  Space,
  Tag,
  Select,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Popconfirm,
  Progress,
  Drawer,
  Checkbox
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CopyOutlined,
  BranchesOutlined
} from '@ant-design/icons'
import { useTaskStore, useProjectStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { Task, CreateTaskData, UpdateTaskData } from '../api/tasks'
import dayjs from 'dayjs'

const { Title, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

const Tasks = () => {
  const navigate = useNavigate()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [form] = Form.useForm()

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

  const handleCreate = () => {
    navigate('/tasks/create')
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    form.setFieldsValue({
      project_id: task.project_id,
      title: task.title,
      content: task.content,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? dayjs(task.due_date) : null,
      tags: task.tags,
    })
    setIsModalVisible(true)
  }

  const handleView = (task: Task) => {
    navigate(`/tasks/${task.id}`)
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

  const handleQuickCreate = (sourceTask: Task) => {
    const project = projects.find(p => p.id === sourceTask.project_id)

    // 复制当前任务的所有字段作为新任务的默认值
    form.setFieldsValue({
      project_id: sourceTask.project_id,
      title: `${sourceTask.title} - 副本`,
      content: sourceTask.content,
      priority: sourceTask.priority,
      due_date: sourceTask.due_date ? dayjs(sourceTask.due_date) : null,
      tags: sourceTask.tags,
      related_files: sourceTask.related_files
    })

    setEditingTask(null) // 确保是创建模式
    setIsDetailVisible(false) // 关闭详情抽屉
    setIsModalVisible(true) // 打开创建/编辑模态框

    message.info(`基于任务"${sourceTask.title}"创建新任务`)
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

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const taskData: CreateTaskData | UpdateTaskData = {
        project_id: values.project_id,
        title: values.title,
        content: values.content || '',
        status: values.status || 'todo',
        priority: values.priority || 'medium',
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
        tags: values.tags || [],
      }

      let success = false
      if (editingTask) {
        const result = await updateTask(editingTask.id, taskData)
        success = !!result
        if (success) {
          message.success('任务更新成功')
        }
      } else {
        const result = await createTask(taskData as CreateTaskData)
        success = !!result
        if (success) {
          message.success('任务创建成功')
        }
      }

      if (success) {
        setIsModalVisible(false)
        form.resetFields()
        setEditingTask(null)
      }
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  const handleModalCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingTask(null)
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
            style={{ padding: 0, fontWeight: 500, height: 'auto' }}
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

      {/* 创建/编辑任务模态框 */}
      <Modal
        title={editingTask ? '编辑任务' : '新建任务'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={tasksLoading}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'todo',
            priority: 'medium',
          }}
        >
          <Form.Item
            label="所属项目"
            name="project_id"
            rules={[{ required: true, message: '请选择所属项目' }]}
          >
            <Select placeholder="请选择项目">
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="任务标题"
            name="title"
            rules={[
              { required: true, message: '请输入任务标题' },
              { max: 200, message: '任务标题不能超过200个字符' },
            ]}
          >
            <Input placeholder="请输入任务标题" />
          </Form.Item>

          <Form.Item
            label="任务描述"
            name="description"
            rules={[
              { max: 500, message: '任务描述不能超过500个字符' },
            ]}
          >
            <TextArea
              rows={3}
              placeholder="请输入任务简短描述（可选）"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="任务内容"
            name="content"
            tooltip="支持Markdown格式，可以编写详细的任务说明、需求文档等"
          >
            <MarkdownEditor
              placeholder="请输入任务详细内容（支持Markdown格式）..."
              height={300}
              preview="live"
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="状态"
              name="status"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="todo">待办</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="review">待审核</Option>
                <Option value="done">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="优先级"
              name="priority"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="low">低</Option>
                <Option value="medium">中</Option>
                <Option value="high">高</Option>
                <Option value="urgent">紧急</Option>
              </Select>
            </Form.Item>
          </Space>

          <Form.Item
            label="截止时间"
            name="due_date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="请输入标签，按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="相关文件"
            name="related_files"
            help="输入与此任务相关的文件路径，按回车添加多个文件"
          >
            <Select
              mode="tags"
              placeholder="请输入文件路径，如: src/components/TaskList.tsx"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="分配给AI"
            name="is_ai_task"
            valuePropName="checked"
            help="勾选表示此任务分配给AI执行"
          >
            <Checkbox>此任务分配给AI执行</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* 任务详情抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            <span>任务详情</span>
          </div>
        }
        placement="right"
        width={800}
        open={isDetailVisible}
        onClose={() => setIsDetailVisible(false)}
        extra={
          viewingTask && (
            <Space>
              <Button
                icon={<CopyOutlined />}
                onClick={() => handleCopyPrompt(viewingTask)}
                title="复制AI执行提示词"
              >
                复制Prompt
              </Button>
              <Button
                icon={<BranchesOutlined />}
                onClick={() => handleQuickCreate(viewingTask)}
                title="基于此任务快速创建新任务"
              >
                快速创建
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  setIsDetailVisible(false)
                  handleEdit(viewingTask)
                }}
              >
                编辑
              </Button>
            </Space>
          )
        }
      >
        {viewingTask && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <Title level={3}>{viewingTask.title}</Title>
              <div style={{ marginBottom: '16px' }}>
                <Space wrap>
                  <Tag color={projects.find(p => p.id === viewingTask.project_id)?.color}>
                    {projects.find(p => p.id === viewingTask.project_id)?.name}
                  </Tag>
                  <Tag color={
                    viewingTask.status === 'done' ? 'success' :
                    viewingTask.status === 'in_progress' ? 'processing' :
                    viewingTask.status === 'review' ? 'warning' :
                    viewingTask.status === 'cancelled' ? 'error' : 'default'
                  }>
                    {viewingTask.status === 'todo' ? '待办' :
                     viewingTask.status === 'in_progress' ? '进行中' :
                     viewingTask.status === 'review' ? '待审核' :
                     viewingTask.status === 'done' ? '已完成' : '已取消'}
                  </Tag>
                  <Tag color={
                    viewingTask.priority === 'urgent' ? 'magenta' :
                    viewingTask.priority === 'high' ? 'red' :
                    viewingTask.priority === 'medium' ? 'orange' : 'green'
                  }>
                    {viewingTask.priority === 'low' ? '低' :
                     viewingTask.priority === 'medium' ? '中' :
                     viewingTask.priority === 'high' ? '高' : '紧急'}
                  </Tag>
                </Space>
              </div>

              {viewingTask.description && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>描述：</strong>
                  <div style={{ marginTop: '8px', color: 'rgba(0, 0, 0, 0.65)' }}>
                    {viewingTask.description}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <strong>截止时间：</strong> {viewingTask.due_date ? dayjs(viewingTask.due_date).format('YYYY-MM-DD') : '无'}
                </div>
                <div>
                  <strong>执行方式：</strong> {viewingTask.is_ai_task ? 'AI执行' : '人工执行'}
                </div>
                <div>
                  <strong>实际工时：</strong> {viewingTask.actual_hours ? `${viewingTask.actual_hours}小时` : '未记录'}
                </div>
                <div>
                  <strong>完成进度：</strong> {viewingTask.completion_rate}%
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>完成进度：</strong>
                <Progress
                  percent={viewingTask.completion_rate}
                  status={viewingTask.completion_rate === 100 ? 'success' : 'active'}
                  style={{ marginTop: '8px' }}
                />
              </div>

              {viewingTask.tags && viewingTask.tags.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <strong>标签：</strong>
                  <div style={{ marginTop: '8px' }}>
                    {viewingTask.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
              )}

              {viewingTask.related_files && viewingTask.related_files.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <strong>相关文件：</strong>
                  <div style={{ marginTop: '8px' }}>
                    {viewingTask.related_files.map(file => (
                      <Tag key={file} color="blue">{file}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <strong>任务类型：</strong>
                <Tag color={viewingTask.is_ai_task ? 'purple' : 'default'}>
                  {viewingTask.is_ai_task ? 'AI任务' : '人工任务'}
                </Tag>
              </div>
            </div>

            <div>
              <Title level={4}>任务内容</Title>
              <MarkdownEditor
                value={viewingTask.content || ''}
                readOnly
                height={400}
                hideToolbar
                preview="preview"
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default Tasks
