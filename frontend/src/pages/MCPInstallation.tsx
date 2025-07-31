import React, { useEffect } from 'react'
import { Card, Tabs, Typography, Alert, Divider, Space, Tag } from 'antd'
import {
  ApiOutlined,
  DownloadOutlined,
  SettingOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  KeyOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { TabPane } = Tabs

const MCPInstallation: React.FC = () => {
  // 设置网页标题
  useEffect(() => {
    document.title = 'MCP安装文档 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

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
                  <Text>根据项目名称获取待办任务列表，支持状态筛选</Text>
                </div>
                <div>
                  <Tag color="green">get_task_by_id</Tag>
                  <Text>获取特定任务的详细信息，包括项目上下文规则</Text>
                </div>
                <div>
                  <Tag color="orange">submit_task_feedback</Tag>
                  <Text>提交任务反馈并更新任务状态，支持多种状态转换</Text>
                </div>
                <div>
                  <Tag color="purple">create_task</Tag>
                  <Text>在指定项目中创建新任务，支持优先级和标签设置</Text>
                </div>
                <div>
                  <Tag color="cyan">get_project_info</Tag>
                  <Text>获取项目详细信息，包括统计数据和配置</Text>
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
              <KeyOutlined />
              API Token
            </span>
          }
          key="api-token"
        >
          <Card>
            <Title level={3}>
              <KeyOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              API Token 配置
            </Title>

            <Alert
              message="重要提醒"
              description="从版本2.0开始，MCP服务器需要API Token进行身份认证，确保数据安全和访问控制。"
              type="warning"
              style={{ marginBottom: '24px' }}
              showIcon
            />

            <Title level={4}>1. 创建API Token</Title>
            <ol>
              <li>登录Todo for AI系统</li>
              <li>点击右上角用户头像，选择"个人中心"</li>
              <li>切换到"API Token"标签页</li>
              <li>点击"创建Token"按钮</li>
              <li>填写Token名称（如：MCP Client Token）</li>
              <li>设置过期时间（可选，留空表示永不过期）</li>
              <li>点击"创建Token"</li>
              <li><strong>重要：</strong>立即复制并保存Token，它只会显示一次</li>
            </ol>

            <Title level={4} style={{ marginTop: '24px' }}>2. 配置Token</Title>
            <Paragraph>
              将获取的API Token配置到MCP客户端中，有两种方式：
            </Paragraph>

            <Title level={5}>方式一：命令行参数（推荐）</Title>
            <div style={codeStyle}>
              node /path/to/your/todo-for-ai/todo-mcp/dist/index.js --api-token=tfa_your_token_here
            </div>

            <Title level={5}>方式二：环境变量</Title>
            <div style={codeStyle}>
              export TODO_API_TOKEN=tfa_your_token_here<br/>
              node /path/to/your/todo-for-ai/todo-mcp/dist/index.js
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>3. 权限说明</Title>
            <ul>
              <li><strong>项目访问：</strong>只能访问自己创建的项目</li>
              <li><strong>任务管理：</strong>可以创建、查看、更新自己项目中的任务</li>
              <li><strong>上下文规则：</strong>可以查看和应用项目的上下文规则</li>
              <li><strong>管理员：</strong>拥有所有项目和任务的访问权限</li>
            </ul>

            <Title level={4} style={{ marginTop: '24px' }}>4. 完整配置示例</Title>
            <Paragraph>
              以下是一个完整的Claude Desktop配置示例：
            </Paragraph>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "node",
      "args": [
        "/Users/cc11001100/github/ai-coding-labs/todo-for-ai/todo-mcp/dist/index.js"
      ],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "TODO_API_TOKEN": "AmXxPQulszHqGd_VbEiO748DSseIGJZppjtMI53lm84",
        "LOG_LEVEL": "info"
      }
    }
  }
}`}
            </div>

            <Alert
              message="安全提醒"
              description={
                <div>
                  <p>• 请妥善保管您的API Token，不要分享给他人</p>
                  <p>• 如果Token泄露，请立即在个人中心删除并重新创建</p>
                  <p>• 建议定期更换API Token以提高安全性</p>
                  <p>• 请将示例中的路径替换为你的实际项目路径</p>
                </div>
              }
              type="info"
              style={{ marginTop: '16px' }}
              showIcon
            />
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
            <Alert
              message="最新版本"
              description="现在可以直接从 npm 中央仓库安装，无需手动构建！"
              type="success"
              style={{ marginBottom: '16px' }}
              showIcon
            />
            <div style={codeStyle}>
              npm install -g @todo-for-ai/mcp
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>方法二：从源码安装</Title>
            <Paragraph>
              如果你需要最新的开发版本或想要自定义修改：
            </Paragraph>
            <div style={codeStyle}>
{`git clone https://github.com/todo-for-ai/todo-for-ai.git
cd todo-for-ai/todo-mcp
npm install
npm run build
npm link`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>验证安装</Title>
            <div style={codeStyle}>
              @todo-for-ai/mcp --version
            </div>

            <Paragraph style={{ marginTop: '16px' }}>
              或者如果使用全局安装的命令：
            </Paragraph>
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

            <Title level={4}>基础配置（使用npm包）</Title>
            <Alert
              message="推荐配置"
              description="使用npm包安装后，配置更加简单，无需指定复杂的路径。"
              type="info"
              style={{ marginBottom: '16px' }}
              showIcon
            />
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "@todo-for-ai/mcp",
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "LOG_LEVEL": "info"
      }
    }
  }
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>源码开发配置</Title>
            <Paragraph>
              如果你正在开发或使用源码版本：
            </Paragraph>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai-dev": {
      "command": "node",
      "args": [
        "/path/to/your/todo-for-ai/todo-mcp/dist/index.js"
      ],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "LOG_LEVEL": "debug"
      }
    }
  }
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>高级配置（带认证）</Title>
            <Alert
              message="API Token 认证"
              description={
                <div>
                  <p>从版本2.0开始，MCP服务器支持API Token认证，提供更安全的访问控制。</p>
                  <p>请在个人中心创建API Token，然后在配置中使用。</p>
                </div>
              }
              type="warning"
              style={{ marginBottom: '16px' }}
              showIcon
            />
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "@todo-for-ai/mcp",
      "args": [
        "--api-token=your-api-token-here"
      ],
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "LOG_LEVEL": "info"
      }
    }
  }
}`}
            </div>

            <Title level={5} style={{ marginTop: '16px' }}>或者使用环境变量方式：</Title>
            <div style={configStyle}>
{`{
  "mcpServers": {
    "todo-for-ai": {
      "command": "@todo-for-ai/mcp",
      "env": {
        "TODO_API_BASE_URL": "http://localhost:50110",
        "TODO_API_TOKEN": "your-api-token-here",
        "LOG_LEVEL": "info"
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
      "args": ["@todo-for-ai/mcp"],
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
      "command": "@todo-for-ai/mcp",
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
          "command": "@todo-for-ai/mcp",
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
      "command": "@todo-for-ai/mcp",
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
      "command": "@todo-for-ai/mcp",
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

            <Title level={5}>基础功能测试</Title>
            <ul>
              <li>询问AI助手："请获取'ToDo For AI'项目的任务列表"</li>
              <li>请求AI助手："帮我查看任务ID为233的详细信息"</li>
              <li>让AI助手："为任务233提交完成反馈"</li>
            </ul>

            <Title level={5}>高级功能测试</Title>
            <ul>
              <li>创建任务："在'ToDo For AI'项目中创建一个新的测试任务"</li>
              <li>项目信息："获取'ToDo For AI'项目的详细信息和统计数据"</li>
              <li>批量操作："获取所有待办状态的任务并逐个处理"</li>
            </ul>

            <Title level={5}>测试示例对话</Title>
            <div style={configStyle}>
{`用户: "请帮我获取ToDo For AI项目中所有待办任务"
AI: 我来为您获取ToDo For AI项目的待办任务...

用户: "请为任务ID 233提交完成反馈，说明已经完善了MCP文档"
AI: 我来为您提交任务反馈...

用户: "在ToDo For AI项目中创建一个新任务：优化前端性能"
AI: 我来为您创建新任务...`}
            </div>

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
