import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography,
  Button,
  Table,
  Space,
  Tag,
  Switch,
  message,
  Popconfirm,
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
import { useContextRuleStore } from '../stores'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { useTranslation } from '../i18n/hooks/useTranslation'
import type { ContextRule } from '../api/contextRules'

const { Title, Paragraph } = Typography


const ContextRules = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('contextRules')
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [viewingRule, setViewingRule] = useState<ContextRule | null>(null)



  const {
    contextRules,
    loading,
    error,
    pagination,
    // queryParams,
    fetchContextRules,
    deleteContextRule,
    toggleContextRule,
    copyContextRule,
    setQueryParams,
    clearError,
  } = useContextRuleStore()

  useEffect(() => {
    // 设置查询参数只获取全局规则（使用scope=global而不是rule_type）
    setQueryParams({ scope: 'global' })
    fetchContextRules()
  }, [fetchContextRules, setQueryParams])

  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  // 设置网页标题
  useEffect(() => {
    document.title = t('pageTitle')

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [t])





  const handleView = (rule: ContextRule) => {
    setViewingRule(rule)
    setIsDetailVisible(true)
  }

  const handleDelete = async (rule: ContextRule) => {
    const success = await deleteContextRule(rule.id)
    if (success) {
      message.success(t('messages.deleteSuccess'))
    }
  }

  const handleToggle = async (rule: ContextRule) => {
    const success = await toggleContextRule(rule.id, !rule.is_active)
    if (success) {
      const status = !rule.is_active ? t('status.enabled') : t('status.disabled')
      message.success(t('messages.toggleSuccess', { status }))
    }
  }

  const handleCopy = async (rule: ContextRule) => {
    const newName = t('messages.copyName', { name: rule.name })
    const result = await copyContextRule(rule.id, {
      name: newName,
      project_id: rule.project_id
    })
    if (result) {
      message.success(t('messages.copySuccess'))
    }
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
      title: t('table.columns.name'),
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
      title: t('table.columns.priority'),
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
      title: t('table.columns.status'),
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
      title: t('table.columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      sorter: true,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t('table.columns.actions'),
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
            {t('table.actions.view')}
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/todo-for-ai/pages/context-rules/${record.id}/edit`)}
          >
            {t('table.actions.edit')}
          </Button>
          <Button
            type="text"
            icon={<CopyOutlined />}
            size="small"
            onClick={() => handleCopy(record)}
          >
            {t('table.actions.copy')}
          </Button>
          <Popconfirm
            title={t('confirm.delete.title')}
            description={t('confirm.delete.description')}
            onConfirm={() => handleDelete(record)}
            okText={t('confirm.delete.ok')}
            cancelText={t('confirm.delete.cancel')}
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger>
              {t('table.actions.delete')}
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
              {t('title')}
            </Title>
            <Paragraph className="page-description">
              {t('subtitle')}
            </Paragraph>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchContextRules()}
              loading={loading}
            >
              {t('buttons.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/todo-for-ai/pages/context-rules/create')}
            >
              {t('buttons.createNew')}
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
          showTotal: (total, range) => t('table.pagination.total', {
            start: range[0],
            end: range[1],
            total
          }),
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
      />



      {/* 规则详情抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            <span>{t('drawer.title')}</span>
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
                {t('table.actions.edit')}
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
                    {t('tags.global')}
                  </Tag>
                  <Tag color={viewingRule.is_active ? 'success' : 'default'}>
                    {viewingRule.is_active ? t('status.enabled') : t('status.disabled')}
                  </Tag>
                  <Tag color={viewingRule.priority >= 200 ? 'red' : viewingRule.priority >= 100 ? 'orange' : 'green'}>
                    {t('table.columns.priority')}: {viewingRule.priority}
                  </Tag>
                </Space>
              </div>

              {viewingRule.description && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>{t('drawer.fields.description')}</strong>
                  <div style={{ marginTop: '8px', color: 'rgba(0, 0, 0, 0.65)' }}>
                    {viewingRule.description}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <strong>{t('drawer.fields.createdAt')}</strong> {new Date(viewingRule.created_at).toLocaleString()}
                </div>
                <div>
                  <strong>{t('drawer.fields.updatedAt')}</strong> {new Date(viewingRule.updated_at).toLocaleString()}
                </div>
                <div>
                  <strong>{t('drawer.fields.createdBy')}</strong> {viewingRule.created_by || t('drawer.fields.unknown')}
                </div>

              </div>
            </div>

            <div>
              <Title level={4}>{t('drawer.content.title')}</Title>
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


    </div>
  )
}

export default ContextRules
