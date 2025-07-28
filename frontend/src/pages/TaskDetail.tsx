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
  Divider
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  CopyOutlined,
  BranchesOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useTaskStore, useProjectStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { Task } from '../api/tasks'
import dayjs from 'dayjs'

const { Title, Paragraph } = Typography

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  
  const { getTask, deleteTask } = useTaskStore()
  const { projects } = useProjectStore()

  useEffect(() => {
    if (id) {
      loadTask(parseInt(id, 10))
    }
  }, [id])

  const loadTask = async (taskId: number) => {
    try {
      setLoading(true)
      const result = await getTask(taskId)
      if (result) {
        setTask(result)
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

  const handleEdit = () => {
    if (task) {
      navigate(`/tasks/${task.id}/edit`)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    
    try {
      await deleteTask(task.id)
      message.success('任务删除成功')
      navigate('/tasks')
    } catch (error) {
      console.error('删除任务失败:', error)
      message.error('删除任务失败')
    }
  }

  const handleCopyPrompt = () => {
    if (!task) return
    
    const project = projects.find(p => p.id === task.project_id)
    const prompt = `请执行以下任务：

项目：${project?.name || '未知项目'}
任务：${task.title}
描述：${task.description || '无'}
优先级：${task.priority}
截止时间：${task.due_date ? dayjs(task.due_date).format('YYYY-MM-DD') : '无'}

任务详细内容：
${task.content || '无详细内容'}

请根据以上信息完成任务，并在完成后提供详细的执行报告。`

    navigator.clipboard.writeText(prompt).then(() => {
      message.success('AI执行提示词已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
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
    const texts = {
      todo: '待办',
      in_progress: '进行中',
      review: '待审核',
      done: '已完成',
      cancelled: '已取消'
    }
    return texts[status as keyof typeof texts] || status
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
    const texts = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急'
    }
    return texts[priority as keyof typeof texts] || priority
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
        <Title level={3}>任务不存在</Title>
        <Button type="primary" onClick={() => navigate('/tasks')}>
          返回任务列表
        </Button>
      </div>
    )
  }

  const project = projects.find(p => p.id === task.project_id)

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
        <Breadcrumb.Item>{task.title}</Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面标题和操作 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <Title level={2}>
            <FileTextOutlined style={{ marginRight: '12px' }} />
            {task.title}
          </Title>
          {task.description && (
            <Paragraph type="secondary" style={{ fontSize: '16px' }}>
              {task.description}
            </Paragraph>
          )}
        </div>
        
        <Space>
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopyPrompt}
            title="复制AI执行提示词"
          >
            复制Prompt
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除
          </Button>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/tasks')}
          >
            返回
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={8}>
          {/* 任务信息 */}
          <Card title="任务信息" style={{ marginBottom: '24px' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="所属项目">
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
                  {project?.name || '未知项目'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(task.status)}>
                  {getStatusText(task.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={getPriorityColor(task.priority)}>
                  {getPriorityText(task.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分配给">
                {task.assignee || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="截止时间">
                {task.due_date ? dayjs(task.due_date).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预估工时">
                {task.estimated_hours ? `${task.estimated_hours} 小时` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="实际工时">
                {task.actual_hours ? `${task.actual_hours} 小时` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="完成进度">
                <Progress
                  percent={task.completion_rate || 0}
                  size="small"
                  status={task.status === 'done' ? 'success' : 'active'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(task.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(task.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="创建者">
                {task.created_by || '-'}
              </Descriptions.Item>
            </Descriptions>

            {task.tags && task.tags.length > 0 && (
              <>
                <Divider />
                <div>
                  <strong>标签：</strong>
                  <div style={{ marginTop: '8px' }}>
                    {task.tags.map((tag, index) => (
                      <Tag key={index} style={{ marginBottom: '4px' }}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {/* 任务内容 */}
          <Card title="任务内容" style={{ marginBottom: '24px' }}>
            {task.content ? (
              <MarkdownEditor
                value={task.content}
                readOnly
                height={600}
                hideToolbar
                preview="preview"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                暂无详细内容
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default TaskDetail
