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
  Col
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  ReloadOutlined,
  GithubOutlined,
  LinkOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { useProjectStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { CreateProjectData, UpdateProjectData } from '../api/projects'

const { Title } = Typography
const { TextArea } = Input

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
  const [form] = Form.useForm()
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentColor, setCurrentColor] = useState(generateRandomColor())

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
  }, [id, form, currentColor])

  // 设置网页标题
  useEffect(() => {
    const pageTitle = isEditMode ? '编辑项目' : '创建项目'
    if (isEditMode && currentProject) {
      document.title = `${currentProject.name} - ${pageTitle} - Todo for AI`
    } else {
      document.title = `${pageTitle} - Todo for AI`
    }
    
    return () => {
      document.title = 'Todo for AI'
    }
  }, [isEditMode, currentProject])

  const loadProject = async (projectId: number) => {
    try {
      await fetchProject(projectId)
      if (currentProject) {
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
    } catch (error) {
      console.error('加载项目失败:', error)
      message.error('加载项目失败')
    }
  }

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
      if (isEditMode && id) {
        const result = await updateProject(parseInt(id, 10), projectData as UpdateProjectData)
        success = !!result
        if (success) {
          message.success('项目更新成功')
        }
      } else {
        const result = await createProject(projectData as CreateProjectData)
        success = !!result
        if (success) {
          message.success('项目创建成功')
        }
      }

      if (success) {
        navigate('/todo-for-ai/pages/projects')
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

  return (
    <div className="page-container">
      {/* 面包屑导航 */}
      <Card style={{ marginBottom: '16px' }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <HomeOutlined />
            <span onClick={() => navigate('/todo-for-ai/pages')} style={{ cursor: 'pointer', marginLeft: '8px' }}>
              首页
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <span
              onClick={() => navigate('/todo-for-ai/pages/projects')}
              style={{ cursor: 'pointer' }}
            >
              项目列表
            </span>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{isEditMode ? '编辑项目' : '创建项目'}</Breadcrumb.Item>
        </Breadcrumb>
      </Card>

      <div className="page-header">
        <Title level={2} className="page-title">
          {isEditMode ? '编辑项目' : '创建项目'}
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: '800px' }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="基本信息">
              <Row gutter={[16, 16]}>
                <Col span={16}>
                  <Form.Item
                    label="项目名称"
                    name="name"
                    rules={[
                      { required: true, message: '请输入项目名称' },
                      { max: 100, message: '项目名称不能超过100个字符' }
                    ]}
                  >
                    <Input placeholder="请输入项目名称" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="项目颜色" name="color">
                    <Space>
                      <ColorPicker
                        value={currentColor}
                        onChange={handleColorChange}
                        showText
                        presets={[
                          {
                            label: '推荐颜色',
                            colors: PRESET_COLORS
                          }
                        ]}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={handleRandomColor}
                        title="随机颜色"
                      >
                        随机
                      </Button>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="项目描述" name="description">
                <TextArea
                  placeholder="请输入项目描述"
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="链接配置">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item
                    label="GitHub仓库链接"
                    name="github_url"
                    rules={[
                      { type: 'url', message: '请输入有效的URL' }
                    ]}
                  >
                    <Input
                      placeholder="https://github.com/username/repository"
                      prefix={<GithubOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="本地开发链接"
                    name="local_url"
                    rules={[
                      { type: 'url', message: '请输入有效的URL' }
                    ]}
                  >
                    <Input
                      placeholder="http://localhost:3000"
                      prefix={<LinkOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="生产环境链接"
                    name="production_url"
                    rules={[
                      { type: 'url', message: '请输入有效的URL' }
                    ]}
                  >
                    <Input
                      placeholder="https://example.com"
                      prefix={<GlobalOutlined />}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="项目上下文">
              <Form.Item
                label="项目上下文信息"
                name="project_context"
                help="使用Markdown格式描述项目的详细信息、技术栈、开发规范等"
              >
                <MarkdownEditor
                  value={form.getFieldValue('project_context') || ''}
                  onChange={(value) => form.setFieldsValue({ project_context: value })}
                  height={300}
                  placeholder="请输入项目上下文信息..."
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
              返回项目列表
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              {isEditMode ? '更新项目' : '创建项目'}
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  )
}

export default CreateProject
