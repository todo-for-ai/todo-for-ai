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
import { MarkdownEditor } from '../components/MarkdownEditor'
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

  useEffect(() => {
    fetchProjects()

    // 检查是否为编辑模式
    if (id) {
      setIsEditMode(true)
      loadTask(parseInt(id, 10))
    } else {
      // 设置默认项目
      if (defaultProjectId) {
        form.setFieldsValue({
          project_id: parseInt(defaultProjectId, 10)
        })
      }
    }
  }, [fetchProjects, defaultProjectId, form, id])

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
        navigate('/tasks')
      }
    } catch (error) {
      console.error('加载任务失败:', error)
      message.error('加载任务失败')
      navigate('/tasks')
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
          navigate(`/tasks/${id}`)
        }
      } else {
        result = await createTask(taskData as CreateTaskData)
        if (result) {
          message.success('任务创建成功')
          navigate(`/tasks/${result.id}`)
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
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer', marginLeft: '8px' }}>
            首页
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
            任务管理
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
                  📝 任务内容 (重点区域)
                </div>
              }
              style={{
                marginBottom: '16px',
                border: '2px solid #1890ff',
                borderRadius: '8px'
              }}
            >
              <Form.Item
                name="content"
                tooltip="支持Markdown格式，详细描述任务内容、需求和说明"
                rules={[{ required: true, message: '请输入任务内容' }]}
              >
                <MarkdownEditor
                  placeholder="请详细描述任务内容（支持Markdown格式）...

这里是任务的核心内容区域，请详细描述：
- 任务的具体要求
- 需要完成的功能
- 相关的技术细节
- 预期的结果

支持Markdown格式，可以使用标题、列表、代码块等格式化内容。"
                  height={700}
                  preview="live"
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
