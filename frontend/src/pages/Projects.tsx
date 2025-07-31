import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Button, Table, Space, Tag, message, Popconfirm, Select, Card, Row, Col, Tooltip, Input, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, FilterOutlined, CheckSquareOutlined, UnorderedListOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons'
import { useProjectStore } from '../stores'
import { LinkButton } from '../components/SmartLink'
import type { Project } from '../api/projects'
import { formatRelativeTime, formatRelativeTimeI18n, formatFullDateTime } from '../utils/dateUtils'
import { useTranslation } from '../i18n/hooks/useTranslation'

const { Title, Paragraph } = Typography
const { Search } = Input

const Projects = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('projects')

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
      sort_order: 'desc' as 'desc' | 'asc',
      search: ''
    }
  }

  const [filters, setFilters] = useState(loadFiltersFromStorage)
  const [searchValue, setSearchValue] = useState(filters.search || '')

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

  // 防抖搜索函数
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: number
      return (searchTerm: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          handleFilterChange('search', searchTerm)
        }, 500) // 500ms 防抖延迟
      }
    })(),
    []
  )

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
    document.title = t('pageTitle')

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [t])

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

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    debouncedSearch(value)
  }

  // 处理搜索按钮点击或回车
  const handleSearchSubmit = (value: string) => {
    setSearchValue(value)
    handleFilterChange('search', value)
  }

  // 处理搜索清空
  const handleSearchClear = () => {
    setSearchValue('')
    handleFilterChange('search', '')
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
      message.success(t('messages.deleteSuccess'))
    }
  }

  const handleArchive = async (project: Project) => {
    const success = await archiveProject(project.id)
    if (success) {
      message.success(t('messages.archiveSuccess'))
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
      title: t('table.columns.name'),
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
      title: t('table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          active: { color: 'green', text: t('status.active') },
          archived: { color: 'orange', text: t('status.archived') },
          deleted: { color: 'red', text: t('status.deleted') },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: t('table.columns.stats'),
      key: 'stats',
      width: 140,
      render: (_: any, record: Project) => {
        if (record.total_tasks && record.total_tasks > 0) {
          return (
            <div style={{ fontSize: '12px' }}>
              <div>{t('stats.total')}: {record.total_tasks}</div>
              <div style={{ color: '#52c41a' }}>{t('stats.completed')}: {record.completed_tasks}</div>
              <div style={{ color: '#fa8c16', fontWeight: 500 }}>{t('stats.pending')}: {record.pending_tasks}</div>
            </div>
          )
        }
        return '-'
      },
    },
    {
      title: t('table.columns.lastActivity'),
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
      title: t('table.columns.createdAt'),
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
      title: t('table.columns.actions'),
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
            {t('buttons.view')}
          </LinkButton>
          <LinkButton
            to={`/todo-for-ai/pages/projects/${record.id}?tab=tasks`}
            type="text"
            icon={<CheckSquareOutlined />}
            size="small"
          >
            {t('buttons.tasks')}
          </LinkButton>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            {t('buttons.edit')}
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title={t('confirm.archive')}
              onConfirm={() => handleArchive(record)}
              okText={t('confirm.ok')}
              cancelText={t('confirm.cancel')}
            >
              <Button type="text" size="small">
                {t('buttons.archive')}
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title={t('confirm.delete')}
            description={t('confirm.deleteDescription')}
            onConfirm={() => handleDelete(record)}
            okText={t('confirm.ok')}
            cancelText={t('confirm.cancel')}
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger>
              {t('buttons.delete')}
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
              {t('title')}
            </Title>
            <Paragraph className="page-description">
              {t('subtitle')}
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
                {t('buttons.list')}
              </Button>
              <Button
                type={viewMode === 'card' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => handleViewModeChange('card')}
                size="small"
              >
                {t('buttons.card')}
              </Button>
            </Space.Compact>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchProjects()}
              loading={loading}
            >
              {t('buttons.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('buttons.createProject')}
            </Button>
          </Space>
        </div>

        {/* 搜索区域 */}
        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Search
                placeholder={t('search.placeholder')}
                value={searchValue}
                onChange={handleSearchChange}
                onSearch={handleSearchSubmit}
                onClear={handleSearchClear}
                allowClear
                enterButton={<SearchOutlined />}
                size="middle"
                style={{ width: '100%' }}
                loading={loading}
              />
            </Col>
            <Col span={16}>
              <div style={{
                fontSize: '12px',
                color: '#666',
                textAlign: 'right',
                lineHeight: '32px'
              }}>
                {loading ? (
                  <span style={{ color: '#1890ff' }}>{t('search.searching')}</span>
                ) : pagination?.total ? (
                  <>
                    {t('search.totalFound', { total: pagination.total })}
                    {filters.search && (
                      <span style={{ marginLeft: '8px' }}>
                        {t('search.keyword', { keyword: filters.search })}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: filters.search ? '#ff4d4f' : '#8c8c8c' }}>
                    {filters.search ? t('search.noResults', { keyword: filters.search }) : t('search.noProjects')}
                  </span>
                )}
              </div>
            </Col>
          </Row>
        </div>
      </div>

        {/* 筛选控件 */}
        <Card style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
          <Row gutter={16} align="middle">
            <Col span={3}>
              <Space>
                <FilterOutlined />
                <span style={{ fontWeight: 500 }}>{t('filters.title')}</span>
              </Space>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  {t('filters.projectStatus')}
                </div>
                <Select
                  placeholder={t('filters.projectStatus')}
                  value={filters.archived}
                  onChange={(value) => handleFilterChange('archived', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="">{t('filters.options.allStatus')}</Select.Option>
                  <Select.Option value="false">{t('filters.options.activeProjects')}</Select.Option>
                  <Select.Option value="true">{t('filters.options.archivedProjects')}</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  {t('filters.taskSituation')}
                </div>
                <Select
                  placeholder={t('filters.taskSituation')}
                  value={filters.has_pending_tasks}
                  onChange={(value) => handleFilterChange('has_pending_tasks', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="">{t('filters.options.allProjects')}</Select.Option>
                  <Select.Option value="true">{t('filters.options.hasPendingTasks')}</Select.Option>
                  <Select.Option value="false">{t('filters.options.noPendingTasks')}</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  {t('filters.activityTime')}
                </div>
                <Select
                  placeholder={t('filters.activityTime')}
                  value={filters.time_range}
                  onChange={(value) => handleFilterChange('time_range', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="">{t('filters.options.allTime')}</Select.Option>
                  <Select.Option value="today">{t('filters.options.todayActivity')}</Select.Option>
                  <Select.Option value="week">{t('filters.options.recentWeek')}</Select.Option>
                  <Select.Option value="month">{t('filters.options.recentMonth')}</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  {t('filters.sortBy')}
                </div>
                <Select
                  placeholder={t('filters.sortBy')}
                  value={filters.sort_by}
                  onChange={(value) => handleFilterChange('sort_by', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="last_activity_at">{t('filters.options.lastActivityTime')}</Select.Option>
                  <Select.Option value="created_at">{t('filters.options.createdTime')}</Select.Option>
                  <Select.Option value="updated_at">{t('filters.options.updatedTime')}</Select.Option>
                  <Select.Option value="name">{t('filters.options.projectName')}</Select.Option>
                  <Select.Option value="total_tasks">{t('filters.options.totalTasks')}</Select.Option>
                  <Select.Option value="pending_tasks">{t('filters.options.pendingTasks')}</Select.Option>
                  <Select.Option value="completed_tasks">{t('filters.options.completedTasks')}</Select.Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '12px', color: '#666', fontWeight: 500 }}>
                  {t('filters.sortOrder')}
                </div>
                <Select
                  placeholder={t('filters.sortOrder')}
                  value={filters.sort_order}
                  onChange={(value) => handleFilterChange('sort_order', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="desc">{t('filters.options.descOrder')}</Select.Option>
                  <Select.Option value="asc">{t('filters.options.ascOrder')}</Select.Option>
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
                    sort_order: 'desc' as 'desc' | 'asc',
                    search: ''
                  }
                  setFilters(defaultFilters)
                  setSearchValue('')
                  localStorage.setItem('projects-filters', JSON.stringify(defaultFilters))
                }}
                style={{ fontSize: '12px' }}
              >
                {t('buttons.reset')}
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
            showTotal: (total, range) => t('pagination.showTotal', { start: range[0], end: range[1], total }),
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  filters.search ? (
                    <span>
                      {t('empty.noSearchResults', { keyword: filters.search })}
                      <br />
                      <Button
                        type="link"
                        size="small"
                        onClick={handleSearchClear}
                        style={{ padding: 0, marginTop: '8px' }}
                      >
                        {t('buttons.clearSearch')}
                      </Button>
                    </span>
                  ) : (
                    <span>
                      {t('empty.noData')}
                      <br />
                      <Button
                        type="link"
                        size="small"
                        onClick={handleCreate}
                        style={{ padding: 0, marginTop: '8px' }}
                      >
                        {t('buttons.createFirst')}
                      </Button>
                    </span>
                  )
                }
              />
            )
          }}
        />
      ) : (
        <div>
          {projects.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  filters.search ? (
                    <span>
                      {t('empty.noSearchResults', { keyword: filters.search })}
                      <br />
                      <Button
                        type="link"
                        size="small"
                        onClick={handleSearchClear}
                        style={{ padding: 0, marginTop: '8px' }}
                      >
                        {t('buttons.clearSearch')}
                      </Button>
                    </span>
                  ) : (
                    <span>
                      {t('empty.noData')}
                      <br />
                      <Button
                        type="link"
                        size="small"
                        onClick={handleCreate}
                        style={{ padding: 0, marginTop: '8px' }}
                      >
                        {t('buttons.createFirst')}
                      </Button>
                    </span>
                  )
                }
              />
            </div>
          ) : (
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
                        {project.status === 'active' ? t('status.active') : t('status.archived')}
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
                              <strong style={{ color: '#1890ff' }}>{project.total_tasks}</strong> {t('stats.total')}
                            </span>
                            <span style={{ color: '#595959' }}>
                              <strong style={{ color: '#52c41a' }}>{project.completed_tasks}</strong> {t('stats.completed')}
                            </span>
                            <span style={{ color: '#595959' }}>
                              <strong style={{ color: '#fa8c16' }}>{project.pending_tasks}</strong> {t('stats.pending')}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#8c8c8c' }}>{t('stats.noTasks')}</span>
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
                          {project.last_activity_at ? (
                            <Tooltip title={formatFullDateTime(project.last_activity_at)}>
                              <span style={{ cursor: 'help' }}>
                                {formatRelativeTimeI18n(project.last_activity_at, t)}
                              </span>
                            </Tooltip>
                          ) : t('empty.noActivity')}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Space size={2}>
                            <LinkButton
                              to={`/todo-for-ai/pages/projects/${project.id}?tab=overview`}
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
                              title={t('buttons.view')}
                            >
                              {t('buttons.view')}
                            </LinkButton>
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
                              title={t('buttons.tasks')}
                            >
                              {t('buttons.tasks')}
                            </LinkButton>
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
                              title={t('buttons.edit')}
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
          )}

          {/* 卡片模式的分页 */}
          {projects.length > 0 && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block' }}>
                <Space direction="vertical" size="small">
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {t('pagination.cardTotal', {
                      start: ((pagination?.page || 1) - 1) * (pagination?.per_page || 100) + 1,
                      end: Math.min((pagination?.page || 1) * (pagination?.per_page || 100), pagination?.total || 0),
                      total: pagination?.total || 0
                    })}
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
                      {t('buttons.prev')}
                    </Button>
                    <span style={{ fontSize: '12px' }}>
                      {t('pagination.pageInfo', { current: pagination?.page || 1, total: pagination?.pages || 1 })}
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
                      {t('buttons.next')}
                    </Button>
                  </Space>
                </Space>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  )
}

export default Projects
