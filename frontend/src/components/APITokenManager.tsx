import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Alert,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { fetchApiClient } from '../api/fetchClient'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface APIToken {
  id: number
  name: string
  prefix: string
  description?: string
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  created_at: string
  usage_count: number
}

export const APITokenManager: React.FC = () => {
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [loading, setLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [tokenModalVisible, setTokenModalVisible] = useState(false)
  const [newToken, setNewToken] = useState<string>('')
  const [viewTokenModalVisible, setViewTokenModalVisible] = useState(false)
  const [viewingToken, setViewingToken] = useState<APIToken | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    setLoading(true)
    try {
      const response = await fetchApiClient.get('/tokens')
      // 处理标准API响应格式
      const data = response?.data || response
      const tokens = data?.tokens || []
      setTokens(tokens)
    } catch (error: any) {
      message.error('获取Token列表失败')
      console.error('Failed to fetch tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateToken = async (values: any) => {
    try {
      const response = await fetchApiClient.post('/tokens', values)
      const data = response?.data || response

      // 显示新创建的token
      setNewToken(data.token || data.raw_token)
      setTokenModalVisible(true)
      setCreateModalVisible(false)
      form.resetFields()

      // 刷新列表
      fetchTokens()
      message.success('API Token创建成功')
    } catch (error: any) {
      message.error('创建Token失败')
    }
  }

  const handleDeleteToken = async (tokenId: number) => {
    try {
      await fetchApiClient.delete(`/tokens/${tokenId}`)
      message.success('Token删除成功')
      fetchTokens()
    } catch (error: any) {
      message.error('删除Token失败')
    }
  }

  const handleViewToken = (token: APIToken) => {
    setViewingToken(token)
    setViewTokenModalVisible(true)
  }

  const handleCopyTokenPrefix = (token: APIToken) => {
    // 复制Token前缀（这是我们能安全显示的部分）
    copyToClipboard(`${token.prefix}***`)
    message.info('已复制Token前缀到剪贴板')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: APIToken) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Token前缀',
      dataIndex: 'prefix',
      key: 'prefix',
      render: (prefix: string) => (
        <Text code>{prefix}***</Text>
      )
    },
    {
      title: '状态',
      key: 'status',
      render: (record: APIToken) => {
        if (!record.is_active) {
          return <Tag color="red">已禁用</Tag>
        }
        if (isExpired(record.expires_at)) {
          return <Tag color="orange">已过期</Tag>
        }
        return <Tag color="green">活跃</Tag>
      }
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date: string) => (
        <Text type="secondary">{formatDate(date)}</Text>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      render: (count: number) => (
        <Text>{count || 0}</Text>
      )
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string) => (
        <Text type={isExpired(date) ? 'danger' : 'secondary'}>
          {date ? formatDate(date) : '永不过期'}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: APIToken) => (
        <Space size="small">
          <Tooltip title="查看Token详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewToken(record)}
            >
              查看
            </Button>
          </Tooltip>
          <Tooltip title="复制Token前缀">
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleCopyTokenPrefix(record)}
            >
              复制
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个Token吗？"
            description="删除后将无法恢复，使用此Token的应用将无法访问。"
            onConfirm={() => handleDeleteToken(record.id)}
            okText="确定"
            cancelText="取消"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>API Token 管理</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建Token
            </Button>
          </div>
        }
      >
        <Alert
          message="API Token 用于MCP客户端认证"
          description="创建Token后请妥善保管，Token只在创建时显示一次。您可以使用Token通过MCP协议访问Todo for AI的功能。点击'查看'按钮可以查看Token的详细信息。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={tokens}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个Token`
          }}
        />
      </Card>

      {/* 创建Token模态框 */}
      <Modal
        title="创建API Token"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateToken}
        >
          <Form.Item
            label="Token名称"
            name="name"
            rules={[
              { required: true, message: '请输入Token名称' },
              { min: 2, max: 50, message: '名称长度为2-50个字符' }
            ]}
          >
            <Input placeholder="如：MCP Client Token" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea 
              rows={3} 
              placeholder="描述这个Token的用途..."
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="过期天数"
            name="expires_days"
            help="留空表示永不过期"
          >
            <InputNumber
              min={1}
              max={365}
              placeholder="如：30"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建Token
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false)
                form.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 显示新Token模态框 */}
      <Modal
        title="Token创建成功"
        open={tokenModalVisible}
        onCancel={() => setTokenModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTokenModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="请保存您的Token"
          description="这是您的Token唯一显示的机会，请立即复制并保存到安全的地方。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ 
          background: '#f5f5f5', 
          padding: '12px', 
          borderRadius: '6px',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          marginBottom: 16
        }}>
          {newToken}
        </div>

        <Button
          type="primary"
          icon={<CopyOutlined />}
          onClick={() => copyToClipboard(newToken)}
          block
        >
          复制Token
        </Button>
      </Modal>

      {/* 查看Token详情模态框 */}
      <Modal
        title="Token详情"
        open={viewTokenModalVisible}
        onCancel={() => {
          setViewTokenModalVisible(false)
          setViewingToken(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewTokenModalVisible(false)
            setViewingToken(null)
          }}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {viewingToken && (
          <div>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Text strong>名称：</Text>
                <Text>{viewingToken.name}</Text>
              </div>

              {viewingToken.description && (
                <div>
                  <Text strong>描述：</Text>
                  <Text>{viewingToken.description}</Text>
                </div>
              )}

              <div>
                <Text strong>Token前缀：</Text>
                <Text code>{viewingToken.prefix}***</Text>
              </div>

              <div>
                <Text strong>状态：</Text>
                {!viewingToken.is_active ? (
                  <Tag color="red">已禁用</Tag>
                ) : isExpired(viewingToken.expires_at) ? (
                  <Tag color="orange">已过期</Tag>
                ) : (
                  <Tag color="green">活跃</Tag>
                )}
              </div>

              <div>
                <Text strong>创建时间：</Text>
                <Text>{formatDate(viewingToken.created_at)}</Text>
              </div>

              <div>
                <Text strong>过期时间：</Text>
                <Text type={isExpired(viewingToken.expires_at) ? 'danger' : 'secondary'}>
                  {viewingToken.expires_at ? formatDate(viewingToken.expires_at) : '永不过期'}
                </Text>
              </div>

              <div>
                <Text strong>最后使用：</Text>
                <Text type="secondary">{formatDate(viewingToken.last_used_at)}</Text>
              </div>

              <div>
                <Text strong>使用次数：</Text>
                <Text>{viewingToken.usage_count || 0}</Text>
              </div>

              <Alert
                message="安全提示"
                description="出于安全考虑，完整的Token只在创建时显示一次。如果您忘记了Token，请删除此Token并创建新的。"
                type="info"
                showIcon
              />
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}
