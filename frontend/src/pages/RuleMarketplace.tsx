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
  Empty,
  Button
} from 'antd'
import {
  SearchOutlined,
  CopyOutlined,
  EyeOutlined,
  UserOutlined,
  GlobalOutlined,
  ProjectOutlined,
  HeartOutlined,
  BarChartOutlined,
  GithubOutlined,
  BranchesOutlined
} from '@ant-design/icons'
import { useContextRuleStore, useProjectStore } from '../stores'
import { fetchApiClient } from '../api/fetchClient'
import { useTranslation } from '../i18n/hooks/useTranslation'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { ComplianceNotice } from '../components/ComplianceNotice'

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
    github_id?: string
    provider?: string
  }
  project?: {
    id: number
    name: string
    color: string
  }
}

const RuleMarketplace: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('ruleMarketplace')
  const { copyRuleFromMarketplace } = useContextRuleStore()
  const { projects, fetchProjects } = useProjectStore()
  
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

  // 预览规则的模态框
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewRule, setPreviewRule] = useState<PublicRule | null>(null)

  // 设置网页标题
  useEffect(() => {
    document.title = t('pageTitle')

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [t])

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
      setRules((response as any).data.rules || [])
      setTotal((response as any).data.pagination?.total || 0)
    } catch (error) {
      console.error('获取规则列表失败:', error)
      message.error(t('messages.fetchError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPublicRules()
  }, [searchText, sortBy, sortOrder, currentPage])

  // 获取项目列表
  useEffect(() => {
    fetchProjects()
  }, [])

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
      name: t('copy.modal.copyName', { name: rule.name }),
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
      
      message.success(t('copy.success'))
      setCopyModalVisible(false)
      setSelectedRule(null)
      copyForm.resetFields()

      // 跳转到上下文规则页面
      navigate('/todo-for-ai/pages/context-rules')

    } catch (error) {
      console.error('复制规则失败:', error)
      message.error(t('copy.error'))
    }
  }

  // 处理用户点击事件
  const handleUserClick = (user: PublicRule['user']) => {
    // 如果是GitHub用户，跳转到GitHub主页
    if (user.provider === 'github' && user.github_id) {
      window.open(`https://github.com/${user.github_id}`, '_blank')
    }
  }

  // 预览规则内容
  const handlePreviewRule = (rule: PublicRule) => {
    setPreviewRule(rule)
    setPreviewModalVisible(true)
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>{t('title')}</Title>
        <Text type="secondary">
          {t('subtitle')}
        </Text>
        <div style={{ marginTop: '12px' }}>
          <ComplianceNotice />
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input.Search
              placeholder={t('search.placeholder')}
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
              <Option value="usage_count_desc">{t('sort.usageCountDesc')}</Option>
              <Option value="usage_count_asc">{t('sort.usageCountAsc')}</Option>
              <Option value="created_at_desc">{t('sort.createdAtDesc')}</Option>
              <Option value="created_at_asc">{t('sort.createdAtAsc')}</Option>
              <Option value="updated_at_desc">{t('sort.updatedAtDesc')}</Option>
              <Option value="updated_at_asc">{t('sort.updatedAtAsc')}</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 规则列表 */}
      {rules.length === 0 && !loading ? (
        <Empty
          description={t('search.noResults')}
          style={{ marginTop: 60 }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {rules.map(rule => (
            <Col xs={24} sm={12} lg={8} xl={6} key={rule.id}>
              <Card
                hoverable
                actions={[
                  <Tooltip title={t('actions.preview')}>
                    <EyeOutlined onClick={() => handlePreviewRule(rule)} />
                  </Tooltip>,
                  <Tooltip title={t('actions.fork')}>
                    <BranchesOutlined onClick={() => showCopyModal(rule)} />
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
                        {rule.description || t('card.noDescription')}
                      </Paragraph>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            cursor: rule.user.provider === 'github' ? 'pointer' : 'default'
                          }}
                          onClick={() => handleUserClick(rule.user)}
                        >
                          <Avatar
                            size="small"
                            src={rule.user.avatar_url}
                            icon={<UserOutlined />}
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {rule.user.full_name || rule.user.username}
                          </Text>
                          {rule.user.provider === 'github' && (
                            <GithubOutlined style={{ fontSize: 12, color: '#666' }} />
                          )}
                        </div>
                        
                        <Tooltip title={t('tooltips.usageCount')}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
                            <BarChartOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {rule.usage_count}
                            </Text>
                          </div>
                        </Tooltip>
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
              t('pagination.total', { start: range[0], end: range[1], total })
            }
          />
        </div>
      )}

      {/* 复制规则模态框 */}
      <Modal
        title={t('copy.modal.title')}
        open={copyModalVisible}
        onOk={handleCopyRule}
        onCancel={() => {
          setCopyModalVisible(false)
          setSelectedRule(null)
          copyForm.resetFields()
        }}
        okText={t('copy.modal.okText')}
        cancelText={t('copy.modal.cancelText')}
      >
        {selectedRule && (
          <Form form={copyForm} layout="vertical">
            <Form.Item
              label={t('copy.modal.nameLabel')}
              name="name"
              rules={[{ required: true, message: t('copy.modal.nameRequired') }]}
            >
              <Input placeholder={t('copy.modal.namePlaceholder')} />
            </Form.Item>

            <Form.Item
              label={t('copy.modal.typeLabel')}
              name="copy_as_global"
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Radio value={true}>{t('copy.modal.globalOption')}</Radio>
                <Radio value={false}>{t('copy.modal.projectOption')}</Radio>
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
                    label={t('copy.modal.targetProjectLabel')}
                    name="target_project_id"
                    rules={[{ required: true, message: t('copy.modal.targetProjectRequired') }]}
                  >
                    <Select
                      placeholder={t('copy.modal.targetProjectPlaceholder')}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
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

      {/* 预览规则模态框 */}
      <Modal
        title={previewRule ? t('preview.title', { name: previewRule.name }) : ''}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            {t('common:actions.close')}
          </Button>
        ]}
        width={800}
      >
        {previewRule && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>{t('preview.description')}</Text>
              <Paragraph>{previewRule.description || t('preview.noDescription')}</Paragraph>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>{t('preview.content')}</Text>
              <div style={{ marginTop: 8 }}>
                <MarkdownEditor
                  value={previewRule.content}
                  readOnly
                  hideToolbar
                  height={400}
                />
              </div>
            </div>
            <div>
              <Space>
                <Tag color={previewRule.is_global ? 'blue' : 'green'}>
                  {previewRule.is_global ? t('card.globalRule') : t('card.projectRule')}
                </Tag>
                <Tag>{t('card.priority')}: {previewRule.priority}</Tag>
                <Tag>{t('card.usageCount')}: {previewRule.usage_count}</Tag>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default RuleMarketplace
