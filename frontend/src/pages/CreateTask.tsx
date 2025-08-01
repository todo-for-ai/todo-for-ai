import { useState, useEffect, useCallback, useRef } from 'react'
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
  Breadcrumb
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  PlusOutlined,
  CopyOutlined,
  FileAddOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useTaskStore, useProjectStore } from '../stores'
import MilkdownEditor from '../components/MilkdownEditor'
import ResizableContainer from '../components/ResizableContainer'
import { FeedbackTip } from '../components/FeedbackTip'
import { UnsavedChangesAlert } from '../components/UnsavedChangesAlert'
import { useTranslation, usePageTranslation } from '../i18n/hooks/useTranslation'

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

  // 防抖保存的定时器引用
  const saveDraftTimeoutRef = useRef<number | undefined>(undefined)
  // 编辑模式草稿保存的定时器引用
  const saveEditDraftTimeoutRef = useRef<number | undefined>(undefined)
  // 原始任务内容（用于版本对比）
  const [originalTaskContent, setOriginalTaskContent] = useState('')
  // 是否有未保存的更改
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const { createTask, updateTask, getTask } = useTaskStore()
  const { projects, fetchProjects } = useProjectStore()
  const { t: tc } = useTranslation('common')
  const { t, tp } = usePageTranslation('createTask')

  // 从URL参数获取默认项目ID
  const defaultProjectId = searchParams.get('project_id')

  // 防抖保存函数 - 避免频繁保存干扰用户输入
  const debouncedSaveDraft = useCallback((content: string) => {
    // 清除之前的定时器
    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current)
    }

    // 设置新的定时器
    saveDraftTimeoutRef.current = window.setTimeout(() => {
      const currentValues = form.getFieldsValue()
      if (currentValues.project_id) {
        const projectId = parseInt(currentValues.project_id, 10)
        const draftKey = getDraftKey(projectId)
        const draftData = {
          title: currentValues.title,
          content: content,
          status: currentValues.status,
          priority: currentValues.priority,
          due_date: currentValues.due_date,
          tags: currentValues.tags,
          is_ai_task: currentValues.is_ai_task
        }

        try {
          localStorage.setItem(draftKey, JSON.stringify(draftData))
          console.log('📝 草稿已保存 (防抖):', draftKey)
        } catch (error) {
          console.warn('保存草稿失败:', error)
        }
      }
    }, 500) // 500ms防抖延迟，避免频繁保存
  }, [form])

  // 编辑模式的草稿保存相关函数
  const getEditDraftKey = (taskId: number) => {
    return `task-edit-draft-${taskId}`
  }

  const saveEditDraft = (taskId: number, formData: any) => {
    try {
      const draftKey = getEditDraftKey(taskId)
      localStorage.setItem(draftKey, JSON.stringify({
        ...formData,
        savedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.warn('Failed to save edit draft:', error)
    }
  }

  // 检查当前是否有未保存的更改
  const checkUnsavedChanges = useCallback(() => {
    if (!isEditMode || !id) {
      setHasUnsavedChanges(false)
      return
    }

    const currentValues = form.getFieldsValue()
    const currentContent = editorContent

    // 比较当前内容与原始内容
    const hasChanges = currentContent !== originalTaskContent ||
                      currentValues.title !== form.getFieldValue('title') ||
                      currentValues.status !== form.getFieldValue('status') ||
                      currentValues.priority !== form.getFieldValue('priority')

    setHasUnsavedChanges(hasChanges)
  }, [isEditMode, id, form, editorContent, originalTaskContent])

  // 编辑模式的防抖保存函数
  const debouncedSaveEditDraft = useCallback((content: string) => {
    if (!isEditMode || !id) return

    // 清除之前的定时器
    if (saveEditDraftTimeoutRef.current) {
      clearTimeout(saveEditDraftTimeoutRef.current)
    }

    // 设置新的定时器
    saveEditDraftTimeoutRef.current = window.setTimeout(() => {
      const currentValues = form.getFieldsValue()
      const taskId = parseInt(id, 10)
      const draftData = {
        title: currentValues.title,
        content: content,
        status: currentValues.status,
        priority: currentValues.priority,
        due_date: currentValues.due_date,
        tags: currentValues.tags,
        is_ai_task: currentValues.is_ai_task,
      }
      saveEditDraft(taskId, draftData)
      // 检查未保存更改
      checkUnsavedChanges()
    }, 500) // 500ms防抖延迟
  }, [isEditMode, id, form, saveEditDraft, checkUnsavedChanges])

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

  const loadEditDraft = (taskId: number) => {
    try {
      const draftKey = getEditDraftKey(taskId)
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const draft = JSON.parse(saved)
        return draft
      }
    } catch (error) {
      console.warn('Failed to load edit draft:', error)
    }
    return null
  }

  const clearEditDraft = (taskId: number) => {
    try {
      const draftKey = getEditDraftKey(taskId)
      localStorage.removeItem(draftKey)
    } catch (error) {
      console.warn('Failed to clear edit draft:', error)
    }
  }

  // 检查是否有未提交的编辑草稿
  const hasUnsavedEditChanges = (taskId: number, currentContent: string) => {
    const draft = loadEditDraft(taskId)
    if (!draft) return false

    // 比较草稿内容与原始内容
    return draft.content !== originalTaskContent
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
      const isContinueMode = searchParams.get('continue') === 'true'

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
            message.success(tp('messages.copyDataLoaded'))
          }
        } catch (error) {
          console.error('Failed to load copy data:', error)
          message.error(tp('messages.copyDataFailed'))
        }
      } else if (isContinueMode) {
        // 连续创建模式：恢复用户偏好设置
        try {
          const savedPriority = localStorage.getItem('createTask_priority') || 'medium'
          const savedIsAiTask = localStorage.getItem('createTask_isAiTask') === 'true'

          form.setFieldsValue({
            project_id: defaultProjectId ? parseInt(defaultProjectId, 10) : undefined,
            status: 'todo',
            priority: savedPriority,
            is_ai_task: savedIsAiTask
          })

          message.success(tp('messages.continueReady'))
        } catch (error) {
          console.error('Failed to load user preferences:', error)
          // 如果加载偏好失败，使用默认值
          form.setFieldsValue({
            project_id: defaultProjectId ? parseInt(defaultProjectId, 10) : undefined,
            status: 'todo',
            priority: 'medium',
            is_ai_task: true
          })
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
            message.info(tp('messages.draftLoaded'))
          } else {
            // 加载用户偏好设置
            const savedPriority = localStorage.getItem('createTask_priority') || 'medium'
            const savedIsAiTask = localStorage.getItem('createTask_isAiTask') === 'true'

            form.setFieldsValue({
              project_id: projectId,
              status: 'todo',
              priority: savedPriority,
              is_ai_task: savedIsAiTask
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
      const projectName = project?.name || tp('unknownProject')
      const pageTitle = isEditMode ? tp('title.edit') : tp('title.create')
      document.title = `${projectName} - ${pageTitle} - Todo for AI`
    } else {
      const pageTitle = isEditMode ? tp('title.edit') : tp('title.create')
      document.title = `${pageTitle} - Todo for AI`
    }

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [projects, isEditMode, form, defaultProjectId, tp])

  // 为没有默认项目ID的新建任务恢复用户偏好设置
  useEffect(() => {
    if (!isEditMode && !defaultProjectId && !searchParams.get('copy') && !searchParams.get('continue')) {
      // 只在普通新建任务模式下，且没有项目ID时恢复偏好设置
      const savedPriority = localStorage.getItem('createTask_priority') || 'medium'
      const savedIsAiTask = localStorage.getItem('createTask_isAiTask') === 'true'

      form.setFieldsValue({
        status: 'todo',
        priority: savedPriority,
        is_ai_task: savedIsAiTask
      })
    }
  }, [isEditMode, defaultProjectId, searchParams, form])

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
          // 清除编辑草稿
          clearEditDraft(parseInt(id, 10))
          // 更新原始内容
          setOriginalTaskContent(taskData.content || '')
          // 重置未保存更改状态
          setHasUnsavedChanges(false)
          message.success(tp('messages.saveSuccess'))
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
          message.success(tp('messages.createAndEditSuccess'))
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
        message.error(isEditMode ? tp('messages.saveFailed') : tp('messages.createFailed'))
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

        // 保存原始内容用于版本对比
        setOriginalTaskContent(task.content || '')

        // 检查是否有编辑草稿
        const editDraft = loadEditDraft(taskId)
        if (editDraft) {
          // 如果有草稿，使用草稿内容
          const draftFormData = {
            project_id: editDraft.project_id || task.project_id,
            title: editDraft.title || task.title,
            content: editDraft.content || task.content,
            status: editDraft.status || task.status,
            priority: editDraft.priority || task.priority,
            due_date: editDraft.due_date ? dayjs(editDraft.due_date) : (task.due_date ? dayjs(task.due_date) : null),
            tags: editDraft.tags || task.tags,
            is_ai_task: editDraft.is_ai_task !== undefined ? editDraft.is_ai_task : task.is_ai_task,
          }
          form.setFieldsValue(draftFormData)
          setEditorContent(editDraft.content || '')

          // 显示草稿提示
          if (editDraft.content !== task.content) {
            message.info(tp('messages.editDraftLoaded'))
          }
        } else {
          // 没有草稿，使用原始内容
          setEditorContent(task.content || '')
        }

        setTaskLoaded(true)
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
          // 清除编辑草稿
          clearEditDraft(parseInt(id, 10))
          message.success(tp('messages.updateSuccess'))
          navigate(`/todo-for-ai/pages/tasks/${id}`)
        }
      } else {
        result = await createTask(taskData as CreateTaskData)
        if (result) {
          // 清除草稿
          if (taskData.project_id) {
            clearDraft(taskData.project_id)
          }
          message.success(tp('messages.createSuccess'))
          navigate(`/todo-for-ai/pages/tasks/${result.id}`)
        }
      }
    } catch (error) {
      console.error(isEditMode ? '更新任务失败:' : '创建任务失败:', error)
      message.error(isEditMode ? tp('messages.updateFailed') : tp('messages.createFailed'))
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

  // 创建此任务后再创建新任务
  const handleCreateAndContinue = async () => {
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

      const result = await createTask(taskData as CreateTaskData)
      if (result) {
        // 清除草稿
        if (taskData.project_id) {
          clearDraft(taskData.project_id)
        }

        // 保存用户的偏好设置到localStorage
        localStorage.setItem('createTask_priority', taskData.priority)
        localStorage.setItem('createTask_isAiTask', String(taskData.is_ai_task))

        message.success(tp('messages.createAndContinueSuccess'))

        // 跳转到新的创建任务页面
        if (taskData.project_id) {
          navigate(`/todo-for-ai/pages/tasks/create?project_id=${taskData.project_id}&continue=true`)
        } else {
          navigate('/todo-for-ai/pages/tasks/create?continue=true')
        }
      }
    } catch (error) {
      console.error('创建任务失败:', error)
      message.error(tp('messages.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 查看任务详情
  const handleViewTaskDetail = () => {
    if (id) {
      navigate(`/todo-for-ai/pages/tasks/${id}`)
    }
  }

  return (
    <div style={{ padding: '24px', width: '80%', margin: '0 auto', minWidth: '800px', maxWidth: '1600px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <HomeOutlined />
          <span onClick={() => navigate('/todo-for-ai/pages')} style={{ cursor: 'pointer', marginLeft: '8px' }}>
            {tp('navigation.home')}
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
            {tp('navigation.projectTaskList')}
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{isEditMode ? tp('title.edit') : tp('title.create')}</Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面标题区域 - 符合UI设计对齐原则 */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 返回按钮 - 移到左上角标题左边 */}
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              const projectId = form.getFieldValue('project_id') || defaultProjectId
              if (projectId) {
                navigate(`/todo-for-ai/pages/projects/${projectId}`)
              } else {
                navigate('/todo-for-ai/pages/tasks')
              }
            }}
            style={{
              fontSize: '16px',
              height: '40px',
              padding: '0 12px'
            }}
          >
            {tp('navigation.returnToProjectTaskList')}
          </Button>

          {/* 页面标题 */}
          <div style={{ flex: 1 }}>
            <Title level={2} style={{ margin: 0 }}>
              <PlusOutlined style={{ marginRight: '12px' }} />
              {isEditMode ? tp('title.edit') : tp('title.create')}
            </Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
              {isEditMode ? tp('description.edit') : tp('description.create')}
              <span style={{ color: '#1890ff', marginLeft: '8px' }}>
                💡 {tp('shortcuts.save')} {isEditMode ? tp('shortcuts.saveAndStay') : tp('shortcuts.createAndEdit')}
              </span>
            </Paragraph>
          </div>
        </div>
      </Card>

      {/* 用户反馈提示 */}
      <FeedbackTip />

      {/* 未保存更改提示（仅在编辑模式下显示） */}
      {isEditMode && (
        <UnsavedChangesAlert
          visible={hasUnsavedChanges}
          onSave={handleSubmitAndEdit}
        />
      )}

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
            // 实时保存草稿
            if (!isEditMode && allValues.project_id) {
              // 新建模式：保存到创建草稿
              saveDraft(allValues.project_id, {
                title: allValues.title,
                content: allValues.content,
                status: allValues.status,
                priority: allValues.priority,
                due_date: allValues.due_date,
                tags: allValues.tags,
                is_ai_task: allValues.is_ai_task
              })
            } else if (isEditMode && id) {
              // 编辑模式：保存到编辑草稿
              const taskId = parseInt(id, 10)
              saveEditDraft(taskId, {
                title: allValues.title,
                content: allValues.content,
                status: allValues.status,
                priority: allValues.priority,
                due_date: allValues.due_date,
                tags: allValues.tags,
                is_ai_task: allValues.is_ai_task
              })
              // 检查未保存更改
              checkUnsavedChanges()
            }

            // 保存用户偏好设置（仅在新建模式下）
            if (!isEditMode) {
              if (changedValues.priority !== undefined) {
                localStorage.setItem('createTask_priority', changedValues.priority)
              }
              if (changedValues.is_ai_task !== undefined) {
                localStorage.setItem('createTask_isAiTask', String(changedValues.is_ai_task))
              }
            }
          }}
        >
          {/* 主要内容区域 - 可调整宽度 */}
          <ResizableContainer
            defaultWidth={1000}
            minWidth={600}
            maxWidth={1400}
            storageKey="taskEditor_contentWidth"
          >
            {/* 基本信息 - 紧凑布局 */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label={tp('form.project.label')}
                    name="project_id"
                    rules={[{ required: true, message: tp('form.project.required') }]}
                  >
                    <Select placeholder={tp('form.project.placeholder')}>
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
                    label={tp('form.title.label')}
                    name="title"
                    tooltip={tp('form.title.tooltip')}
                  >
                    <Input placeholder={tp('form.title.placeholder')} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="is_ai_task" valuePropName="checked" style={{ marginTop: '30px' }}>
                    <Checkbox>{tp('form.assignToAI')}</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 任务内容 - 主要区域，更加突出 */}
            <Card
              title={
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                  📝 {tp('form.content.title')}
                </div>
              }
              style={{
                marginBottom: '16px'
              }}
            >
              {/* 操作按钮行 - 放在编辑器标题下面的单独一行 */}
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: '#fafafa',
                borderRadius: '6px',
                border: '1px solid #f0f0f0'
              }}>
                <Space wrap>
                  {/* 编辑模式下的操作按钮 */}
                  {isEditMode && (
                    <>
                      <Button
                        icon={<EyeOutlined />}
                        onClick={handleViewTaskDetail}
                        type="default"
                        style={{
                          backgroundColor: '#e6f7ff',
                          borderColor: '#91d5ff',
                          color: '#1890ff'
                        }}
                      >
                        {tp('actions.editMode.taskDetail')}
                      </Button>
                      <Button
                        icon={<FileAddOutlined />}
                        onClick={handleCreateNewTask}
                        type="default"
                        style={{
                          backgroundColor: '#f6ffed',
                          borderColor: '#b7eb8f',
                          color: '#52c41a'
                        }}
                      >
                        {tp('actions.editMode.newTask')}
                      </Button>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={handleCopyTask}
                        type="default"
                        style={{
                          backgroundColor: '#fff7e6',
                          borderColor: '#ffd591',
                          color: '#fa8c16'
                        }}
                      >
                        {tp('actions.editMode.copyTask')}
                      </Button>
                    </>
                  )}

                  {/* 新建模式下的按钮 - 按照要求的顺序排列 */}
                  {!isEditMode && (
                    <>
                      {/* 1. 创建任务 */}
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleSubmit}
                        style={{
                          backgroundColor: '#1890ff',
                          borderColor: '#1890ff',
                          fontWeight: 'bold'
                        }}
                      >
                        {tp('actions.createMode.create')}
                      </Button>

                      {/* 2. 创建并编辑 (Ctrl+S) */}
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleSubmitAndEdit}
                        style={{
                          backgroundColor: '#52c41a',
                          borderColor: '#52c41a',
                          fontWeight: 'bold'
                        }}
                      >
                        {tp('actions.createMode.createAndEdit')}
                      </Button>

                      {/* 3. 创建此任务后再创建新任务 */}
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        loading={loading}
                        onClick={handleCreateAndContinue}
                        style={{
                          backgroundColor: '#fa8c16',
                          borderColor: '#fa8c16',
                          fontWeight: 'bold'
                        }}
                      >
                        {tp('actions.createMode.createAndContinue')}
                      </Button>

                      {/* 4. 重新开始 */}
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

                          message.success(tp('messages.restartSuccess'))
                        }}
                        style={{
                          backgroundColor: '#ff4d4f',
                          borderColor: '#ff4d4f',
                          fontWeight: 'bold'
                        }}
                      >
                        {tp('actions.createMode.restart')}
                      </Button>
                    </>
                  )}

                  {/* 编辑模式下的保存按钮 */}
                  {isEditMode && (
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={loading}
                      onClick={handleSubmitAndEdit}
                      style={{
                        backgroundColor: '#1890ff',
                        borderColor: '#1890ff',
                        fontWeight: 'bold'
                      }}
                    >
                      {tp('actions.editMode.save')}
                    </Button>
                  )}
                </Space>
              </div>

              <Form.Item
                name="content"
                tooltip={tp('form.content.tooltip')}
                rules={[{ required: true, message: tp('form.content.required') }]}
              >
                {/* 只有在非编辑模式或任务已加载时才渲染编辑器 */}
                {(!isEditMode || taskLoaded) ? (
                  <MilkdownEditor
                    value={editorContent}
                    onChange={(value) => {
                      // 修复：避免循环更新，使用更智能的状态管理
                      const newValue = value || ''

                      // 只有在内容真正变化时才更新状态
                      if (newValue !== editorContent) {
                        setEditorContent(newValue)

                        // 使用静默更新，避免触发onValuesChange
                        form.setFieldValue('content', newValue)

                        // 手动触发实时保存
                        if (!isEditMode) {
                          // 新建模式：使用防抖保存，避免频繁保存干扰用户输入
                          debouncedSaveDraft(newValue)
                        } else {
                          // 编辑模式：使用编辑草稿保存
                          debouncedSaveEditDraft(newValue)
                        }
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
                    {tp('form.content.loading')}
                  </div>
                )}
              </Form.Item>
            </Card>

            {/* 任务设置 - 简化布局 */}
            <Card title={tp('form.settings.title')} size="small" style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label={tp('form.settings.status.label')} name="status">
                    <Select>
                      <Option value="todo">{tp('form.settings.status.todo')}</Option>
                      <Option value="in_progress">{tp('form.settings.status.inProgress')}</Option>
                      <Option value="review">{tp('form.settings.status.review')}</Option>
                      <Option value="done">{tp('form.settings.status.done')}</Option>
                      <Option value="cancelled">{tp('form.settings.status.cancelled')}</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label={tp('form.settings.priority.label')} name="priority">
                    <Select>
                      <Option value="low">{tp('form.settings.priority.low')}</Option>
                      <Option value="medium">{tp('form.settings.priority.medium')}</Option>
                      <Option value="high">{tp('form.settings.priority.high')}</Option>
                      <Option value="urgent">{tp('form.settings.priority.urgent')}</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label={tp('form.settings.dueDate.label')} name="due_date">
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder={tp('form.settings.dueDate.placeholder')}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label={tp('form.settings.tags.label')} name="tags">
                    <Select
                      mode="tags"
                      placeholder={tp('form.settings.tags.placeholder')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </ResizableContainer>

          {/* 操作按钮 */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Space size="large">
              <Button
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={handleCancel}
              >
                {tp('actions.common.return')}
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={loading}
                htmlType="submit"
              >
                {isEditMode ? tp('actions.common.update') : tp('actions.createMode.create')}
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default CreateTask
