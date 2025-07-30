import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Button, Table, Space, Tag, message, Popconfirm, Select, Card, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, FilterOutlined, CheckSquareOutlined, UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useProjectStore } from '../stores'
import { LinkButton } from '../components/SmartLink'
import type { Project } from '../api/projects'

const { Title, Paragraph } = Typography

const Projects = () => {
  const navigate = useNavigate()

  // 从localStorage加载视图模式
  const loadViewModeFromStorage = () => {
    try {
      const saved = localStorage.getItem('projects-view-mode')
      return saved || 'list'
    } catch (error) {
      console.warn('Failed to load view mode from localStorage:', error)
      return 'list'
    }
  }

  const [viewMode, setViewMode] = useState<'list' | 'card'>(() => loadViewModeFromStorage() as 'list' | 'card')

  // 从localStorage加载筛选条件
  const loadFiltersFromStorage = () => {
    try {
      const saved = localStorage.getItem('projects-filters')
      if (saved) {
        return { ...JSON.parse(saved) }
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error)
    }
    // 默认筛选条件：只显示活跃项目（排除已删除和已归档）
    return {
      archived: 'false',
      has_pending_tasks: '',
      time_range: '',
      sort_by: 'last_activity_at',
      sort_order: 'desc' as 'desc' | 'asc'
    }
  }

  const [filters, setFilters] = useState(loadFiltersFromStorage)

  const {
    projects,
    loading,
    error,
    pagination,
    // queryParams,
    fetchProjects,
    deleteProject,
    archiveProject,
    setQueryParams,
    clearError,
  } = useProjectStore()

  useEffect(() => {
    // 应用筛选参数，并根据视图模式设置分页大小
    const paramsWithPagination = {
      ...filters,
      per_page: viewMode === 'card' ? 100 : 20
    }
    setQueryParams(paramsWithPagination)
    fetchProjects()
  }, [filters, viewMode, setQueryParams, fetchProjects])

  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  // 设置网页标题
  useEffect(() => {
    document.title = '项目列表 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value
    }
    setFilters(newFilters)

    // 保存到localStorage
    try {
      localStorage.setItem('projects-filters', JSON.stringify(newFilters))
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error)
    }
  }

  const handleViewModeChange = (mode: 'list' | 'card') => {
    setViewMode(mode)

    // 保存到localStorage
    try {
      localStorage.setItem('projects-view-mode', mode)
    } catch (error) {
      console.warn('Failed to save view mode to localStorage:', error)
    }

    // 切换到卡片模式时，调整分页大小
    if (mode === 'card') {
      const newParams = {
        ...filters,
        per_page: 100
      }
      setQueryParams(newParams)
      fetchProjects()
    } else {
      // 切换回列表模式时，恢复默认分页大小
      const newParams = {
        ...filters,
        per_page: 20
      }
      setQueryParams(newParams)
      fetchProjects()
    }
  }

  const handleCreate = () => {
    navigate('/todo-for-ai/pages/projects/create')
  }

  const handleEdit = (project: Project) => {
    navigate(`/todo-for-ai/pages/projects/${project.id}/edit`)
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
            <LinkButton
              to={`/todo-for-ai/pages/projects/${record.id}`}
              type="link"
              style={{ padding: 0, fontWeight: 500, height: 'auto' }}
            >
              {text}
            </LinkButton>
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
      width: 140,
      render: (_: any, record: Project) => {
        if (record.total_tasks && record.total_tasks > 0) {
          return (
            <div style={{ fontSize: '12px' }}>
              <div>总计: {record.total_tasks}</div>
              <div style={{ color: '#52c41a' }}>完成: {record.completed_tasks}</div>
              <div style={{ color: '#fa8c16', fontWeight: 500 }}>待处理: {record.pending_tasks}</div>
            </div>
          )
        }
        return '-'
      },
    },
    {
      title: '最后活动时间',
      dataIndex: 'last_activity_at',
      key: 'last_activity_at',
      width: 160,
      sorter: true,
      render: (date: string) => {
        if (!date) return '-'
        const dateObj = new Date(date)
        return (
          <div style={{ fontSize: '12px' }}>
            <div>{dateObj.toLocaleDateString('zh-CN')}</div>
            <div style={{ color: '#999' }}>{dateObj.toLocaleTimeString('zh-CN', { hour12: false })}</div>
          </div>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      sorter: true,
      render: (date: string) => {
        const dateObj = new Date(date)
        return (
          <div style={{ fontSize: '12px' }}>
            <div>{dateObj.toLocaleDateString('zh-CN')}</div>
            <div style={{ color: '#999' }}>{dateObj.toLocaleTimeString('zh-CN', { hour12: false })}</div>
          </div>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: Project) => (
        <Space size="small">
          <LinkButton
            to={`/todo-for-ai/pages/projects/${record.id}`}
            type="text"
            icon={<EyeOutlined />}
            size="small"
          >
            查看
          </LinkButton>
          <LinkButton
            to={`/todo-for-ai/pages/projects/${record.id}?tab=tasks`}
            type="text"
            icon={<CheckSquareOutlined />}
            size="small"
          >
            任务
          </LinkButton>
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
            <Space.Compact>
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => handleViewModeChange('list')}
                size="small"
              >
                列表
              </Button>
              <Button
                type={viewMode === 'card' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => handleViewModeChange('card')}
                size="small"
              >
                卡片
              </Button>
            </Space.Compact>
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
        <Card style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
          <Row gutter={16} align="middle">
            <Col span={3}>
              <Space>
                <FilterOutlined />
                <span style={{ fontWeight: 500 }}>筛选条件:</span>
              </Space>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  项目状态
                </div>
                <Select
                  placeholder="选择项目状态"
                  value={filters.archived}
                  onChange={(value) => handleFilterChange('archived', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="">全部状态</Select.Option>
                  <Select.Option value="false">活跃项目（默认）</Select.Option>
                  <Select.Option value="true">已归档项目</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  任务情况
                </div>
                <Select
                  placeholder="选择任务情况"
                  value={filters.has_pending_tasks}
                  onChange={(value) => handleFilterChange('has_pending_tasks', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="">全部项目</Select.Option>
                  <Select.Option value="true">有待办任务</Select.Option>
                  <Select.Option value="false">无待办任务</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  活动时间
                </div>
                <Select
                  placeholder="选择时间范围"
                  value={filters.time_range}
                  onChange={(value) => handleFilterChange('time_range', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="">全部时间</Select.Option>
                  <Select.Option value="today">今天活动</Select.Option>
                  <Select.Option value="week">最近一周</Select.Option>
                  <Select.Option value="month">最近一个月</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  排序方式
                </div>
                <Select
                  placeholder="选择排序字段"
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
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  排序顺序
                </div>
                <Select
                  placeholder="选择排序顺序"
                  value={filters.sort_order}
                  onChange={(value) => handleFilterChange('sort_order', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="desc">降序（新→旧）</Select.Option>
                  <Select.Option value="asc">升序（旧→新）</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={1}>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  const defaultFilters = {
                    archived: 'false',
                    has_pending_tasks: '',
                    time_range: '',
                    sort_by: 'last_activity_at',
                    sort_order: 'desc' as 'desc' | 'asc'
                  }
                  setFilters(defaultFilters)
                  localStorage.setItem('projects-filters', JSON.stringify(defaultFilters))
                }}
                style={{ fontSize: '12px' }}
              >
                重置
              </Button>
            </Col>
          </Row>
        </Card>

      {viewMode === 'list' ? (
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
      ) : (
        <div>
          <Row gutter={[16, 16]}>
            {projects.map((project) => (
              <Col key={project.id} xs={12} sm={12} md={8} lg={6} xl={6}>
                <Card
                  className="project-card"
                  style={{
                    height: '140px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  bodyStyle={{
                    padding: '16px',
                    height: '100%',
                    background: '#ffffff'
                  }}
                  hoverable
                  onClick={() => navigate(`/todo-for-ai/pages/projects/${project.id}`)}
                >
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* 卡片头部 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #f5f5f5'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: project.color,
                            flexShrink: 0,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                        />
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '15px',
                            color: '#262626',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                          title={project.name}
                        >
                          {project.name}
                        </div>
                      </div>
                      <Tag
                        color={project.status === 'active' ? 'green' : 'orange'}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          lineHeight: '16px',
                          marginLeft: '8px',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}
                      >
                        {project.status === 'active' ? '活跃' : '已归档'}
                      </Tag>
                    </div>

                    {/* 卡片主体 */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {/* 项目描述 */}
                      {project.description && (
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#595959',
                            lineHeight: '1.5',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            marginBottom: '12px',
                            minHeight: '40px'
                          }}
                          title={project.description}
                        >
                          {project.description}
                        </div>
                      )}

                      {/* 任务统计 */}
                      <div style={{
                        fontSize: '12px',
                        marginBottom: '12px',
                        padding: '6px 8px',
                        backgroundColor: '#fafafa',
                        borderRadius: '4px',
                        border: '1px solid #f0f0f0'
                      }}>
                        {project.total_tasks && project.total_tasks > 0 ? (
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <span style={{ color: '#595959' }}>
                              <strong style={{ color: '#1890ff' }}>{project.total_tasks}</strong> 总计
                            </span>
                            <span style={{ color: '#595959' }}>
                              <strong style={{ color: '#52c41a' }}>{project.completed_tasks}</strong> 完成
                            </span>
                            <span style={{ color: '#595959' }}>
                              <strong style={{ color: '#fa8c16' }}>{project.pending_tasks}</strong> 待处理
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#8c8c8c' }}>暂无任务</span>
                        )}
                      </div>

                      {/* 卡片底部 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '8px',
                        borderTop: '1px solid #f5f5f5'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: '#8c8c8c',
                          fontWeight: 400
                        }}>
                          {project.last_activity_at ? new Date(project.last_activity_at).toLocaleDateString() : '无活动'}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Space size={2}>
                            <LinkButton
                              to={`/todo-for-ai/pages/projects/${project.id}`}
                              type="text"
                              size="small"
                              icon={<EyeOutlined />}
                              style={{
                                fontSize: '12px',
                                padding: '2px 6px',
                                height: '24px',
                                color: '#595959',
                                borderRadius: '4px'
                              }}
                              title="查看项目"
                            />
                            <LinkButton
                              to={`/todo-for-ai/pages/projects/${project.id}?tab=tasks`}
                              type="text"
                              size="small"
                              icon={<CheckSquareOutlined />}
                              style={{
                                fontSize: '12px',
                                padding: '2px 6px',
                                height: '24px',
                                color: '#595959',
                                borderRadius: '4px'
                              }}
                              title="查看任务"
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              style={{
                                fontSize: '12px',
                                padding: '2px 6px',
                                height: '24px',
                                color: '#595959',
                                borderRadius: '4px'
                              }}
                              onClick={() => handleEdit(project)}
                              title="编辑项目"
                            />
                          </Space>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* 卡片模式的分页 */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block' }}>
              <Space direction="vertical" size="small">
                <div style={{ fontSize: '12px', color: '#666' }}>
                  第 {((pagination?.page || 1) - 1) * (pagination?.per_page || 100) + 1}-{Math.min((pagination?.page || 1) * (pagination?.per_page || 100), pagination?.total || 0)} 条，共 {pagination?.total || 0} 条
                </div>
                <Space>
                  <Button
                    size="small"
                    disabled={!pagination?.has_prev}
                    onClick={() => {
                      const newParams = { ...filters, page: (pagination?.page || 1) - 1 }
                      setQueryParams(newParams)
                      fetchProjects()
                    }}
                  >
                    上一页
                  </Button>
                  <span style={{ fontSize: '12px' }}>
                    第 {pagination?.page || 1} 页，共 {pagination?.pages || 1} 页
                  </span>
                  <Button
                    size="small"
                    disabled={!pagination?.has_next}
                    onClick={() => {
                      const newParams = { ...filters, page: (pagination?.page || 1) + 1 }
                      setQueryParams(newParams)
                      fetchProjects()
                    }}
                  >
                    下一页
                  </Button>
                </Space>
              </Space>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

export default Projects
