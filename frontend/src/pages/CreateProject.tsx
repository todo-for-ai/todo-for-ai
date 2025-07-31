import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Typography,
  Button,
  Form,
  Input,
  Card,
  Space,
  message,
  ColorPicker,
  Breadcrumb,
  Row,
  Col,
  Select
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  ReloadOutlined,
  GithubOutlined,
  LinkOutlined,
  GlobalOutlined,
  ImportOutlined
} from '@ant-design/icons'
import { useProjectStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { useTranslation } from '../i18n/hooks/useTranslation'
import type { CreateProjectData, UpdateProjectData } from '../api/projects'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

// 预定义的颜色选项
const PRESET_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa541c', '#a0d911', '#2f54eb',
  '#fa8c16', '#096dd9', '#36cfc9', '#f759ab', '#40a9ff'
]

// 生成随机颜色
const generateRandomColor = () => {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
}

const CreateProject = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { t } = useTranslation('createProject')
  const [form] = Form.useForm()
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentColor, setCurrentColor] = useState(generateRandomColor())
  const [importLoading, setImportLoading] = useState(false)

  const {
    loading,
    createProject,
    updateProject,
    fetchProject,
    currentProject
  } = useProjectStore()

  useEffect(() => {
    if (id) {
      setIsEditMode(true)
      loadProject(parseInt(id, 10))
    } else {
      // 新建模式，设置默认值
      form.setFieldsValue({
        color: currentColor,
        status: 'active'
      })
    }
  }, [id, form])

  // 设置网页标题
  useEffect(() => {
    if (isEditMode && currentProject) {
      document.title = t('pageTitle.editWithName', { name: currentProject.name })
    } else if (isEditMode) {
      document.title = t('pageTitle.edit')
    } else {
      document.title = t('pageTitle.create')
    }

    return () => {
      document.title = 'Todo for AI'
    }
  }, [isEditMode, currentProject, t])

  const loadProject = async (projectId: number) => {
    try {
      await fetchProject(projectId)
    } catch (error) {
      console.error('加载项目失败:', error)
      message.error(t('messages.loadFailed'))
    }
  }

  // 监听currentProject变化，更新表单数据
  useEffect(() => {
    if (isEditMode && currentProject) {
      form.setFieldsValue({
        name: currentProject.name,
        description: currentProject.description,
        color: currentProject.color,
        status: currentProject.status,
        github_url: currentProject.github_url,
        local_url: currentProject.local_url,
        production_url: currentProject.production_url,
        project_context: currentProject.project_context
      })
      setCurrentColor(currentProject.color)
    }
  }, [currentProject, isEditMode, form])

  const handleSubmit = async (values: any) => {
    try {
      const projectData: CreateProjectData | UpdateProjectData = {
        name: values.name,
        description: values.description || '',
        color: currentColor,
        status: values.status || 'active',
        github_url: values.github_url || '',
        local_url: values.local_url || '',
        production_url: values.production_url || '',
        project_context: values.project_context || ''
      }

      let success = false
      let createdProjectId: number | null = null

      if (isEditMode && id) {
        const result = await updateProject(parseInt(id, 10), projectData as UpdateProjectData)
        success = !!result
        if (success) {
          message.success(t('messages.updateSuccess'))
        }
      } else {
        const result = await createProject(projectData as CreateProjectData)
        success = !!result
        if (success) {
          createdProjectId = result.id
          message.success(t('messages.createSuccess'))
        }
      }

      if (success) {
        if (isEditMode && id) {
          // 编辑模式：跳转到项目详情页面
          navigate(`/todo-for-ai/pages/projects/${id}`)
        } else if (createdProjectId) {
          // 创建模式：跳转到新创建项目的详情页面
          navigate(`/todo-for-ai/pages/projects/${createdProjectId}`)
        } else {
          // 备用方案：跳转到项目列表页面
          navigate('/todo-for-ai/pages/projects')
        }
      }
    } catch (error) {
      console.error('保存项目失败:', error)
      message.error('保存项目失败')
    }
  }

  const handleRandomColor = () => {
    const newColor = generateRandomColor()
    setCurrentColor(newColor)
    form.setFieldsValue({ color: newColor })
  }

  const handleColorChange = (color: any) => {
    const colorValue = typeof color === 'string' ? color : color.toHexString()
    setCurrentColor(colorValue)
    form.setFieldsValue({ color: colorValue })
  }

  // 从GitHub URL解析owner和repo
  const parseGitHubUrl = (url: string) => {
    try {
      const regex = /github\.com\/([^\/]+)\/([^\/]+)/
      const match = url.match(regex)
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '') // 移除.git后缀
        }
      }
      return null
    } catch (error) {
      return null
    }
  }

  // 从GitHub导入项目信息
  const handleImportFromGitHub = async () => {
    const githubUrl = form.getFieldValue('github_url')
    if (!githubUrl) {
      message.warning('请先输入GitHub仓库链接')
      return
    }

    const parsed = parseGitHubUrl(githubUrl)
    if (!parsed) {
      message.error(t('github.parseError'))
      return
    }

    setImportLoading(true)
    try {
      // 调用GitHub API获取仓库信息
      const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`)

      if (!response.ok) {
        if (response.status === 404) {
          message.error(t('messages.repoNotFound'))
        } else {
          message.error(t('messages.repoInfoFailed'))
        }
        return
      }

      const repoData = await response.json()

      // 填充表单数据
      form.setFieldsValue({
        name: `${repoData.owner.login}/${repoData.name}`,
        description: repoData.description || '',
        github_url: githubUrl,
        production_url: repoData.homepage || ''
      })

      message.success(t('messages.importSuccess'))
    } catch (error) {
      console.error('GitHub导入失败:', error)
      message.error(t('messages.importFailed'))
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <HomeOutlined />
          <span onClick={() => navigate('/todo-for-ai/pages')} style={{ cursor: 'pointer', marginLeft: '8px' }}>
            {t('breadcrumb.home')}
          </span>
        </Breadcrumb.Item>
        {isEditMode ? (
          currentProject ? (
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
                onClick={() => navigate(`/todo-for-ai/pages/projects/${id}`)}
                style={{
                  cursor: 'pointer',
                  maxWidth: '200px',
                  display: 'inline-block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'bottom'
                }}
                title={currentProject.name}
              >
                {currentProject.name}
              </span>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{t('breadcrumb.edit')}</Breadcrumb.Item>
          </>
          ) : (
            <>
              <Breadcrumb.Item>
                <span
                  onClick={() => navigate('/todo-for-ai/pages/projects')}
                  style={{ cursor: 'pointer' }}
                >
                  {t('breadcrumb.projects')}
                </span>
              </Breadcrumb.Item>
              <Breadcrumb.Item>{t('breadcrumb.edit')}</Breadcrumb.Item>
            </>
          )
        ) : (
          <>
            <Breadcrumb.Item>
              <span
                onClick={() => navigate('/todo-for-ai/pages/projects')}
                style={{ cursor: 'pointer' }}
              >
                {t('breadcrumb.projects')}
              </span>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{t('breadcrumb.create')}</Breadcrumb.Item>
          </>
        )}
      </Breadcrumb>

      {/* 主要内容区域 - 居中布局 */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            {isEditMode ? t('title.edit') : t('title.create')}
          </Title>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title={t('sections.basicInfo')}>
              <Row gutter={[16, 16]}>
                <Col span={16}>
                  <Form.Item
                    label={t('form.name.label')}
                    name="name"
                    rules={[
                      { required: true, message: t('form.name.required') },
                      { max: 100, message: t('form.name.maxLength') }
                    ]}
                  >
                    <Input placeholder={t('form.name.placeholder')} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={t('form.color.label')} name="color">
                    <Space>
                      <ColorPicker
                        value={currentColor}
                        onChange={handleColorChange}
                        showText
                        presets={[
                          {
                            label: t('form.color.presetLabel'),
                            colors: PRESET_COLORS
                          }
                        ]}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRandomColor}
                        title={t('form.color.randomTitle')}
                      >
                        {t('form.color.randomButton')}
                      </Button>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label={t('form.description.label')} name="description">
                <TextArea
                  placeholder={t('form.description.placeholder')}
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </Form.Item>

              {/* 项目状态选择器 - 仅在编辑模式下显示 */}
              {isEditMode && (
                <Form.Item
                  label={t('form.status.label')}
                  name="status"
                  help={t('form.status.help')}
                  rules={[
                    { required: true, message: '请选择项目状态' }
                  ]}
                >
                  <Select placeholder="请选择项目状态">
                    <Option value="active">{t('form.status.options.active')}</Option>
                    <Option value="archived">{t('form.status.options.archived')}</Option>
                    <Option value="deleted">{t('form.status.options.deleted')}</Option>
                  </Select>
                </Form.Item>
              )}
            </Card>
          </Col>

          <Col span={24}>
            <Card title={t('sections.linkConfig')}>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item
                    label={t('form.githubUrl.label')}
                    name="github_url"
                    rules={[
                      { type: 'url', message: t('form.githubUrl.invalidUrl') }
                    ]}
                    help={t('form.githubUrl.help')}
                  >
                    <Input
                      placeholder={t('form.githubUrl.placeholder')}
                      prefix={<GithubOutlined />}
                      addonAfter={
                        <Button
                          type="primary"
                          icon={<ImportOutlined />}
                          loading={importLoading}
                          onClick={handleImportFromGitHub}
                          size="small"
                        >
                          {t('form.githubUrl.importButton')}
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('form.localUrl.label')}
                    name="local_url"
                    rules={[
                      { type: 'url', message: t('form.localUrl.invalidUrl') }
                    ]}
                    help={t('form.localUrl.help')}
                  >
                    <Input
                      placeholder={t('form.localUrl.placeholder')}
                      prefix={<LinkOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('form.productionUrl.label')}
                    name="production_url"
                    rules={[
                      { type: 'url', message: t('form.productionUrl.invalidUrl') }
                    ]}
                    help={t('form.productionUrl.help')}
                  >
                    <Input
                      placeholder={t('form.productionUrl.placeholder')}
                      prefix={<GlobalOutlined />}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={24}>
            <Card title={t('sections.projectContext')}>
              <Form.Item
                label={t('form.projectContext.label')}
                name="project_context"
                help={t('form.projectContext.help')}
              >
                <MarkdownEditor
                  value={form.getFieldValue('project_context') || ''}
                  onChange={(value) => form.setFieldsValue({ project_context: value })}
                  height={300}
                  placeholder={t('form.projectContext.placeholder')}
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Space size="large">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/todo-for-ai/pages/projects')}
              >
                {t('buttons.back')}
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

export default CreateProject
