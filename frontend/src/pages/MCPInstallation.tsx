import React from 'react'
import { Card, Tabs, Typography, Alert, Divider, Space, Tag } from 'antd'
import { 
  ApiOutlined, 
  DownloadOutlined, 
  SettingOutlined, 
  CodeOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { TabPane } = Tabs

const MCPInstallation: React.FC = () => {
  const codeStyle = {
    backgroundColor: '#f6f8fa',
    padding: '12px',
    borderRadius: '6px',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    fontSize: '13px',
    lineHeight: '1.45',
    overflow: 'auto'
  }

  const configStyle = {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e1e4e8',
    borderRadius: '6px',
    padding: '16px',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    fontSize: '13px',
    lineHeight: '1.45',
    whiteSpace: 'pre-wrap' as const,
    overflow: 'auto'
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ApiOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          MCP 安装文档
        </Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          Model Context Protocol (MCP) 是一个标准化协议，允许AI助手与外部系统进行交互。
          本文档详细介绍如何在不同的AI IDE中安装和配置Todo for AI的MCP服务器。
        </Paragraph>
      </div>

      <Alert
        message="重要提示"
        description="在配置MCP之前，请确保Todo for AI后端服务正在运行，默认地址为 http://localhost:50110"
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: '24px' }}
        showIcon
      />

      <Tabs defaultActiveKey="overview" size="large">
        <TabPane 
          tab={
            <span>
              <InfoCircleOutlined />
              概述
            </span>
          } 
          key="overview"
        >
          <Card>
            <Title level={3}>MCP 功能概述</Title>
            <Paragraph>
              Todo for AI 的 MCP 服务器提供以下核心功能：
            </Paragraph>
            
            <div style={{ marginBottom: '24px' }}>
              <Title level={4}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                支持的工具
              </Title>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Tag color="blue">get_project_tasks_by_name</Tag>
                  <Text>根据项目名称获取待办任务列表</Text>
                </div>
                <div>
                  <Tag color="green">get_task_by_id</Tag>
                  <Text>获取特定任务的详细信息</Text>
                </div>
                <div>
                  <Tag color="orange">submit_task_feedback</Tag>
                  <Text>提交任务反馈并更新任务状态</Text>
                </div>
              </Space>
            </div>

            <Divider />

            <Title level={4}>
              <SettingOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              配置要求
            </Title>
            <ul>
              <li>Node.js 18+ 环境</li>
              <li>Todo for AI 后端服务运行中</li>
              <li>支持MCP协议的AI IDE（Claude Desktop、Cursor等）</li>
              <li>网络连接到Todo API服务器</li>
            </ul>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <DownloadOutlined />
              安装步骤
            </span>
          } 
          key="installation"
        >
          <Card>
            <Title level={3}>MCP 服务器安装</Title>
            
            <Title level={4}>方法一：从 npm 安装（推荐）</Title>
            <div style={codeStyle}>
              npm install -g todo-for-ai-mcp
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>方法二：从源码安装</Title>
            <div style={codeStyle}>
{`git clone https://github.com/todo-for-ai/todo-for-ai.git
cd todo-for-ai/todo-mcp
npm install
npm run build
npm link`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>验证安装</Title>
            <div style={codeStyle}>
              todo-for-ai-mcp --version
            </div>

            <Alert
              message="安装提示"
              description="如果使用从源码安装的方式，请确保在项目根目录下执行命令。"
              type="warning"
              style={{ marginTop: '16px' }}
              showIcon
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <CodeOutlined />
              Claude Desktop
            </span>
          } 
          key="claude"
        >
          <Card>
            <Title level={3}>Claude Desktop 配置</Title>
            
            <Paragraph>
              Claude Desktop 是 Anthropic 官方的桌面应用程序，支持MCP协议集成。
            </Paragraph>

            <Title level={4}>配置文件位置</Title>
            <ul>
              <li><strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
              <li><strong>Windows:</strong> <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
              <li><strong>Linux:</strong> <code>~/.config/Claude/claude_desktop_config.json</code></li>
            </ul>

            <Title level={4}>配置内容</Title>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "todo-for-ai-mcp",
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "LOG_LEVEL": "info"
      }
    }
  }
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>高级配置（带认证）</Title>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "todo-for-ai-mcp",
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "TODO_API_TOKEN": "your-api-token",
        "TODO_API_TIMEOUT": "15000",
        "LOG_LEVEL": "debug"
      }
    }
  }
}`}
            </div>

            <Alert
              message="重启提醒"
              description="修改配置文件后，需要重启Claude Desktop应用程序才能生效。"
              type="info"
              style={{ marginTop: '16px' }}
              showIcon
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <CodeOutlined />
              Cursor IDE
            </span>
          } 
          key="cursor"
        >
          <Card>
            <Title level={3}>Cursor IDE 配置</Title>
            
            <Paragraph>
              Cursor 是一个基于VS Code的AI代码编辑器，支持MCP协议扩展。
            </Paragraph>

            <Title level={4}>配置方法</Title>
            <Paragraph>
              1. 打开 Cursor IDE<br/>
              2. 按 <code>Cmd/Ctrl + Shift + P</code> 打开命令面板<br/>
              3. 搜索并选择 "Preferences: Open Settings (JSON)"<br/>
              4. 添加以下MCP配置：
            </Paragraph>

            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": ["todo-for-ai-mcp"],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "LOG_LEVEL": "info"
      }
    }
  }
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>本地开发配置</Title>
            <Paragraph>
              如果你正在本地开发Todo for AI，可以使用以下配置：
            </Paragraph>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai-local": {
      "command": "node",
      "args": ["/path/to/todo-for-ai/todo-mcp/dist/index.js"],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "LOG_LEVEL": "debug"
      }
    }
  }
}`}
            </div>

            <Alert
              message="路径提醒"
              description="请将 /path/to/todo-for-ai 替换为你的实际项目路径。"
              type="warning"
              style={{ marginTop: '16px' }}
              showIcon
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CodeOutlined />
              其他 IDE
            </span>
          }
          key="other-ides"
        >
          <Card>
            <Title level={3}>其他 AI IDE 配置</Title>

            <Title level={4}>Continue.dev</Title>
            <Paragraph>
              Continue 是一个开源的AI代码助手，支持多种IDE集成。
            </Paragraph>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "todo-for-ai-mcp",
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110"
      }
    }
  }
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>Zed Editor</Title>
            <Paragraph>
              Zed 是一个高性能的代码编辑器，正在添加MCP支持。
            </Paragraph>
            <div style={configStyle}>
{`// 在 ~/.config/zed/settings.json 中添加
{
  "experimental": {
    "mcp": {
      "servers": {
        "todo-for-ai": {
          "command": "todo-for-ai-mcp",
          "env": {
            "TODO_API_BASE_URL": "http://localhost:50110"
          }
        }
      }
    }
  }
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>通用配置模板</Title>
            <Paragraph>
              对于其他支持MCP的IDE，可以参考以下通用配置模板：
            </Paragraph>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "todo-for-ai-mcp",
      "args": [],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "TODO_API_TIMEOUT": "10000",
        "LOG_LEVEL": "info"
      }
    }
  }
}`}
            </div>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              配置参数
            </span>
          }
          key="configuration"
        >
          <Card>
            <Title level={3}>配置参数详解</Title>

            <Title level={4}>环境变量</Title>
            <div style={{ marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ padding: '12px', border: '1px solid #d9d9d9', textAlign: 'left' }}>参数名</th>
                    <th style={{ padding: '12px', border: '1px solid #d9d9d9', textAlign: 'left' }}>必需</th>
                    <th style={{ padding: '12px', border: '1px solid #d9d9d9', textAlign: 'left' }}>默认值</th>
                    <th style={{ padding: '12px', border: '1px solid #d9d9d9', textAlign: 'left' }}>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>TODO_API_BASE_URL</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>是</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>-</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>Todo API 服务器地址</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>TODO_API_TOKEN</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>否</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>""</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>API 认证令牌</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>TODO_API_TIMEOUT</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>否</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>10000</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>API 请求超时时间（毫秒）</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>LOG_LEVEL</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>否</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>info</td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>日志级别（debug, info, warn, error）</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Title level={4}>配置文件示例</Title>
            <Paragraph>
              除了环境变量，你也可以创建 <code>config.json</code> 文件：
            </Paragraph>
            <div style={configStyle}>
{`{
  "apiBaseUrl": "http://localhost:50110",
  "apiTimeout": 10000,
  "apiToken": "",
  "logLevel": "info"
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>生产环境配置</Title>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "todo-for-ai-mcp",
      "env": {
        "TODO_API_BASE_URL": "https://your-domain.com",
        "TODO_API_TOKEN": "your-production-token",
        "TODO_API_TIMEOUT": "15000",
        "LOG_LEVEL": "warn",
        "NODE_ENV": "production"
      }
    }
  }
}`}
            </div>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CheckCircleOutlined />
              测试验证
            </span>
          }
          key="testing"
        >
          <Card>
            <Title level={3}>测试和验证</Title>

            <Title level={4}>1. 检查服务状态</Title>
            <Paragraph>
              首先确认Todo for AI后端服务正在运行：
            </Paragraph>
            <div style={codeStyle}>
              curl http://localhost:50110/api/health
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>2. 测试MCP连接</Title>
            <Paragraph>
              使用内置的测试脚本验证MCP服务器：
            </Paragraph>
            <div style={codeStyle}>
{`# 进入todo-mcp目录
cd todo-mcp

# 运行测试脚本
node test-mcp.js

# 或者运行验证脚本
node verify.js`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>3. IDE中测试</Title>
            <Paragraph>
              在配置好的AI IDE中，尝试以下操作来验证MCP功能：
            </Paragraph>
            <ul>
              <li>询问AI助手："请获取Todo for AI项目的任务列表"</li>
              <li>请求AI助手："帮我查看任务ID为1的详细信息"</li>
              <li>让AI助手："为项目创建一个新的测试任务"</li>
            </ul>

            <Title level={4} style={{ marginTop: '24px' }}>4. 常见问题排查</Title>
            <div style={{ marginBottom: '16px' }}>
              <Title level={5}>连接失败</Title>
              <ul>
                <li>检查 <code>TODO_API_BASE_URL</code> 是否正确</li>
                <li>确认Todo后端服务正在运行</li>
                <li>检查网络连接和防火墙设置</li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Title level={5}>认证错误</Title>
              <ul>
                <li>验证 <code>TODO_API_TOKEN</code> 是否有效</li>
                <li>检查API令牌权限设置</li>
                <li>确认令牌格式正确</li>
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Title level={5}>工具未找到</Title>
              <ul>
                <li>重启AI IDE应用程序</li>
                <li>检查MCP配置文件语法</li>
                <li>确认MCP服务器已正确安装</li>
              </ul>
            </div>

            <Alert
              message="调试提示"
              description="如果遇到问题，可以设置 LOG_LEVEL=debug 来获取详细的调试信息。"
              type="info"
              style={{ marginTop: '16px' }}
              showIcon
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default MCPInstallation
