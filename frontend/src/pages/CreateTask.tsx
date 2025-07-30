import { useState, useEffect, useCallback } from 'react'
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
  PlusOutlined,
  CopyOutlined,
  FileAddOutlined
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
  const [editorContent, setEditorContent] = useState('')
  const [taskLoaded, setTaskLoaded] = useState(false)

  const { createTask, updateTask, getTask } = useTaskStore()
  const { projects, fetchProjects } = useProjectStore()

  // 从URL参数获取默认项目ID
  const defaultProjectId = searchParams.get('project_id')

  // 实时保存草稿功能
  const getDraftKey = (projectId: number) => {
    // 为每个新建任务会话创建唯一的草稿键
    if (isEditMode && id) {
      return `task-edit-${id}`
    } else {
      // 新建任务使用时间戳确保唯一性
      const sessionId = sessionStorage.getItem('newTaskSessionId') || Date.now().toString()
      if (!sessionStorage.getItem('newTaskSessionId')) {
        sessionStorage.setItem('newTaskSessionId', sessionId)
      }
      return `task-draft-${projectId}-${sessionId}`
    }
  }

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
  }, [fetchProjects])

  // 单独处理编辑模式和默认项目设置
  useEffect(() => {
    // 检查是否为编辑模式
    if (id) {
      setIsEditMode(true)
      setTaskLoaded(false)
      loadTask(parseInt(id, 10))
    } else {
      setTaskLoaded(true) // 新建模式，直接标记为已加载

      // 检查是否是复制任务模式
      const isCopyMode = searchParams.get('copy') === 'true'
      if (isCopyMode) {
        try {
          const copyDataStr = sessionStorage.getItem('copyTaskData')
          if (copyDataStr) {
            const copyData = JSON.parse(copyDataStr)
            form.setFieldsValue({
              ...copyData,
              due_date: copyData.due_date ? dayjs(copyData.due_date) : null
            })
            setEditorContent(copyData.content || '')
            // 清除sessionStorage中的数据
            sessionStorage.removeItem('copyTaskData')
            message.success('已复制任务数据，请修改后保存')
          }
        } catch (error) {
          console.error('Failed to load copy data:', error)
          message.error('复制任务数据失败')
        }
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
            setEditorContent(draft.content || '')
            message.info('已加载上次保存的草稿')
          } else {
            form.setFieldsValue({
              project_id: projectId
            })
          }
        }
      }
    }
  }, [defaultProjectId, id])

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

  // 快捷键保存：创建任务后立即进入编辑模式
  const handleSubmitAndEdit = useCallback(async () => {
    try {
      setLoading(true)

      // 验证表单字段
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
        // 编辑模式：保存后留在编辑页面
        result = await updateTask(parseInt(id, 10), taskData)
        if (result) {
          message.success('任务保存成功')
          // 留在当前编辑页面，不跳转
        }
      } else {
        // 创建模式：创建后立即进入编辑模式
        result = await createTask(taskData as CreateTaskData)
        if (result) {
          // 清除草稿
          if (taskData.project_id) {
            clearDraft(taskData.project_id)
          }
          message.success('任务创建成功，进入编辑模式')
          navigate(`/todo-for-ai/pages/tasks/${result.id}/edit`)
        }
      }
    } catch (error: any) {
      console.error(isEditMode ? '保存任务失败:' : '创建任务失败:', error)

      // 检查是否是表单验证错误
      if (error?.errorFields && error.errorFields.length > 0) {
        const firstError = error.errorFields[0]
        message.error(`请检查表单：${firstError.errors[0]}`)

        // 滚动到第一个错误字段
        const fieldName = firstError.name[0]
        const fieldElement = document.querySelector(`[data-field="${fieldName}"]`) ||
                           document.querySelector(`input[name="${fieldName}"]`) ||
                           document.querySelector(`textarea[name="${fieldName}"]`)
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else {
        message.error(isEditMode ? '保存任务失败，请重试' : '创建任务失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }, [isEditMode, id, form, createTask, updateTask, clearDraft, navigate])

  // 键盘快捷键监听
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl+S 快捷键保存
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault()
      handleSubmitAndEdit()
    }
  }, [handleSubmitAndEdit])

  useEffect(() => {
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      // 清理事件监听
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  const loadTask = async (taskId: number) => {
    try {
      setLoading(true)
      const task = await getTask(taskId)

      if (task) {
        // 设置所有字段
        const formData = {
          project_id: task.project_id,
          title: task.title,
          content: task.content,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date ? dayjs(task.due_date) : null,
          tags: task.tags,
          is_ai_task: task.is_ai_task,
        }

        form.setFieldsValue(formData)

        // 直接设置编辑器内容状态
        setEditorContent(task.content || '')
        setTaskLoaded(true)
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

  // 为当前项目创建新任务
  const handleCreateNewTask = () => {
    const currentProjectId = form.getFieldValue('project_id')

    // 清除表单数据和编辑器内容
    form.resetFields()
    setEditorContent('')
    setTaskLoaded(false)

    // 设置默认值
    form.setFieldsValue({
      status: 'todo',
      priority: 'medium',
      is_ai_task: true,
      project_id: currentProjectId || undefined
    })

    // 跳转到创建任务页面
    if (currentProjectId) {
      navigate(`/todo-for-ai/pages/tasks/create?project_id=${currentProjectId}`)
    } else {
      navigate('/todo-for-ai/pages/tasks/create')
    }
  }

  // 从当前任务复制创建新任务
  const handleCopyTask = () => {
    const currentValues = form.getFieldsValue()
    const currentProjectId = currentValues.project_id

    // 构建复制的数据，移除ID相关字段
    const copyData = {
      project_id: currentProjectId,
      title: `${currentValues.title || ''} - 副本`,
      content: editorContent || currentValues.content || '',
      priority: currentValues.priority || 'medium',
      due_date: currentValues.due_date,
      tags: currentValues.tags || [],
      is_ai_task: currentValues.is_ai_task !== undefined ? currentValues.is_ai_task : true
    }

    console.log('Copying task data:', copyData)

    // 将复制的数据存储到sessionStorage，供创建页面使用
    sessionStorage.setItem('copyTaskData', JSON.stringify(copyData))

    // 跳转到创建任务页面
    navigate(`/todo-for-ai/pages/tasks/create?project_id=${currentProjectId}&copy=true`)
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

      {/* 快捷操作按钮 */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <PlusOutlined style={{ marginRight: '12px' }} />
              {isEditMode ? '编辑任务' : '新建任务'}
            </Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
              {isEditMode ? '编辑任务信息，支持Markdown格式的详细内容编辑' : '创建新的任务，支持Markdown格式的详细内容编辑'}
              <span style={{ color: '#1890ff', marginLeft: '8px' }}>
                💡 快捷键：Ctrl+S {isEditMode ? '保存并留在编辑页面' : '创建并进入编辑模式'}
              </span>
            </Paragraph>
          </div>

          {/* 编辑模式下的快捷操作按钮 */}
          {isEditMode && (
            <div>
              <Space>
                <Button
                  icon={<FileAddOutlined />}
                  onClick={handleCreateNewTask}
                  type="default"
                >
                  新建任务
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyTask}
                  type="default"
                >
                  从此任务创建新任务
                </Button>
              </Space>
            </div>
          )}
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                const projectId = form.getFieldValue('project_id') || defaultProjectId
                if (projectId) {
                  navigate(`/todo-for-ai/pages/projects/${projectId}?tab=tasks`)
                } else {
                  navigate('/todo-for-ai/pages/projects')
                }
              }}
            >
              返回项目任务列表
            </Button>
            {!isEditMode && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  // 清除当前草稿
                  const projectId = form.getFieldValue('project_id') || defaultProjectId
                  if (projectId) {
                    clearDraft(parseInt(projectId, 10))
                  }

                  // 创建新的会话ID
                  sessionStorage.removeItem('newTaskSessionId')

                  // 重置表单为新建任务
                  form.resetFields()
                  setEditorContent('')
                  form.setFieldsValue({
                    status: 'todo',
                    priority: 'medium',
                    is_ai_task: true,
                    project_id: defaultProjectId ? parseInt(defaultProjectId, 10) : undefined
                  })

                  message.success('已清除草稿，重新开始创建任务')
                }}
              >
                重新开始
              </Button>
            )}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSubmitAndEdit}
            >
              {isEditMode ? '保存 (Ctrl+S)' : '创建并编辑 (Ctrl+S)'}
            </Button>
          </Space>
        </div>
      </Card>

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
                {/* 只有在非编辑模式或任务已加载时才渲染编辑器 */}
                {(!isEditMode || taskLoaded) ? (
                  <MilkdownEditor
                    value={editorContent}
                    onChange={(value) => {
                      setEditorContent(value || '')
                      form.setFieldsValue({ content: value || '' })

                      // 手动触发实时保存（仅在新建模式下）
                      if (!isEditMode) {
                        // 延迟保存，确保表单值已更新
                        setTimeout(() => {
                          const currentValues = form.getFieldsValue()
                          if (currentValues.project_id) {
                            saveDraft(currentValues.project_id, {
                              title: currentValues.title,
                              content: value || '',
                              status: currentValues.status,
                              priority: currentValues.priority,
                              due_date: currentValues.due_date,
                              tags: currentValues.tags,
                              is_ai_task: currentValues.is_ai_task
                            })
                          }
                        }, 100)
                      }
                    }}
                    onSave={handleSubmitAndEdit}
                    autoHeight={true}
                    minHeight={300}
                    hideToolbar={false}
                  />
                ) : (
                  <div style={{
                    minHeight: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px'
                  }}>
                    正在加载任务内容...
                  </div>
                )}
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
