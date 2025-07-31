import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Card,
  Row,
  Col,
  Input,
  Select,
  Space,
  Tag,
  Avatar,
  message,
  Pagination,
  Modal,
  Form,
  Radio,
  Tooltip,
  Empty
} from 'antd'
import {
  SearchOutlined,
  CopyOutlined,
  EyeOutlined,
  UserOutlined,
  GlobalOutlined,
  ProjectOutlined,
  HeartOutlined
} from '@ant-design/icons'
import { useContextRuleStore, useProjectStore } from '../stores'
import { fetchApiClient } from '../api/fetchClient'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

interface PublicRule {
  id: number
  name: string
  description: string
  content: string
  priority: number
  is_global: boolean
  usage_count: number
  created_at: string
  updated_at: string
  user: {
    id: number
    username: string
    full_name: string
    avatar_url?: string
  }
  project?: {
    id: number
    name: string
    color: string
  }
}

const RuleMarketplace: React.FC = () => {
  const navigate = useNavigate()
  const { copyRuleFromMarketplace } = useContextRuleStore()
  const { projects } = useProjectStore()
  
  const [rules, setRules] = useState<PublicRule[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState('usage_count')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  
  // 复制规则的模态框
  const [copyModalVisible, setCopyModalVisible] = useState(false)
  const [selectedRule, setSelectedRule] = useState<PublicRule | null>(null)
  const [copyForm] = Form.useForm()

  // 获取公开规则列表
  const fetchPublicRules = async () => {
    setLoading(true)
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams()
      queryParams.append('search', searchText)
      queryParams.append('sort_by', sortBy)
      queryParams.append('sort_order', sortOrder)
      queryParams.append('page', String(currentPage))
      queryParams.append('per_page', String(pageSize))

      const url = `/context-rules/marketplace?${queryParams.toString()}`
      const response = await fetchApiClient.get(url)

      console.log('API Response data:', response)
      setRules(response.data.rules || [])
      setTotal(response.data.pagination?.total || 0)
    } catch (error) {
      console.error('获取规则列表失败:', error)
      message.error('获取规则列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPublicRules()
  }, [searchText, sortBy, sortOrder, currentPage])

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value)
    setCurrentPage(1)
  }

  // 处理排序变化
  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('_')
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setCurrentPage(1)
  }

  // 显示复制模态框
  const showCopyModal = (rule: PublicRule) => {
    setSelectedRule(rule)
    setCopyModalVisible(true)
    copyForm.setFieldsValue({
      name: `${rule.name} - 副本`,
      copy_as_global: true,
      target_project_id: undefined
    })
  }

  // 处理复制规则
  const handleCopyRule = async () => {
    if (!selectedRule) return
    
    try {
      const values = await copyForm.validateFields()
      
      await copyRuleFromMarketplace(selectedRule.id, {
        name: values.name,
        copy_as_global: values.copy_as_global,
        target_project_id: values.copy_as_global ? undefined : values.target_project_id
      })
      
      message.success('规则复制成功！')
      setCopyModalVisible(false)
      setSelectedRule(null)
      copyForm.resetFields()
      
      // 跳转到上下文规则页面
      navigate('/todo-for-ai/pages/context-rules')
      
    } catch (error) {
      console.error('复制规则失败:', error)
      message.error('复制规则失败')
    }
  }

  // 预览规则内容
  const previewRule = (rule: PublicRule) => {
    Modal.info({
      title: `预览规则: ${rule.name}`,
      width: 800,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>描述：</Text>
            <Paragraph>{rule.description || '无描述'}</Paragraph>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>规则内容：</Text>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: 12, 
              borderRadius: 4,
              whiteSpace: 'pre-wrap',
              maxHeight: 400,
              overflow: 'auto'
            }}>
              {rule.content}
            </pre>
          </div>
          <div>
            <Space>
              <Tag color={rule.is_global ? 'blue' : 'green'}>
                {rule.is_global ? '全局规则' : '项目规则'}
              </Tag>
              <Tag>优先级: {rule.priority}</Tag>
              <Tag>使用次数: {rule.usage_count}</Tag>
            </Space>
          </div>
        </div>
      )
    })
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>规则广场</Title>
        <Text type="secondary">
          发现和复制其他用户分享的优秀上下文规则
        </Text>
      </div>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input.Search
              placeholder="搜索规则名称、描述或内容..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col>
            <Select
              value={`${sortBy}_${sortOrder}`}
              onChange={handleSortChange}
              style={{ width: 200 }}
            >
              <Option value="usage_count_desc">使用次数 (高到低)</Option>
              <Option value="usage_count_asc">使用次数 (低到高)</Option>
              <Option value="created_at_desc">创建时间 (新到旧)</Option>
              <Option value="created_at_asc">创建时间 (旧到新)</Option>
              <Option value="updated_at_desc">更新时间 (新到旧)</Option>
              <Option value="updated_at_asc">更新时间 (旧到新)</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 规则列表 */}
      {rules.length === 0 && !loading ? (
        <Empty
          description="暂无公开规则"
          style={{ marginTop: 60 }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {rules.map(rule => (
            <Col xs={24} sm={12} lg={8} xl={6} key={rule.id}>
              <Card
                hoverable
                actions={[
                  <Tooltip title="预览规则">
                    <EyeOutlined onClick={() => previewRule(rule)} />
                  </Tooltip>,
                  <Tooltip title="复制规则">
                    <CopyOutlined onClick={() => showCopyModal(rule)} />
                  </Tooltip>
                ]}
                style={{ height: '100%' }}
              >
                <Card.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rule.name}
                      </span>
                      {rule.is_global ? (
                        <GlobalOutlined style={{ color: '#1890ff' }} />
                      ) : (
                        <ProjectOutlined style={{ color: '#52c41a' }} />
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ marginBottom: 8, minHeight: 44 }}
                      >
                        {rule.description || '无描述'}
                      </Paragraph>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Avatar 
                            size="small" 
                            src={rule.user.avatar_url} 
                            icon={<UserOutlined />} 
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {rule.user.full_name || rule.user.username}
                          </Text>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <HeartOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {rule.usage_count}
                          </Text>
                        </div>
                      </div>
                      
                      {rule.project && (
                        <Tag 
                          color={rule.project.color} 
                          style={{ marginTop: 8, fontSize: 11 }}
                        >
                          {rule.project.name}
                        </Tag>
                      )}
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 分页 */}
      {total > 0 && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={setCurrentPage}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }
          />
        </div>
      )}

      {/* 复制规则模态框 */}
      <Modal
        title="复制规则"
        open={copyModalVisible}
        onOk={handleCopyRule}
        onCancel={() => {
          setCopyModalVisible(false)
          setSelectedRule(null)
          copyForm.resetFields()
        }}
        okText="复制"
        cancelText="取消"
      >
        {selectedRule && (
          <Form form={copyForm} layout="vertical">
            <Form.Item
              label="规则名称"
              name="name"
              rules={[{ required: true, message: '请输入规则名称' }]}
            >
              <Input placeholder="请输入规则名称" />
            </Form.Item>
            
            <Form.Item
              label="复制类型"
              name="copy_as_global"
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Radio value={true}>复制为全局规则</Radio>
                <Radio value={false}>复制为项目规则</Radio>
              </Radio.Group>
            </Form.Item>
            
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.copy_as_global !== currentValues.copy_as_global
              }
            >
              {({ getFieldValue }) => {
                const copyAsGlobal = getFieldValue('copy_as_global')
                return !copyAsGlobal ? (
                  <Form.Item
                    label="目标项目"
                    name="target_project_id"
                    rules={[{ required: true, message: '请选择目标项目' }]}
                  >
                    <Select placeholder="请选择目标项目">
                      {projects.map(project => (
                        <Option key={project.id} value={project.id}>
                          {project.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : null
              }}
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default RuleMarketplace
