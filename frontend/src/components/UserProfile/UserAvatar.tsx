import React, { useState, useEffect } from 'react'
import { Avatar, Dropdown, Button } from 'antd'
import { UserOutlined, LogoutOutlined, SettingOutlined, UserSwitchOutlined, FileTextOutlined, PushpinOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { pinsApi } from '../../api/pins'
import PinManager from '../PinManager'
import { useTranslation } from '../../i18n/hooks/useTranslation'

interface UserAvatarProps {
  size?: number | 'small' | 'default' | 'large'
  showName?: boolean
  placement?: 'bottom' | 'bottomLeft' | 'bottomRight' | 'top' | 'topLeft' | 'topRight'
  onPinUpdate?: () => void // 用于通知父组件Pin状态更新
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 'default',
  showName = true,
  placement = 'bottomRight',
  onPinUpdate
}) => {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [pinManagerVisible, setPinManagerVisible] = useState(false)
  const [hasPins, setHasPins] = useState(false)
  const { tn } = useTranslation()

  // 检查是否有Pin项目
  useEffect(() => {
    const checkPins = async () => {
      try {
        const response = await pinsApi.getUserPins()
        // 处理标准API响应格式
        const data = response?.data || response
        setHasPins(data && data.pins && data.pins.length > 0)
      } catch (error) {
        console.error('Failed to check pins:', error)
        setHasPins(false)
      }
    }

    if (isAuthenticated) {
      checkPins()
    }
  }, [isAuthenticated])

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

  // 打开Pin管理弹窗
  const handleOpenPinManager = () => {
    setPinManagerVisible(true)
  }

  // 关闭Pin管理弹窗
  const handleClosePinManager = () => {
    setPinManagerVisible(false)
  }

  // Pin更新后的回调
  const handlePinUpdate = async () => {
    // 重新检查Pin状态
    try {
      const response = await pinsApi.getUserPins()
      // 处理标准API响应格式
      const data = response?.data || response
      setHasPins(data && data.pins && data.pins.length > 0)
    } catch (error) {
      console.error('Failed to check pins after update:', error)
    }

    // 通知父组件更新
    if (onPinUpdate) {
      onPinUpdate()
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
      label: tn('userMenu.profile'),
      onClick: () => {
        navigate('/todo-for-ai/pages/profile')
      },
    },
    {
      key: 'context-rules',
      icon: <FileTextOutlined />,
      label: tn('userMenu.contextRules'),
      onClick: () => {
        navigate('/todo-for-ai/pages/context-rules')
      },
    },
    ...(hasPins ? [{
      key: 'pin-manager',
      icon: <PushpinOutlined />,
      label: tn('userMenu.pinManager'),
      onClick: handleOpenPinManager,
    }] : []),
    {
      key: 'settings',
      icon: <UserSwitchOutlined />,
      label: tn('userMenu.settings'),
      onClick: () => {
        navigate('/todo-for-ai/pages/settings')
      },
    },
    ...(user.role === 'admin' ? [{
      key: 'admin',
      icon: <UserSwitchOutlined />,
      label: tn('userMenu.userManagement'),
      onClick: () => {
        navigate('/todo-for-ai/pages/user-management')
      },
    }] : []),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: tn('userMenu.logout'),
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
    <>
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
          </div>
        </div>
      </Dropdown>

      {/* Pin管理弹窗 */}
      <PinManager
        visible={pinManagerVisible}
        onClose={handleClosePinManager}
        onUpdate={handlePinUpdate}
      />
    </>
  )
}

export default UserAvatar
