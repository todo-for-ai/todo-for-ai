import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Typography,
  Button,
  Form,
  Input,
  Card,
  Space,
  message,
  Breadcrumb,
  Row,
  Col,
  Select,
  Switch,
  InputNumber
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useContextRuleStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { CreateContextRuleData, UpdateContextRuleData } from '../api/contextRules'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select



const CreateContextRule = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [isEditMode, setIsEditMode] = useState(false)
  const [projectId, setProjectId] = useState<number | undefined>()
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const {
    loading,
    currentContextRule,
    createContextRule,
    updateContextRule,
    fetchContextRule
  } = useContextRuleStore()

  useEffect(() => {
    // 从URL参数获取项目ID
    const projectIdParam = searchParams.get('project_id')
    if (projectIdParam) {
      setProjectId(parseInt(projectIdParam, 10))
    }

    if (id) {
      setIsEditMode(true)
      loadContextRule(parseInt(id, 10))
    } else {
      // 新建模式，设置默认值
      // 如果是从全局上下文规则页面访问，强制设置为全局规则
      const isFromGlobalRules = window.location.pathname.includes('/context-rules/create')

      form.setFieldsValue({
        priority: isFromGlobalRules ? 100 : 0,
        is_active: true,
        apply_to_tasks: true,
        apply_to_projects: false,
        project_id: projectId
      })
    }
  }, [id, searchParams, form])

  // 监听 currentContextRule 变化，设置表单值
  useEffect(() => {
    if (isEditMode && currentContextRule && isDataLoaded) {
      form.setFieldsValue({
        name: currentContextRule.name,
        description: currentContextRule.description,
        content: currentContextRule.content,
        priority: currentContextRule.priority,
        is_active: currentContextRule.is_active,
        apply_to_tasks: currentContextRule.apply_to_tasks,
        apply_to_projects: currentContextRule.apply_to_projects
      })
      setProjectId(currentContextRule.project_id)
    }
  }, [currentContextRule, isEditMode, form, isDataLoaded])

  const handleSubmit = useCallback(async (values?: any) => {
    try {
      // 如果没有传入values，从表单获取
      const formValues = values || await form.validateFields()

      const ruleData: CreateContextRuleData | UpdateContextRuleData = {
        name: formValues.name,
        description: formValues.description || '',
        content: formValues.content || '',

        priority: formValues.priority || 0,
        is_active: formValues.is_active !== false,
        apply_to_tasks: formValues.apply_to_tasks !== false,
        apply_to_projects: formValues.apply_to_projects === true
      }

      // 如果有项目ID，添加到数据中
      if (projectId) {
        (ruleData as CreateContextRuleData).project_id = projectId
      }

      let success = false
      if (isEditMode && id) {
        const result = await updateContextRule(parseInt(id, 10), ruleData)
        success = !!result
        if (success) {
          message.success('上下文规则更新成功')
        }
      } else {
        const result = await createContextRule(ruleData as CreateContextRuleData)
        success = !!result
        if (success) {
          message.success('上下文规则创建成功')
        }
      }

      if (success) {
        // 根据是否有项目ID决定跳转目标
        if (projectId) {
          navigate(`/todo-for-ai/pages/projects/${projectId}?tab=context`)
        } else {
          navigate('/todo-for-ai/pages/context-rules')
        }
      }
    } catch (error) {
      console.error('保存上下文规则失败:', error)
      message.error('保存上下文规则失败')
    }
  }, [isEditMode, id, projectId, form, updateContextRule, createContextRule, navigate])

  // 键盘快捷键监听
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl+S 快捷键保存
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  useEffect(() => {
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      // 清理事件监听
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // 设置网页标题
  useEffect(() => {
    const pageTitle = isEditMode ? '编辑上下文规则' : '创建上下文规则'
    if (isEditMode && currentContextRule) {
      document.title = `${currentContextRule.name} - ${pageTitle} - Todo for AI`
    } else {
      document.title = `${pageTitle} - Todo for AI`
    }
    
    return () => {
      document.title = 'Todo for AI'
    }
  }, [isEditMode, currentContextRule])

  const loadContextRule = async (ruleId: number) => {
    try {
      await fetchContextRule(ruleId)
      setIsDataLoaded(true)
    } catch (error) {
      console.error('加载上下文规则失败:', error)
      message.error('加载上下文规则失败')
    }
  }



  const handleCancel = () => {
    if (projectId) {
      navigate(`/todo-for-ai/pages/projects/${projectId}?tab=context`)
    } else {
      navigate('/todo-for-ai/pages/context-rules')
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 面包屑导航 */}
      <Card style={{ marginBottom: '16px' }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <HomeOutlined />
            <span onClick={() => navigate('/todo-for-ai/pages')} style={{ cursor: 'pointer', marginLeft: '8px' }}>
              首页
            </span>
          </Breadcrumb.Item>
          {projectId ? (
            <>
              <Breadcrumb.Item>
                <span
                  onClick={() => navigate('/todo-for-ai/pages/projects')}
                  style={{ cursor: 'pointer' }}
                >
                  项目列表
                </span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <span
                  onClick={() => navigate(`/todo-for-ai/pages/projects/${projectId}?tab=context`)}
                  style={{ cursor: 'pointer' }}
                >
                  项目上下文规则
                </span>
              </Breadcrumb.Item>
            </>
          ) : (
            <Breadcrumb.Item>
              <span
                onClick={() => navigate('/todo-for-ai/pages/context-rules')}
                style={{ cursor: 'pointer' }}
              >
                全局上下文规则
              </span>
            </Breadcrumb.Item>
          )}
          <Breadcrumb.Item>{isEditMode ? '编辑规则' : '创建规则'}</Breadcrumb.Item>
        </Breadcrumb>
      </Card>

      <div className="page-header">
        <Title level={2} className="page-title">
          {isEditMode ? '编辑上下文规则' : (projectId ? '创建项目上下文规则' : '创建全局上下文规则')}
        </Title>
      </div>

      {/* 主要内容区域 - 居中布局 */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="基本信息">
              <Form.Item
                label="规则名称"
                name="name"
                rules={[
                  { required: true, message: '请输入规则名称' },
                  { max: 255, message: '规则名称不能超过255个字符' }
                ]}
              >
                <Input placeholder="请输入规则名称" />
              </Form.Item>

              <Form.Item label="规则描述" name="description">
                <TextArea
                  placeholder="请输入规则描述"
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="规则内容">
              <Form.Item
                label="规则内容"
                name="content"
                rules={[{ required: true, message: '请输入规则内容' }]}
                help="使用Markdown格式编写规则内容，支持代码块、列表、链接等格式"
              >
                {/* 只有在非编辑模式或数据已加载时才渲染编辑器 */}
                {(!isEditMode || (isDataLoaded && currentContextRule)) ? (
                  <MarkdownEditor
                    key={`context-rule-editor-${id || 'new'}-${currentContextRule?.id || 'empty'}`}
                    value={form.getFieldValue('content') || ''}
                    onChange={(value) => form.setFieldsValue({ content: value })}
                    onSave={() => handleSubmit()}
                    autoHeight={true}
                    minHeight={300}
                    placeholder="请输入规则内容..."
                  />
                ) : (
                  <div style={{
                    minHeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px'
                  }}>
                    正在加载规则内容...
                  </div>
                )}
              </Form.Item>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="规则配置">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Form.Item
                    label="优先级"
                    name="priority"
                    help="数字越大优先级越高"
                  >
                    <InputNumber
                      min={-100}
                      max={100}
                      placeholder="0"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="启用状态"
                    name="is_active"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="应用到任务查询"
                    name="apply_to_tasks"
                    valuePropName="checked"
                    help="在AI查询任务详情时应用此规则"
                  >
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="应用到项目查询"
                    name="apply_to_projects"
                    valuePropName="checked"
                    help="在AI查询项目信息时应用此规则"
                  >
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size="large">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              {isEditMode ? '更新规则' : '创建规则'}
            </Button>
          </Space>
        </div>
      </Form>
      </div>
    </div>
  )
}

export default CreateContextRule
