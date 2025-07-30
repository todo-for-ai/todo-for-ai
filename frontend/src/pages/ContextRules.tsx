import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Table,
  Space,
  Tag,
  Modal,
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
  GlobalOutlined
} from '@ant-design/icons'
import { useContextRuleStore, useProjectStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { ContextRule } from '../api/contextRules'

const { Title, Paragraph } = Typography
const { Option } = Select


const ContextRules = () => {
  const navigate = useNavigate()
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)

  const [viewingRule, setViewingRule] = useState<ContextRule | null>(null)



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
    // 设置查询参数只获取全局规则（使用scope=global而不是rule_type）
    setQueryParams({ scope: 'global' })
    fetchContextRules()
    fetchProjects()
  }, [fetchContextRules, fetchProjects, setQueryParams])

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
            onClick={() => navigate(`/todo-for-ai/pages/context-rules/${record.id}/edit`)}
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

  // 后端已经通过scope=global过滤了全局规则，这里直接使用
  const filteredRules = contextRules

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <Title level={2} className="page-title">
              全局上下文规则
            </Title>
            <Paragraph className="page-description">
              配置全局上下文规则，为AI提供准确的执行指导
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
              onClick={() => navigate('/todo-for-ai/pages/context-rules/create')}
            >
              新建规则
            </Button>
          </Space>
        </div>
      </div>



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
                  navigate(`/todo-for-ai/pages/context-rules/${viewingRule?.id}/edit`)
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
                  <Tag icon={<GlobalOutlined />} color="blue">
                    全局规则
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

        <Tabs
          defaultActiveKey="content"
          items={[
            {
              key: 'content',
              label: '合并内容',
              children: (
                <MarkdownEditor
                  value={previewContent}
                  readOnly
                  height={500}
                  hideToolbar
                  preview="preview"
                />
              )
            },
            {
              key: 'rules',
              label: '规则列表',
              children: (
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
                          <Tag color="blue">
                            全局
                          </Tag>
                          <Tag color={rule.priority >= 200 ? 'red' : rule.priority >= 100 ? 'orange' : 'green'}>
                            {rule.priority}
                          </Tag>
                        </Space>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            }
          ]}
        />
      </Modal>
    </div>
  )
}

export default ContextRules
