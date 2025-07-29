import { useEffect, useState } from 'react'
import { 
  Typography, 
  Button, 
  Table, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch,
  message, 
  Popconfirm,
  Tabs,
  Card,
  Drawer
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  ReloadOutlined,
  CopyOutlined,
  FileTextOutlined,
  GlobalOutlined,
  ProjectOutlined
} from '@ant-design/icons'
import { useContextRuleStore, useProjectStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { ContextRule, CreateContextRuleData, UpdateContextRuleData } from '../api/contextRules'

const { Title, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

const ContextRules = () => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<ContextRule | null>(null)
  const [viewingRule, setViewingRule] = useState<ContextRule | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [form] = Form.useForm()

  const {
    contextRules,
    loading,
    error,
    pagination,
    // queryParams,
    previewContent,
    previewRules,
    // previewLoading,
    fetchContextRules,
    createContextRule,
    updateContextRule,
    deleteContextRule,
    toggleContextRule,
    copyContextRule,
    previewMergedRules,
    setQueryParams,
    clearError,
  } = useContextRuleStore()

  const {
    projects,
    fetchProjects,
  } = useProjectStore()

  useEffect(() => {
    fetchContextRules()
    fetchProjects()
  }, [fetchContextRules, fetchProjects])

  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  // 设置网页标题
  useEffect(() => {
    document.title = '上下文规则 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

  const handleCreate = () => {
    setEditingRule(null)
    form.resetFields()
    form.setFieldsValue({ rule_type: 'global', priority: 100, is_active: true })
    setIsModalVisible(true)
  }

  const handleEdit = (rule: ContextRule) => {
    setEditingRule(rule)
    form.setFieldsValue({
      name: rule.name,
      description: rule.description,
      content: rule.content,
      rule_type: rule.rule_type,
      project_id: rule.project_id,
      priority: rule.priority,
      is_active: rule.is_active,
    })
    setIsModalVisible(true)
  }

  const handleView = (rule: ContextRule) => {
    setViewingRule(rule)
    setIsDetailVisible(true)
  }

  const handleDelete = async (rule: ContextRule) => {
    const success = await deleteContextRule(rule.id)
    if (success) {
      message.success('上下文规则删除成功')
    }
  }

  const handleToggle = async (rule: ContextRule) => {
    const success = await toggleContextRule(rule.id, !rule.is_active)
    if (success) {
      message.success(`上下文规则已${!rule.is_active ? '启用' : '禁用'}`)
    }
  }

  const handleCopy = async (rule: ContextRule) => {
    const newName = `${rule.name} - 副本`
    const result = await copyContextRule(rule.id, { 
      name: newName,
      project_id: rule.project_id 
    })
    if (result) {
      message.success('上下文规则复制成功')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const ruleData: CreateContextRuleData | UpdateContextRuleData = {
        name: values.name,
        description: values.description || '',
        content: values.content,
        rule_type: values.rule_type,
        project_id: values.rule_type === 'project' ? values.project_id : undefined,
        priority: values.priority || 100,
        is_active: values.is_active !== false,
      }

      let success = false
      if (editingRule) {
        const result = await updateContextRule(editingRule.id, ruleData)
        success = !!result
        if (success) {
          message.success('上下文规则更新成功')
        }
      } else {
        const result = await createContextRule(ruleData as CreateContextRuleData)
        success = !!result
        if (success) {
          message.success('上下文规则创建成功')
        }
      }

      if (success) {
        setIsModalVisible(false)
        form.resetFields()
        setEditingRule(null)
      }
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  const handleModalCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingRule(null)
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    const newParams: any = { page: 1 }
    
    if (key === 'global') {
      newParams.rule_type = 'global'
      newParams.project_id = undefined
    } else if (key === 'project') {
      newParams.rule_type = 'project'
      newParams.project_id = undefined
    } else {
      newParams.rule_type = undefined
      newParams.project_id = undefined
    }
    
    setQueryParams(newParams)
    fetchContextRules()
  }

  const handlePreview = async (projectId?: number) => {
    await previewMergedRules(projectId)
    setIsPreviewVisible(true)
  }

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    const newParams: any = {
      page: pagination.current,
      per_page: pagination.pageSize,
    }

    if (sorter.field) {
      newParams.sort_by = sorter.field
      newParams.sort_order = sorter.order === 'ascend' ? 'asc' : 'desc'
    }

    setQueryParams(newParams)
    fetchContextRules()
  }

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text: string, record: ContextRule) => (
        <div>
          <Button 
            type="link" 
            style={{ padding: 0, fontWeight: 500, height: 'auto' }}
            onClick={() => handleView(record)}
          >
            {text}
          </Button>
          {record.description && (
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              {record.description.length > 50 
                ? record.description.substring(0, 50) + '...' 
                : record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'rule_type',
      key: 'rule_type',
      width: 100,
      render: (type: string) => (
        <Tag 
          icon={type === 'global' ? <GlobalOutlined /> : <ProjectOutlined />}
          color={type === 'global' ? 'blue' : 'green'}
        >
          {type === 'global' ? '全局' : '项目'}
        </Tag>
      ),
    },
    {
      title: '所属项目',
      dataIndex: 'project',
      key: 'project',
      width: 120,
      render: (project: any, record: ContextRule) => {
        if (record.rule_type === 'global') {
          return <Tag color="blue">全局规则</Tag>
        }
        return project ? (
          <Tag color={project.color}>{project.name}</Tag>
        ) : (
          <Tag>未知项目</Tag>
        )
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: true,
      render: (priority: number) => (
        <Tag color={priority >= 200 ? 'red' : priority >= 100 ? 'orange' : 'green'}>
          {priority}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (is_active: boolean, record: ContextRule) => (
        <Switch
          checked={is_active}
          size="small"
          onChange={() => handleToggle(record)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: ContextRule) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="text" 
            icon={<CopyOutlined />} 
            size="small"
            onClick={() => handleCopy(record)}
          >
            复制
          </Button>
          <Popconfirm
            title="确定要删除这个上下文规则吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const filteredRules = contextRules.filter(rule => {
    if (activeTab === 'global') return rule.rule_type === 'global'
    if (activeTab === 'project') return rule.rule_type === 'project'
    return true
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <Title level={2} className="page-title">
              上下文规则管理
            </Title>
            <Paragraph className="page-description">
              配置全局和项目级别的上下文规则，为AI提供准确的执行指导
            </Paragraph>
          </div>
          <Space>
            <Button 
              icon={<FileTextOutlined />}
              onClick={() => handlePreview()}
            >
              预览合并规则
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => fetchContextRules()}
              loading={loading}
            >
              刷新
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新建规则
            </Button>
          </Space>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={handleTabChange} style={{ marginBottom: '16px' }}>
        <TabPane tab="全部规则" key="all" />
        <TabPane tab="全局规则" key="global" />
        <TabPane tab="项目规则" key="project" />
      </Tabs>

      <Table 
        columns={columns} 
        dataSource={filteredRules}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination?.page || 1,
          pageSize: pagination?.per_page || 20,
          total: pagination?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
      />

      {/* 创建/编辑规则模态框 */}
      <Modal
        title={editingRule ? '编辑上下文规则' : '新建上下文规则'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        width={900}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            rule_type: 'global',
            priority: 100,
            is_active: true,
          }}
        >
          <Form.Item
            label="规则名称"
            name="name"
            rules={[
              { required: true, message: '请输入规则名称' },
              { max: 100, message: '规则名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入规则名称" />
          </Form.Item>

          <Form.Item
            label="规则描述"
            name="description"
            rules={[
              { max: 500, message: '规则描述不能超过500个字符' },
            ]}
          >
            <TextArea 
              rows={2} 
              placeholder="请输入规则描述（可选）"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="规则类型"
              name="rule_type"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请选择规则类型' }]}
            >
              <Select>
                <Option value="global">全局规则</Option>
                <Option value="project">项目规则</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="所属项目"
              name="project_id"
              style={{ flex: 1 }}
              dependencies={['rule_type']}
              rules={[
                ({ getFieldValue }) => ({
                  required: getFieldValue('rule_type') === 'project',
                  message: '项目规则必须选择所属项目',
                }),
              ]}
            >
              <Select 
                placeholder="请选择项目"
                disabled={form.getFieldValue('rule_type') === 'global'}
                allowClear
              >
                {projects.map(project => (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="优先级"
              name="priority"
              style={{ flex: 1 }}
              help="数值越大优先级越高，建议：全局规则 50-100，项目规则 100-200"
            >
              <Input type="number" placeholder="请输入优先级" />
            </Form.Item>

            <Form.Item
              label="启用状态"
              name="is_active"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item
            label="规则内容"
            name="content"
            rules={[
              { required: true, message: '请输入规则内容' },
            ]}
          >
            <MarkdownEditor
              height={300}
              placeholder="请输入上下文规则内容，支持Markdown格式..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 规则详情抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            <span>上下文规则详情</span>
          </div>
        }
        placement="right"
        width={800}
        open={isDetailVisible}
        onClose={() => setIsDetailVisible(false)}
        extra={
          viewingRule && (
            <Space>
              <Button 
                icon={<EditOutlined />}
                onClick={() => {
                  setIsDetailVisible(false)
                  handleEdit(viewingRule)
                }}
              >
                编辑
              </Button>
            </Space>
          )
        }
      >
        {viewingRule && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <Title level={3}>{viewingRule.name}</Title>
              <div style={{ marginBottom: '16px' }}>
                <Space wrap>
                  <Tag 
                    icon={viewingRule.rule_type === 'global' ? <GlobalOutlined /> : <ProjectOutlined />}
                    color={viewingRule.rule_type === 'global' ? 'blue' : 'green'}
                  >
                    {viewingRule.rule_type === 'global' ? '全局规则' : '项目规则'}
                  </Tag>
                  <Tag color={viewingRule.is_active ? 'success' : 'default'}>
                    {viewingRule.is_active ? '已启用' : '已禁用'}
                  </Tag>
                  <Tag color={viewingRule.priority >= 200 ? 'red' : viewingRule.priority >= 100 ? 'orange' : 'green'}>
                    优先级: {viewingRule.priority}
                  </Tag>
                </Space>
              </div>
              
              {viewingRule.description && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>描述：</strong>
                  <div style={{ marginTop: '8px', color: 'rgba(0, 0, 0, 0.65)' }}>
                    {viewingRule.description}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <strong>创建时间：</strong> {new Date(viewingRule.created_at).toLocaleString('zh-CN')}
                </div>
                <div>
                  <strong>更新时间：</strong> {new Date(viewingRule.updated_at).toLocaleString('zh-CN')}
                </div>
                <div>
                  <strong>创建者：</strong> {viewingRule.created_by || '未知'}
                </div>
                <div>
                  <strong>所属项目：</strong> {viewingRule.project?.name || '全局规则'}
                </div>
              </div>
            </div>

            <div>
              <Title level={4}>规则内容</Title>
              <MarkdownEditor
                value={viewingRule.content || ''}
                readOnly
                height={400}
                hideToolbar
                preview="preview"
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* 预览合并规则模态框 */}
      <Modal
        title="预览合并后的上下文规则"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        footer={null}
        width={1000}
        style={{ top: 20 }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <span>选择项目预览：</span>
            <Select
              placeholder="选择项目（可选）"
              style={{ width: 200 }}
              allowClear
              onChange={(projectId) => handlePreview(projectId)}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        <Tabs defaultActiveKey="content">
          <TabPane tab="合并内容" key="content">
            <MarkdownEditor
              value={previewContent}
              readOnly
              height={500}
              hideToolbar
              preview="preview"
            />
          </TabPane>
          <TabPane tab="规则列表" key="rules">
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {previewRules.map(rule => (
                <Card key={rule.id} size="small" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{rule.name}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {rule.description}
                      </div>
                    </div>
                    <Space>
                      <Tag 
                        color={rule.rule_type === 'global' ? 'blue' : 'green'}
                      >
                        {rule.rule_type === 'global' ? '全局' : '项目'}
                      </Tag>
                      <Tag color={rule.priority >= 200 ? 'red' : rule.priority >= 100 ? 'orange' : 'green'}>
                        {rule.priority}
                      </Tag>
                    </Space>
                  </div>
                </Card>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  )
}

export default ContextRules
