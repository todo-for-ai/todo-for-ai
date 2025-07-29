import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import {
  Typography,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Space,
  Card,
  Row,
  Col,
  Checkbox,
  InputNumber,
  Breadcrumb
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { useTaskStore, useProjectStore } from '../stores'
import MilkdownEditor from '../components/MilkdownEditor'

import type { CreateTaskData } from '../api/tasks'
import dayjs from 'dayjs'

const { Title, Paragraph } = Typography
const { Option } = Select

const CreateTask: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const { createTask, updateTask, getTask } = useTaskStore()
  const { projects, fetchProjects } = useProjectStore()

  // 从URL参数获取默认项目ID
  const defaultProjectId = searchParams.get('project_id')

  // 实时保存草稿功能
  const getDraftKey = (projectId: number) => `task-draft-${projectId}`

  const saveDraft = (projectId: number, formData: any) => {
    try {
      const draftKey = getDraftKey(projectId)
      localStorage.setItem(draftKey, JSON.stringify({
        ...formData,
        savedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.warn('Failed to save draft:', error)
    }
  }

  const loadDraft = (projectId: number) => {
    try {
      const draftKey = getDraftKey(projectId)
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const draft = JSON.parse(saved)
        // 移除savedAt字段，只返回表单数据
        const { savedAt, ...formData } = draft
        return formData
      }
    } catch (error) {
      console.warn('Failed to load draft:', error)
    }
    return null
  }

  const clearDraft = (projectId: number) => {
    try {
      const draftKey = getDraftKey(projectId)
      localStorage.removeItem(draftKey)
    } catch (error) {
      console.warn('Failed to clear draft:', error)
    }
  }

  useEffect(() => {
    fetchProjects()

    // 检查是否为编辑模式
    if (id) {
      setIsEditMode(true)
      loadTask(parseInt(id, 10))
    } else {
      // 设置默认项目
      if (defaultProjectId) {
        const projectId = parseInt(defaultProjectId, 10)

        // 尝试加载草稿
        const draft = loadDraft(projectId)
        if (draft) {
          form.setFieldsValue({
            project_id: projectId,
            ...draft
          })
          message.info('已加载上次保存的草稿')
        } else {
          form.setFieldsValue({
            project_id: projectId
          })
        }
      }
    }
  }, [fetchProjects, defaultProjectId, form, id])

  // 设置网页标题
  useEffect(() => {
    const projectId = form.getFieldValue('project_id') || defaultProjectId
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === parseInt(projectId, 10))
      const projectName = project?.name || '未知项目'
      const pageTitle = isEditMode ? '编辑任务' : '创建任务'
      document.title = `${projectName} - ${pageTitle} - Todo for AI`
    } else {
      const pageTitle = isEditMode ? '编辑任务' : '创建任务'
      document.title = `${pageTitle} - Todo for AI`
    }

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [projects, isEditMode, form, defaultProjectId])



  const loadTask = async (taskId: number) => {
    try {
      setLoading(true)
      const task = await getTask(taskId)
      if (task) {
        form.setFieldsValue({
          project_id: task.project_id,
          title: task.title,
          content: task.content,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date ? dayjs(task.due_date) : null,
          tags: task.tags,
          is_ai_task: task.is_ai_task,
        })
      } else {
        message.error('任务不存在')
        navigate('/todo-for-ai/pages/tasks')
      }
    } catch (error) {
      console.error('加载任务失败:', error)
      message.error('加载任务失败')
      navigate('/todo-for-ai/pages/tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()

      const taskData = {
        project_id: values.project_id,
        title: values.title?.trim() || undefined,
        content: values.content?.trim() || undefined,
        status: values.status || 'todo',
        priority: values.priority || 'medium',
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
        tags: values.tags || [],
        is_ai_task: values.is_ai_task || false,
      }

      let result
      if (isEditMode && id) {
        result = await updateTask(parseInt(id, 10), taskData)
        if (result) {
          message.success('任务更新成功')
          navigate(`/todo-for-ai/pages/tasks/${id}`)
        }
      } else {
        result = await createTask(taskData as CreateTaskData)
        if (result) {
          // 清除草稿
          if (taskData.project_id) {
            clearDraft(taskData.project_id)
          }
          message.success('任务创建成功')
          navigate(`/todo-for-ai/pages/tasks/${result.id}`)
        }
      }
    } catch (error) {
      console.error(isEditMode ? '更新任务失败:' : '创建任务失败:', error)
      message.error(isEditMode ? '更新任务失败，请重试' : '创建任务失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate(-1) // 返回上一页
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <HomeOutlined />
          <span onClick={() => navigate('/todo-for-ai/pages')} style={{ cursor: 'pointer', marginLeft: '8px' }}>
            首页
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <span
            onClick={() => {
              const projectId = form.getFieldValue('project_id') || defaultProjectId
              if (projectId) {
                navigate(`/todo-for-ai/pages/projects/${projectId}?tab=tasks`)
              } else {
                navigate('/todo-for-ai/pages/projects')
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            项目任务列表
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{isEditMode ? '编辑任务' : '新建任务'}</Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <PlusOutlined style={{ marginRight: '12px' }} />
          {isEditMode ? '编辑任务' : '新建任务'}
        </Title>
        <Paragraph type="secondary">
          {isEditMode ? '编辑任务信息，支持Markdown格式的详细内容编辑' : '创建新的任务，支持Markdown格式的详细内容编辑'}
        </Paragraph>
      </div>

      {/* 表单内容 */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'todo',
            priority: 'medium',
            is_ai_task: true, // 默认选中分配给AI
          }}
          onFinish={handleSubmit}
          onValuesChange={(changedValues, allValues) => {
            // 实时保存草稿（仅在新建模式下）
            if (!isEditMode && allValues.project_id) {
              saveDraft(allValues.project_id, {
                title: allValues.title,
                content: allValues.content,
                status: allValues.status,
                priority: allValues.priority,
                due_date: allValues.due_date,
                tags: allValues.tags,
                is_ai_task: allValues.is_ai_task
              })
            }
          }}
        >
          {/* 主要内容区域 - 居中布局 */}
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* 基本信息 - 紧凑布局 */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="所属项目"
                    name="project_id"
                    rules={[{ required: true, message: '请选择所属项目' }]}
                  >
                    <Select placeholder="请选择项目">
                      {projects.map(project => (
                        <Option key={project.id} value={project.id}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: project.color,
                                marginRight: '8px'
                              }}
                            />
                            {project.name}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    label="任务标题"
                    name="title"
                    tooltip="可选字段，如果不填写将自动从内容中生成"
                  >
                    <Input placeholder="请输入任务标题（可选）" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="is_ai_task" valuePropName="checked" style={{ marginTop: '30px' }}>
                    <Checkbox>分配给AI执行</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 任务内容 - 主要区域，更加突出 */}
            <Card
              title={
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                  📝 任务内容
                </div>
              }
              style={{
                marginBottom: '16px'
              }}
            >
              <Form.Item
                name="content"
                tooltip="支持Markdown格式，详细描述任务内容、需求和说明"
                rules={[{ required: true, message: '请输入任务内容' }]}
              >
                <MilkdownEditor
                  value={form.getFieldValue('content') || ''}
                  onChange={(value) => form.setFieldsValue({ content: value || '' })}
                  autoHeight={true}
                  minHeight={300}
                  maxHeight={800}
                  preview="live"
                  hideToolbar={false}
                />
              </Form.Item>
            </Card>

            {/* 任务设置 - 简化布局 */}
            <Card title="任务设置" size="small" style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="状态" name="status">
                    <Select>
                      <Option value="todo">待办</Option>
                      <Option value="in_progress">进行中</Option>
                      <Option value="review">待审核</Option>
                      <Option value="done">已完成</Option>
                      <Option value="cancelled">已取消</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="优先级" name="priority">
                    <Select>
                      <Option value="low">低</Option>
                      <Option value="medium">中</Option>
                      <Option value="high">高</Option>
                      <Option value="urgent">紧急</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="截止时间" name="due_date">
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="请选择截止时间"
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="标签" name="tags">
                    <Select
                      mode="tags"
                      placeholder="请输入标签"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </div>

          {/* 操作按钮 */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Space size="large">
              <Button
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={handleCancel}
              >
                返回
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={loading}
                htmlType="submit"
              >
                {isEditMode ? '更新任务' : '创建任务'}
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default CreateTask
