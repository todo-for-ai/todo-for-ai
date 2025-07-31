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
  Switch,
  InputNumber
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  HomeOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useContextRuleStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { ComplianceNotice } from '../components/ComplianceNotice'
import type { CreateContextRuleData, UpdateContextRuleData } from '../api/contextRules'

const { Title } = Typography
const { TextArea } = Input




const CreateContextRule = () => {
  const { t } = useTranslation('createContextRule')
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
        is_public: false,
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
        apply_to_projects: currentContextRule.apply_to_projects,
        is_public: currentContextRule.is_public || false
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
        apply_to_projects: formValues.apply_to_projects === true,
        is_public: formValues.is_public === true
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
          message.success(t('messages.updateSuccess'))
        }
      } else {
        const result = await createContextRule(ruleData as CreateContextRuleData)
        success = !!result
        if (success) {
          message.success(t('messages.createSuccess'))
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
      message.error(t('messages.saveError'))
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
    if (isEditMode && currentContextRule) {
      document.title = t('pageTitle.editWithName', { name: currentContextRule.name })
    } else {
      document.title = isEditMode ? t('pageTitle.edit') : t('pageTitle.create')
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
      message.error(t('messages.loadError'))
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
              {t('breadcrumb.home')}
            </span>
          </Breadcrumb.Item>
          {projectId ? (
            <>
              <Breadcrumb.Item>
                <span
                  onClick={() => navigate('/todo-for-ai/pages/projects')}
                  style={{ cursor: 'pointer' }}
                >
                  {t('breadcrumb.projects')}
                </span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <span
                  onClick={() => navigate(`/todo-for-ai/pages/projects/${projectId}?tab=context`)}
                  style={{ cursor: 'pointer' }}
                >
                  {t('breadcrumb.projectContextRules')}
                </span>
              </Breadcrumb.Item>
            </>
          ) : (
            <Breadcrumb.Item>
              <span
                onClick={() => navigate('/todo-for-ai/pages/context-rules')}
                style={{ cursor: 'pointer' }}
              >
                {t('breadcrumb.globalContextRules')}
              </span>
            </Breadcrumb.Item>
          )}
          <Breadcrumb.Item>{isEditMode ? t('breadcrumb.editRule') : t('breadcrumb.createRule')}</Breadcrumb.Item>
        </Breadcrumb>
      </Card>

      <div className="page-header">
        <Title level={2} className="page-title">
          {isEditMode ? t('title.edit') : (projectId ? t('title.createProject') : t('title.createGlobal'))}
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
            <Card title={t('form.sections.basicInfo')}>
              <Form.Item
                label={t('form.fields.name.label')}
                name="name"
                rules={[
                  { required: true, message: t('form.fields.name.required') },
                  { max: 255, message: t('form.fields.name.maxLength') }
                ]}
              >
                <Input placeholder={t('form.fields.name.placeholder')} />
              </Form.Item>

              <Form.Item label={t('form.fields.description.label')} name="description">
                <TextArea
                  placeholder={t('form.fields.description.placeholder')}
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Card>
          </Col>

          <Col span={24}>
            <Card title={t('form.sections.content')}>
              <Form.Item
                label={t('form.fields.content.label')}
                name="content"
                rules={[{ required: true, message: t('form.fields.content.required') }]}
                help={t('form.fields.content.help')}
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
                    placeholder={t('form.fields.content.placeholder')}
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
                    {t('messages.loading')}
                  </div>
                )}
              </Form.Item>
            </Card>
          </Col>

          <Col span={24}>
            <Card title={t('form.sections.configuration')}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Form.Item
                    label={t('form.fields.priority.label')}
                    name="priority"
                    help={t('form.fields.priority.help')}
                  >
                    <InputNumber
                      min={-100}
                      max={100}
                      placeholder={t('form.fields.priority.placeholder')}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label={t('form.fields.isActive.label')}
                    name="is_active"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={t('form.fields.isActive.enabled')}
                      unCheckedChildren={t('form.fields.isActive.disabled')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label={t('form.fields.applyToTasks.label')}
                    name="apply_to_tasks"
                    valuePropName="checked"
                    help={t('form.fields.applyToTasks.help')}
                  >
                    <Switch
                      checkedChildren={t('form.fields.applyToTasks.yes')}
                      unCheckedChildren={t('form.fields.applyToTasks.no')}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('form.fields.applyToProjects.label')}
                    name="apply_to_projects"
                    valuePropName="checked"
                    help={t('form.fields.applyToProjects.help')}
                  >
                    <Switch
                      checkedChildren={t('form.fields.applyToProjects.yes')}
                      unCheckedChildren={t('form.fields.applyToProjects.no')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label={t('form.fields.isPublic.label')}
                    name="is_public"
                    valuePropName="checked"
                    help={t('form.fields.isPublic.help')}
                  >
                    <Switch
                      checkedChildren={t('form.fields.isPublic.public')}
                      unCheckedChildren={t('form.fields.isPublic.private')}
                    />
                  </Form.Item>
                  <ComplianceNotice />
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
              {t('buttons.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              {isEditMode ? t('buttons.update') : t('buttons.create')}
            </Button>
          </Space>
        </div>
      </Form>
      </div>
    </div>
  )
}

export default CreateContextRule
