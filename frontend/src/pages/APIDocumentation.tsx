import React, { useState, useEffect } from 'react'
import { Card, Tabs, Typography, Alert, Divider, Space, Tag, Button, message } from 'antd'
import {
  ApiOutlined,
  KeyOutlined,
  DatabaseOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

const { Title, Paragraph, Text } = Typography
const { TabPane } = Tabs

const APIDocumentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')

  // const codeStyle = {
  //   backgroundColor: '#f6f8fa',
  //   padding: '12px',
  //   borderRadius: '6px',
  //   fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  //   fontSize: '13px',
  //   lineHeight: '1.45',
  //   overflow: 'auto',
  //   position: 'relative' as const
  // }

  const jsonStyle = {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }

  const CodeBlock = ({
    children,
    copyable = true,
    language = 'bash'
  }: {
    children: string,
    copyable?: boolean,
    language?: string
  }) => (
    <div style={{ position: 'relative' }}>
      <SyntaxHighlighter
        language={language}
        style={tomorrow}
        customStyle={{
          backgroundColor: '#f6f8fa',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '13px',
          lineHeight: '1.45',
          margin: 0
        }}
        showLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
      >
        {children}
      </SyntaxHighlighter>
      {copyable && (
        <Button
          type="text"
          icon={<CopyOutlined />}
          size="small"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            opacity: 0.7,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}
          onClick={() => copyToClipboard(children)}
        />
      )}
    </div>
  )

  // 设置网页标题
  useEffect(() => {
    document.title = 'HTTP API文档 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ApiOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          HTTP API 文档
        </Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          Todo for AI 提供完整的 RESTful API，支持通过 HTTP 请求进行任务管理、项目管理等操作。
          本文档详细介绍如何使用 API Token 进行身份验证，以及各个接口的使用方法。
        </Paragraph>
      </div>

      <Alert
        message="API 基础信息"
        description={
          <div>
            <p><strong>基础 URL:</strong> http://localhost:50110/todo-for-ai/api/v1</p>
            <p><strong>认证方式:</strong> Bearer Token</p>
            <p><strong>数据格式:</strong> JSON</p>
            <p><strong>字符编码:</strong> UTF-8</p>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: '24px' }}
        showIcon
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
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
            <Title level={3}>API 概述</Title>
            
            <Title level={4}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
              支持的功能
            </Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Tag color="blue" icon={<ProjectOutlined />}>项目管理</Tag>
                <Text>创建、查看、更新、删除项目</Text>
              </div>
              <div>
                <Tag color="green" icon={<CheckSquareOutlined />}>任务管理</Tag>
                <Text>创建、查看、更新、删除任务</Text>
              </div>
              <div>
                <Tag color="orange" icon={<SettingOutlined />}>上下文规则</Tag>
                <Text>管理项目和全局上下文规则</Text>
              </div>
              <div>
                <Tag color="purple" icon={<KeyOutlined />}>Token 管理</Tag>
                <Text>创建、管理 API 访问令牌</Text>
              </div>
            </Space>

            <Divider />

            <Title level={4}>
              <DatabaseOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              响应格式
            </Title>
            <Paragraph>所有 API 响应都遵循统一的格式：</Paragraph>
            
            <Title level={5}>成功响应</Title>
            <div style={jsonStyle}>
{`{
  "success": true,
  "message": "Success",
  "timestamp": "2025-07-29T08:00:00.000Z",
  "path": "/todo-for-ai/api/v1/projects",
  "data": {
    // 具体数据内容
  }
}`}
            </div>

            <Title level={5} style={{ marginTop: '16px' }}>错误响应</Title>
            <div style={jsonStyle}>
{`{
  "success": false,
  "error": {
    "message": "Error description",
    "status_code": 400,
    "timestamp": "2025-07-29T08:00:00.000Z",
    "path": "/todo-for-ai/api/v1/projects",
    "code": "ERROR_CODE",
    "details": {
      // 错误详情
    }
  }
}`}
            </div>

            <Title level={4} style={{ marginTop: '24px' }}>
              <KeyOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
              状态码说明
            </Title>
            <div style={{ marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ padding: '12px', border: '1px solid #d9d9d9', textAlign: 'left' }}>状态码</th>
                    <th style={{ padding: '12px', border: '1px solid #d9d9d9', textAlign: 'left' }}>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>200</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>请求成功</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>201</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>创建成功</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>400</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>请求参数错误</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>401</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>未授权（Token 无效或过期）</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>404</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>资源不存在</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}><code>500</code></td>
                    <td style={{ padding: '12px', border: '1px solid #d9d9d9' }}>服务器内部错误</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <KeyOutlined />
              身份验证
            </span>
          } 
          key="authentication"
        >
          <Card>
            <Title level={3}>API Token 身份验证</Title>
            
            <Paragraph>
              Todo for AI API 使用 Bearer Token 进行身份验证。您需要先创建 API Token，然后在请求头中包含该 Token。
            </Paragraph>

            <Title level={4}>1. 创建 API Token</Title>
            <Paragraph>
              首先，您需要通过管理员账户创建 API Token：
            </Paragraph>
            
            <CodeBlock language="bash">
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/tokens \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "name": "External Integration",
    "description": "Token for external system integration",
    "expires_days": 365
  }'`}
            </CodeBlock>

            <Title level={4} style={{ marginTop: '24px' }}>2. 使用 Token 进行请求</Title>
            <Paragraph>
              在所有 API 请求的 Header 中包含 Authorization 字段：
            </Paragraph>
            
            <CodeBlock language="text">
{`Authorization: Bearer your_api_token_here`}
            </CodeBlock>

            <Title level={4} style={{ marginTop: '24px' }}>3. 完整请求示例</Title>
            <CodeBlock language="bash">
{`curl -X GET http://localhost:50110/todo-for-ai/api/v1/projects \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."`}
            </CodeBlock>

            <Title level={4} style={{ marginTop: '24px' }}>4. Token 验证</Title>
            <Paragraph>
              您可以验证 Token 是否有效：
            </Paragraph>
            
            <CodeBlock language="bash">
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/tokens/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "your_api_token_here"
  }'`}
            </CodeBlock>

            <Alert
              message="安全提醒"
              description="请妥善保管您的 API Token，不要在客户端代码中硬编码 Token。建议定期更换 Token 以确保安全。"
              type="warning"
              style={{ marginTop: '16px' }}
              showIcon
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <ProjectOutlined />
              项目 API
            </span>
          } 
          key="projects"
        >
          <Card>
            <Title level={3}>项目管理 API</Title>
            
            <Title level={4}>获取项目列表</Title>
            <Paragraph><strong>GET</strong> <code>/todo-for-ai/api/v1/projects</code></Paragraph>
            
            <Title level={5}>查询参数</Title>
            <ul>
              <li><code>page</code> (int): 页码，默认 1</li>
              <li><code>per_page</code> (int): 每页数量，默认 20，最大 100</li>
              <li><code>search</code> (string): 搜索关键词</li>
              <li><code>status</code> (string): 项目状态 (active, archived)</li>
              <li><code>archived</code> (boolean): 是否归档</li>
            </ul>

            <Title level={5}>请求示例</Title>
            <CodeBlock language="bash">
{`curl -X GET "http://localhost:50110/todo-for-ai/api/v1/projects?page=1&per_page=10&status=active" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>

            <Title level={5}>响应示例</Title>
            <div style={jsonStyle}>
{`{
  "success": true,
  "message": "Success",
  "timestamp": "2025-07-29T08:00:00.000Z",
  "path": "/todo-for-ai/api/v1/projects",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Todo for AI",
        "description": "AI任务管理系统",
        "status": "active",
        "color": "#1890ff",
        "created_at": "2025-07-29T08:00:00.000Z",
        "updated_at": "2025-07-29T08:00:00.000Z",
        "task_count": 5,
        "completed_task_count": 2
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 10,
      "total": 1,
      "pages": 1,
      "has_prev": false,
      "has_next": false
    }
  }
}`}
            </div>

            <Divider />

            <Title level={4}>创建项目</Title>
            <Paragraph><strong>POST</strong> <code>/todo-for-ai/api/v1/projects</code></Paragraph>
            
            <Title level={5}>请求体</Title>
            <div style={jsonStyle}>
{`{
  "name": "新项目",
  "description": "项目描述",
  "color": "#52c41a"
}`}
            </div>

            <Title level={5}>请求示例</Title>
            <CodeBlock language="bash">
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/projects \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "name": "新项目",
    "description": "项目描述",
    "color": "#52c41a"
  }'`}
            </CodeBlock>

            <Divider />

            <Title level={4}>获取项目详情</Title>
            <Paragraph><strong>GET</strong> <code>/todo-for-ai/api/v1/projects/{`{id}`}</code></Paragraph>
            
            <Title level={5}>请求示例</Title>
            <CodeBlock language="bash">
{`curl -X GET http://localhost:50110/todo-for-ai/api/v1/projects/1 \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>

            <Divider />

            <Title level={4}>更新项目</Title>
            <Paragraph><strong>PUT</strong> <code>/todo-for-ai/api/v1/projects/{`{id}`}</code></Paragraph>
            
            <Title level={5}>请求示例</Title>
            <CodeBlock language="bash">
{`curl -X PUT http://localhost:50110/todo-for-ai/api/v1/projects/1 \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "name": "更新后的项目名称",
    "description": "更新后的描述"
  }'`}
            </CodeBlock>

            <Divider />

            <Title level={4}>删除项目</Title>
            <Paragraph><strong>DELETE</strong> <code>/todo-for-ai/api/v1/projects/{`{id}`}</code></Paragraph>
            
            <Title level={5}>请求示例</Title>
            <CodeBlock language="bash">
{`curl -X DELETE http://localhost:50110/todo-for-ai/api/v1/projects/1 \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CheckSquareOutlined />
              任务 API
            </span>
          }
          key="tasks"
        >
          <Card>
            <Title level={3}>任务管理 API</Title>

            <Title level={4}>获取任务列表</Title>
            <Paragraph><strong>GET</strong> <code>/todo-for-ai/api/v1/tasks</code></Paragraph>

            <Title level={5}>查询参数</Title>
            <ul>
              <li><code>page</code> (int): 页码，默认 1</li>
              <li><code>per_page</code> (int): 每页数量，默认 20，最大 100</li>
              <li><code>search</code> (string): 搜索关键词</li>
              <li><code>project_id</code> (int): 项目ID筛选</li>
              <li><code>status</code> (string): 任务状态 (todo, in_progress, review, done, cancelled)</li>
              <li><code>priority</code> (string): 优先级 (low, medium, high, urgent)</li>
              <li><code>assignee</code> (string): 分配人筛选</li>
              <li><code>sort_by</code> (string): 排序字段，默认 created_at</li>
              <li><code>sort_order</code> (string): 排序方向 (asc, desc)，默认 desc</li>
            </ul>

            <Title level={5}>请求示例</Title>
            <CodeBlock language="bash">
{`curl -X GET "http://localhost:50110/todo-for-ai/api/v1/tasks?project_id=1&status=todo&priority=high" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>

            <Title level={5}>响应示例</Title>
            <div style={jsonStyle}>
{`{
  "success": true,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "实现用户认证",
        "description": "实现JWT认证系统",
        "content": "# 用户认证实现\\n\\n## 需求\\n- JWT token生成\\n- 登录/注销功能",
        "status": "todo",
        "priority": "high",
        "assignee": "开发团队",
        "project_id": 1,
        "project_name": "Todo for AI",
        "created_at": "2025-07-29T08:00:00.000Z",
        "updated_at": "2025-07-29T08:00:00.000Z",
        "due_date": null,
        "completion_rate": 0,
        "tags": ["认证", "安全"]
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 1,
      "pages": 1,
      "has_prev": false,
      "has_next": false
    }
  }
}`}
            </div>

            <Divider />

            <Title level={4}>创建任务</Title>
            <Paragraph><strong>POST</strong> <code>/todo-for-ai/api/v1/tasks</code></Paragraph>

            <Title level={5}>请求体</Title>
            <div style={jsonStyle}>
{`{
  "title": "新任务标题",
  "description": "任务描述",
  "content": "# 任务详细内容\\n\\n使用Markdown格式",
  "project_id": 1,
  "status": "todo",
  "priority": "medium",
  "assignee": "开发者",
  "due_date": "2025-08-01T00:00:00.000Z",
  "tags": ["标签1", "标签2"]
}`}
            </div>

            <Title level={5}>请求示例</Title>
            <CodeBlock language="bash">
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/tasks \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "title": "新任务标题",
    "description": "任务描述",
    "project_id": 1,
    "status": "todo",
    "priority": "medium"
  }'`}
            </CodeBlock>

            <Divider />

            <Title level={4}>获取任务详情</Title>
            <Paragraph><strong>GET</strong> <code>/todo-for-ai/api/v1/tasks/{`{id}`}</code></Paragraph>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X GET http://localhost:50110/todo-for-ai/api/v1/tasks/1 \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>

            <Divider />

            <Title level={4}>更新任务</Title>
            <Paragraph><strong>PUT</strong> <code>/todo-for-ai/api/v1/tasks/{`{id}`}</code></Paragraph>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X PUT http://localhost:50110/todo-for-ai/api/v1/tasks/1 \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "status": "in_progress",
    "priority": "urgent",
    "completion_rate": 30
  }'`}
            </CodeBlock>

            <Divider />

            <Title level={4}>删除任务</Title>
            <Paragraph><strong>DELETE</strong> <code>/todo-for-ai/api/v1/tasks/{`{id}`}</code></Paragraph>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X DELETE http://localhost:50110/todo-for-ai/api/v1/tasks/1 \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>

            <Divider />

            <Title level={4}>批量更新任务状态</Title>
            <Paragraph><strong>PATCH</strong> <code>/todo-for-ai/api/v1/tasks/batch</code></Paragraph>

            <Title level={5}>请求体</Title>
            <div style={jsonStyle}>
{`{
  "task_ids": [1, 2, 3],
  "updates": {
    "status": "done",
    "assignee": "新分配人"
  }
}`}
            </div>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X PATCH http://localhost:50110/todo-for-ai/api/v1/tasks/batch \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "task_ids": [1, 2, 3],
    "updates": {
      "status": "done"
    }
  }'`}
            </CodeBlock>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined />
              上下文规则 API
            </span>
          }
          key="context-rules"
        >
          <Card>
            <Title level={3}>上下文规则管理 API</Title>

            <Title level={4}>获取上下文规则列表</Title>
            <Paragraph><strong>GET</strong> <code>/todo-for-ai/api/v1/context-rules</code></Paragraph>

            <Title level={5}>查询参数</Title>
            <ul>
              <li><code>page</code> (int): 页码，默认 1</li>
              <li><code>per_page</code> (int): 每页数量，默认 20</li>
              <li><code>project_id</code> (int): 项目ID筛选</li>
              <li><code>rule_type</code> (string): 规则类型 (global, project)</li>
              <li><code>is_active</code> (boolean): 是否激活</li>
            </ul>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X GET "http://localhost:50110/todo-for-ai/api/v1/context-rules?project_id=1" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>

            <Divider />

            <Title level={4}>创建上下文规则</Title>
            <Paragraph><strong>POST</strong> <code>/todo-for-ai/api/v1/context-rules</code></Paragraph>

            <Title level={5}>请求体</Title>
            <div style={jsonStyle}>
{`{
  "name": "代码质量标准",
  "description": "项目代码质量要求",
  "content": "# 代码质量标准\\n\\n## 通用要求\\n- 所有代码必须通过单元测试",
  "rule_type": "project",
  "project_id": 1,
  "is_active": true,
  "priority": 1
}`}
            </div>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/context-rules \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "name": "代码质量标准",
    "content": "# 代码质量标准\\n\\n## 通用要求\\n- 所有代码必须通过单元测试",
    "rule_type": "project",
    "project_id": 1
  }'`}
            </CodeBlock>

            <Divider />

            <Title level={4}>获取合并后的上下文规则</Title>
            <Paragraph><strong>GET</strong> <code>/todo-for-ai/api/v1/context-rules/merged</code></Paragraph>
            <Paragraph>
              此接口返回指定项目的全局规则和项目规则合并后的结果，按优先级排序。
            </Paragraph>

            <Title level={5}>查询参数</Title>
            <ul>
              <li><code>project_id</code> (int): 项目ID</li>
            </ul>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X GET "http://localhost:50110/todo-for-ai/api/v1/context-rules/merged?project_id=1" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
            </CodeBlock>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <KeyOutlined />
              Token 管理 API
            </span>
          }
          key="tokens"
        >
          <Card>
            <Title level={3}>API Token 管理</Title>

            <Title level={4}>获取 Token 列表</Title>
            <Paragraph><strong>GET</strong> <code>/todo-for-ai/api/v1/tokens</code></Paragraph>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X GET http://localhost:50110/todo-for-ai/api/v1/tokens \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"`}
            </CodeBlock>

            <Divider />

            <Title level={4}>创建 Token</Title>
            <Paragraph><strong>POST</strong> <code>/todo-for-ai/api/v1/tokens</code></Paragraph>

            <Title level={5}>请求体</Title>
            <div style={jsonStyle}>
{`{
  "name": "External Integration",
  "description": "用于外部系统集成的Token",
  "expires_days": 365
}`}
            </div>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/tokens \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "name": "External Integration",
    "description": "用于外部系统集成的Token",
    "expires_days": 365
  }'`}
            </CodeBlock>

            <Title level={5}>响应示例</Title>
            <div style={jsonStyle}>
{`{
  "id": 1,
  "name": "External Integration",
  "description": "用于外部系统集成的Token",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_prefix": "eyJ0eXA...",
  "expires_at": "2026-07-29T08:00:00.000Z",
  "is_active": true,
  "created_at": "2025-07-29T08:00:00.000Z"
}`}
            </div>

            <Alert
              message="重要提醒"
              description="完整的 Token 只在创建时返回一次，请妥善保存。后续查询只会返回 Token 前缀。"
              type="warning"
              style={{ marginTop: '16px' }}
              showIcon
            />

            <Divider />

            <Title level={4}>验证 Token</Title>
            <Paragraph><strong>POST</strong> <code>/todo-for-ai/api/v1/tokens/verify</code></Paragraph>

            <Title level={5}>请求体</Title>
            <div style={jsonStyle}>
{`{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}`}
            </div>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/tokens/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }'`}
            </CodeBlock>

            <Divider />

            <Title level={4}>续期 Token</Title>
            <Paragraph><strong>POST</strong> <code>/todo-for-ai/api/v1/tokens/{`{id}`}/renew</code></Paragraph>

            <Title level={5}>请求体</Title>
            <div style={jsonStyle}>
{`{
  "expires_days": 180
}`}
            </div>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X POST http://localhost:50110/todo-for-ai/api/v1/tokens/1/renew \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "expires_days": 180
  }'`}
            </CodeBlock>

            <Divider />

            <Title level={4}>停用 Token</Title>
            <Paragraph><strong>DELETE</strong> <code>/todo-for-ai/api/v1/tokens/{`{id}`}</code></Paragraph>

            <Title level={5}>请求示例</Title>
            <CodeBlock>
{`curl -X DELETE http://localhost:50110/todo-for-ai/api/v1/tokens/1 \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"`}
            </CodeBlock>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <CodeOutlined />
              SDK 示例
            </span>
          }
          key="sdk-examples"
        >
          <Card>
            <Title level={3}>SDK 和代码示例</Title>

            <Title level={4}>Python 示例</Title>
            <CodeBlock language="python">
{`import requests
import json

class TodoAPIClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def get_projects(self, **params):
        """获取项目列表"""
        response = requests.get(
            f'{self.base_url}/projects',
            headers=self.headers,
            params=params
        )
        return response.json()

    def create_task(self, task_data):
        """创建任务"""
        response = requests.post(
            f'{self.base_url}/tasks',
            headers=self.headers,
            json=task_data
        )
        return response.json()

    def update_task_status(self, task_id, status):
        """更新任务状态"""
        response = requests.put(
            f'{self.base_url}/tasks/{task_id}',
            headers=self.headers,
            json={'status': status}
        )
        return response.json()

# 使用示例
client = TodoAPIClient(
    'http://localhost:50110/todo-for-ai/api/v1',
    'your_api_token_here'
)

# 获取项目列表
projects = client.get_projects(status='active')

# 创建任务
task = client.create_task({
    'title': '新任务',
    'description': '任务描述',
    'project_id': 1,
    'priority': 'high'
})

# 更新任务状态
result = client.update_task_status(task['data']['id'], 'in_progress')`}
            </CodeBlock>

            <Divider />

            <Title level={4}>JavaScript/Node.js 示例</Title>
            <CodeBlock language="javascript">
{`const axios = require('axios');

class TodoAPIClient {
    constructor(baseURL, token) {
        this.client = axios.create({
            baseURL,
            headers: {
                'Authorization': \`Bearer \${token}\`,
                'Content-Type': 'application/json'
            }
        });
    }

    async getProjects(params = {}) {
        const response = await this.client.get('/projects', { params });
        return response.data;
    }

    async createTask(taskData) {
        const response = await this.client.post('/tasks', taskData);
        return response.data;
    }

    async updateTaskStatus(taskId, status) {
        const response = await this.client.put(\`/tasks/\${taskId}\`, { status });
        return response.data;
    }
}

// 使用示例
const client = new TodoAPIClient(
    'http://localhost:50110/todo-for-ai/api/v1',
    'your_api_token_here'
);

// 异步操作示例
(async () => {
    try {
        // 获取项目列表
        const projects = await client.getProjects({ status: 'active' });
        console.log('Projects:', projects);

        // 创建任务
        const task = await client.createTask({
            title: '新任务',
            description: '任务描述',
            project_id: 1,
            priority: 'high'
        });
        console.log('Created task:', task);

        // 更新任务状态
        const result = await client.updateTaskStatus(task.data.id, 'in_progress');
        console.log('Updated task:', result);
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
})();`}
            </CodeBlock>

            <Divider />

            <Title level={4}>cURL 脚本示例</Title>
            <CodeBlock language="bash">
{`#!/bin/bash

# 配置
API_BASE="http://localhost:50110/todo-for-ai/api/v1"
TOKEN="your_api_token_here"

# 通用请求函数
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" \\
            -H "Authorization: Bearer $TOKEN" \\
            -H "Content-Type: application/json" \\
            -d "$data" \\
            "$API_BASE$endpoint"
    else
        curl -s -X "$method" \\
            -H "Authorization: Bearer $TOKEN" \\
            -H "Content-Type: application/json" \\
            "$API_BASE$endpoint"
    fi
}

# 获取项目列表
echo "获取项目列表..."
api_request GET "/projects?status=active" | jq '.'

# 创建任务
echo "创建任务..."
task_data='{
    "title": "脚本创建的任务",
    "description": "通过脚本创建的测试任务",
    "project_id": 1,
    "priority": "medium"
}'
task_response=$(api_request POST "/tasks" "$task_data")
task_id=$(echo "$task_response" | jq -r '.data.id')
echo "创建的任务ID: $task_id"

# 更新任务状态
echo "更新任务状态..."
update_data='{"status": "in_progress"}'
api_request PUT "/tasks/$task_id" "$update_data" | jq '.'`}
            </CodeBlock>

            <Alert
              message="开发提示"
              description="建议在生产环境中添加适当的错误处理、重试机制和日志记录。示例代码仅供参考，请根据实际需求进行调整。"
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

export default APIDocumentation
