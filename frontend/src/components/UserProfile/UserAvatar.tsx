import React from 'react'
import { Avatar, Dropdown, Button } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined, UserSwitchOutlined, FileTextOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

interface UserAvatarProps {
  size?: number | 'small' | 'default' | 'large'
  showName?: boolean
  placement?: 'bottom' | 'bottomLeft' | 'bottomRight' | 'top' | 'topLeft' | 'topRight'
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 'default',
  showName = true,
  placement = 'bottomRight'
}) => {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  if (!isAuthenticated || !user) {
    return (
      <Button type="primary" href="/todo-for-ai/pages/login">
        登录
      </Button>
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      icon: <UserOutlined />,
      label: (
        <div>
          <div style={{ fontWeight: 500 }}>{user.full_name || user.nickname || user.username}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{user.email}</div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: '个人中心',
      onClick: () => {
        navigate('/todo-for-ai/pages/profile')
      },
    },
    {
      key: 'context-rules',
      icon: <FileTextOutlined />,
      label: '上下文规则',
      onClick: () => {
        navigate('/todo-for-ai/pages/context-rules')
      },
    },
    {
      key: 'settings',
      icon: <UserSwitchOutlined />,
      label: '系统设置',
      onClick: () => {
        navigate('/todo-for-ai/pages/settings')
      },
    },
    ...(user.role === 'admin' ? [{
      key: 'admin',
      icon: <UserSwitchOutlined />,
      label: '用户管理',
      onClick: () => {
        // TODO: 导航到用户管理页面
        console.log('Navigate to user management')
      },
    }] : []),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const avatarElement = (
    <Avatar
      size={size}
      src={user.avatar_url}
      icon={<UserOutlined />}
      style={{ cursor: 'pointer' }}
    />
  )

  if (!showName) {
    return (
      <Dropdown
        menu={{ items: menuItems }}
        placement={placement}
        trigger={['click']}
      >
        {avatarElement}
      </Dropdown>
    )
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement={placement}
      trigger={['click']}
    >
      <div className="user-avatar-container">
        {avatarElement}
        <div className="user-info">
          <div className="user-name" title={user.full_name || user.nickname || user.username}>
            {user.full_name || user.nickname || user.username}
          </div>
          <div className="user-role">
            {user.role === 'admin' ? '管理员' : '用户'}
          </div>
        </div>
      </div>
    </Dropdown>
  )
}

export default UserAvatar
