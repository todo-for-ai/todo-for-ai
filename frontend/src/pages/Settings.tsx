import { useEffect } from 'react'
import { Typography, Card, Tabs, Form, Input, Button, Switch, Select } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography
const { TabPane } = Tabs
const { TextArea } = Input
const { Option } = Select

const Settings = () => {
  const [form] = Form.useForm()

  // 设置网页标题
  useEffect(() => {
    document.title = '系统设置 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

  const onFinish = (values: any) => {
    console.log('Settings saved:', values)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="page-title">
          系统设置
        </Title>
        <Paragraph className="page-description">
          配置系统参数和上下文规则
        </Paragraph>
      </div>

      <Tabs defaultActiveKey="general" type="card">
        <TabPane tab="通用设置" key="general">
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                theme: 'light',
                language: 'zh-CN',
                autoSave: true,
                notifications: true,
              }}
            >
              <Form.Item
                label="主题"
                name="theme"
              >
                <Select>
                  <Option value="light">浅色主题</Option>
                  <Option value="dark">深色主题</Option>
                  <Option value="auto">跟随系统</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="语言"
                name="language"
              >
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="自动保存"
                name="autoSave"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="桌面通知"
                name="notifications"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="上下文规则" key="context">
          <Card>
            <Form layout="vertical">
              <Form.Item
                label="全局上下文规则"
                help="这些规则将应用到所有AI交互中"
              >
                <TextArea
                  rows={8}
                  placeholder="输入全局上下文规则..."
                  defaultValue={`# 全局上下文规则

## 代码质量标准
- 所有代码必须通过单元测试
- 代码覆盖率不低于80%
- 遵循相应语言的编码规范
- 使用有意义的变量和函数名

## 沟通规范
- 使用清晰、具体的语言描述任务
- 包含必要的背景信息和上下文
- 明确指出期望的输出格式`}
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  保存规则
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="MCP配置" key="mcp">
          <Card>
            <Form layout="vertical">
              <Form.Item
                label="MCP服务器地址"
                name="mcpServerUrl"
                initialValue="http://localhost:8080"
              >
                <Input placeholder="输入MCP服务器地址" />
              </Form.Item>

              <Form.Item
                label="连接超时时间（秒）"
                name="timeout"
                initialValue={30}
              >
                <Input type="number" />
              </Form.Item>

              <Form.Item
                label="启用MCP服务"
                name="enableMcp"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="调试模式"
                name="debugMode"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default Settings
