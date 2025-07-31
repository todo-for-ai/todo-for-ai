import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Avatar,
  Popconfirm,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip
} from 'antd'
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  StopOutlined,
  PlayCircleOutlined,
  CrownOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import AuthAPI, { type User, type UserListParams } from '../api/auth'
import { useAuthStore } from '../stores/useAuthStore'
import { useTranslation } from '../i18n/hooks/useTranslation'
import { AuthGuard } from '../components/AuthGuard'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

interface UserStats {
  total: number
  active: number
  suspended: number
  admins: number
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { tp } = useTranslation('userManagement')
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  const [filters, setFilters] = useState<UserListParams>({
    search: '',
    status: undefined,
    role: undefined
  })
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    suspended: 0,
    admins: 0
  })

  // 加载用户列表
  const loadUsers = async (params?: Partial<UserListParams>) => {
    setLoading(true)
    try {
      const queryParams = {
        ...filters,
        ...params,
        page: pagination.current,
        per_page: pagination.pageSize
      }
      
      const response = await AuthAPI.getUsers(queryParams)
      setUsers(response.users)
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }))
      
      // 计算统计数据
      const newStats: UserStats = {
        total: response.pagination.total,
        active: response.users.filter(u => u.status === 'active').length,
        suspended: response.users.filter(u => u.status === 'suspended').length,
        admins: response.users.filter(u => u.role === 'admin').length
      }
      setStats(newStats)
      
    } catch (error) {
      console.error('Failed to load users:', error)
      message.error(tp('messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadUsers()
  }, [pagination.current, pagination.pageSize])

  // 搜索用户
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setPagination(prev => ({ ...prev, current: 1 }))
    loadUsers({ search: value })
  }

  // 筛选状态
  const handleStatusFilter = (status: string | undefined) => {
    setFilters(prev => ({ ...prev, status }))
    setPagination(prev => ({ ...prev, current: 1 }))
    loadUsers({ status })
  }

  // 筛选角色
  const handleRoleFilter = (role: string | undefined) => {
    setFilters(prev => ({ ...prev, role }))
    setPagination(prev => ({ ...prev, current: 1 }))
    loadUsers({ role })
  }

  // 更新用户状态
  const handleUpdateUserStatus = async (userId: number, status: 'active' | 'suspended') => {
    try {
      await AuthAPI.updateUserStatus(userId, status)
      message.success(tp('messages.statusUpdated'))
      loadUsers()
    } catch (error) {
      console.error('Failed to update user status:', error)
      message.error(tp('messages.updateFailed'))
    }
  }

  // 表格列定义
  const columns = [
    {
      title: tp('table.columns.user'),
      key: 'user',
      width: 250,
      render: (record: User) => (
        <Space>
          <Avatar
            src={record.avatar_url}
            icon={<UserOutlined />}
            size="default"
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.full_name || record.nickname || record.username}
              {record.role === 'admin' && (
                <CrownOutlined style={{ marginLeft: 8, color: '#faad14' }} />
              )}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>{record.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: tp('table.columns.role'),
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>
          {tp(`roles.${role}`)}
        </Tag>
      )
    },
    {
      title: tp('table.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : status === 'suspended' ? 'red' : 'orange'}>
          {tp(`status.${status}`)}
        </Tag>
      )
    },
    {
      title: tp('table.columns.lastLogin'),
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-'
    },
    {
      title: tp('table.columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: tp('table.columns.actions'),
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (record: User) => {
        // 不能对自己进行操作
        if (record.id === currentUser?.id) {
          return <span style={{ color: '#999' }}>{tp('actions.self')}</span>
        }

        return (
          <Space size="small">
            {record.status === 'active' ? (
              <Popconfirm
                title={tp('confirm.suspend')}
                description={tp('confirm.suspendDescription')}
                onConfirm={() => handleUpdateUserStatus(record.id, 'suspended')}
                okText={tp('confirm.ok')}
                cancelText={tp('confirm.cancel')}
              >
                <Button
                  type="text"
                  danger
                  icon={<StopOutlined />}
                  size="small"
                >
                  {tp('actions.suspend')}
                </Button>
              </Popconfirm>
            ) : (
              <Popconfirm
                title={tp('confirm.activate')}
                description={tp('confirm.activateDescription')}
                onConfirm={() => handleUpdateUserStatus(record.id, 'active')}
                okText={tp('confirm.ok')}
                cancelText={tp('confirm.cancel')}
              >
                <Button
                  type="text"
                  icon={<PlayCircleOutlined />}
                  size="small"
                >
                  {tp('actions.activate')}
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      }
    }
  ]

  return (
    <AuthGuard requireAuth requireAdmin>
      <div className="page-container">
        <div className="page-header">
          <Title level={2}>{tp('title')}</Title>
          <p>{tp('description')}</p>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={tp('stats.totalUsers')}
                value={stats.total}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={tp('stats.activeUsers')}
                value={stats.active}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={tp('stats.suspendedUsers')}
                value={stats.suspended}
                prefix={<StopOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={tp('stats.admins')}
                value={stats.admins}
                prefix={<CrownOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选和搜索 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Search
                placeholder={tp('search.placeholder')}
                allowClear
                onSearch={handleSearch}
                style={{ width: 300 }}
                enterButton={<SearchOutlined />}
              />
            </Col>
            <Col>
              <Select
                placeholder={tp('filters.status')}
                allowClear
                style={{ width: 120 }}
                onChange={handleStatusFilter}
                value={filters.status}
              >
                <Option value="active">{tp('status.active')}</Option>
                <Option value="suspended">{tp('status.suspended')}</Option>
                <Option value="inactive">{tp('status.inactive')}</Option>
              </Select>
            </Col>
            <Col>
              <Select
                placeholder={tp('filters.role')}
                allowClear
                style={{ width: 120 }}
                onChange={handleRoleFilter}
                value={filters.role}
              >
                <Option value="admin">{tp('roles.admin')}</Option>
                <Option value="user">{tp('roles.user')}</Option>
              </Select>
            </Col>
            <Col>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadUsers()}
                loading={loading}
              >
                {tp('actions.refresh')}
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 用户表格 */}
        <Card>
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                tp('table.pagination.total', { 
                  start: range[0], 
                  end: range[1], 
                  total 
                }),
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
              }
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </AuthGuard>
  )
}

export default UserManagement
