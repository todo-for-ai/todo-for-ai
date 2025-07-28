import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Button, Table, Space, Tag, Modal, Form, Input, ColorPicker, message, Popconfirm, Select, Card, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, FilterOutlined } from '@ant-design/icons'
import { useProjectStore } from '../stores'
import type { Project, CreateProjectData, UpdateProjectData } from '../api/projects'

const { Title, Paragraph } = Typography
const { TextArea } = Input

const Projects = () => {
  const navigate = useNavigate()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form] = Form.useForm()
  const [filters, setFilters] = useState({
    archived: 'false',
    has_pending_tasks: '',
    time_range: '',
    sort_by: 'last_activity_at',
    sort_order: 'desc' as 'desc' | 'asc'
  })

  const {
    projects,
    loading,
    error,
    pagination,
    // queryParams,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    setQueryParams,
    clearError,
  } = useProjectStore()

  useEffect(() => {
    // 应用筛选参数
    setQueryParams(filters)
    fetchProjects()
  }, [filters, setQueryParams, fetchProjects])

  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleCreate = () => {
    setEditingProject(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    form.setFieldsValue({
      name: project.name,
      description: project.description,
      color: project.color,
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (project: Project) => {
    const success = await deleteProject(project.id)
    if (success) {
      message.success('项目删除成功')
    }
  }

  const handleArchive = async (project: Project) => {
    const success = await archiveProject(project.id)
    if (success) {
      message.success('项目归档成功')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const projectData: CreateProjectData | UpdateProjectData = {
        name: values.name,
        description: values.description || '',
        color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#1890ff',
      }

      let success = false
      if (editingProject) {
        const result = await updateProject(editingProject.id, projectData)
        success = !!result
        if (success) {
          message.success('项目更新成功')
        }
      } else {
        const result = await createProject(projectData as CreateProjectData)
        success = !!result
        if (success) {
          message.success('项目创建成功')
        }
      }

      if (success) {
        setIsModalVisible(false)
        form.resetFields()
        setEditingProject(null)
      }
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  const handleModalCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingProject(null)
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
    fetchProjects()
  }

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text: string, record: Project) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: record.color,
                flexShrink: 0
              }}
            />
            <Button
              type="link"
              style={{ padding: 0, fontWeight: 500, height: 'auto' }}
              onClick={() => navigate(`/projects/${record.id}`)}
            >
              {text}
            </Button>
          </div>
          {record.description && (
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'green', text: '活跃' },
          archived: { color: 'orange', text: '已归档' },
          deleted: { color: 'red', text: '已删除' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '任务统计',
      key: 'stats',
      width: 120,
      render: (_: any, record: Project) => {
        if (record.stats) {
          return (
            <div style={{ fontSize: '12px' }}>
              <div>总计: {record.stats.total_tasks}</div>
              <div style={{ color: '#52c41a' }}>完成: {record.stats.done_tasks}</div>
            </div>
          )
        }
        return '-'
      },
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
      render: (_: any, record: Project) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/projects/${record.id}`)}
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
          {record.status === 'active' && (
            <Popconfirm
              title="确定要归档这个项目吗？"
              onConfirm={() => handleArchive(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" size="small">
                归档
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="确定要删除这个项目吗？"
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <Title level={2} className="page-title">
              项目管理
            </Title>
            <Paragraph className="page-description">
              创建和管理你的项目，组织任务和工作流程
            </Paragraph>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchProjects()}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新建项目
            </Button>
          </Space>
        </div>
      </div>

        {/* 筛选控件 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={4}>
              <Space>
                <FilterOutlined />
                <span>筛选条件:</span>
              </Space>
            </Col>
            <Col span={4}>
              <Select
                placeholder="项目状态"
                value={filters.archived}
                onChange={(value) => handleFilterChange('archived', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value="">全部</Select.Option>
                <Select.Option value="false">活跃项目</Select.Option>
                <Select.Option value="true">已归档</Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="任务状态"
                value={filters.has_pending_tasks}
                onChange={(value) => handleFilterChange('has_pending_tasks', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value="">全部</Select.Option>
                <Select.Option value="true">有待办任务</Select.Option>
                <Select.Option value="false">无待办任务</Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="活动时间"
                value={filters.time_range}
                onChange={(value) => handleFilterChange('time_range', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value="">全部时间</Select.Option>
                <Select.Option value="today">今天</Select.Option>
                <Select.Option value="week">最近一周</Select.Option>
                <Select.Option value="month">最近一个月</Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="排序方式"
                value={filters.sort_by}
                onChange={(value) => handleFilterChange('sort_by', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value="last_activity_at">最后活动时间</Select.Option>
                <Select.Option value="created_at">创建时间</Select.Option>
                <Select.Option value="updated_at">更新时间</Select.Option>
                <Select.Option value="name">项目名称</Select.Option>
                <Select.Option value="total_tasks">任务总数</Select.Option>
                <Select.Option value="pending_tasks">待办任务数</Select.Option>
                <Select.Option value="completed_tasks">已完成任务数</Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="排序顺序"
                value={filters.sort_order}
                onChange={(value) => handleFilterChange('sort_order', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value="desc">降序</Select.Option>
                <Select.Option value="asc">升序</Select.Option>
              </Select>
            </Col>
          </Row>
        </Card>

      <Table
        columns={columns}
        dataSource={projects}
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

      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            color: '#1890ff',
          }}
        >
          <Form.Item
            label="项目名称"
            name="name"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 100, message: '项目名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item
            label="项目描述"
            name="description"
            rules={[
              { max: 500, message: '项目描述不能超过500个字符' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="请输入项目描述（可选）"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="项目颜色"
            name="color"
          >
            <ColorPicker
              showText
              format="hex"
              presets={[
                {
                  label: '推荐颜色',
                  colors: [
                    '#1890ff',
                    '#52c41a',
                    '#faad14',
                    '#f5222d',
                    '#722ed1',
                    '#fa8c16',
                    '#13c2c2',
                    '#eb2f96',
                  ],
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Projects
