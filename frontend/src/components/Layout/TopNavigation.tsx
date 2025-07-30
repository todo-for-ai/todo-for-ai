import React from 'react'
import { Layout, Menu, Typography, Space } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ProjectOutlined,
  RobotOutlined,
  AppstoreOutlined,
  ApiOutlined,
} from '@ant-design/icons'
import { UserAvatar } from '../UserProfile'
import { LinkButton } from '../SmartLink'
import './TopNavigation.css'

const { Header } = Layout
const { Title } = Typography

const TopNavigation: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // 主要菜单项（左侧）
  const mainMenuItems = [
    {
      key: '/todo-for-ai/pages',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/todo-for-ai/pages/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Header
      className="top-navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', // 改为居中对齐
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        height: '64px',
      }}
    >
      {/* 左侧：Logo - 绝对定位到左边 */}
      <div
        className="logo-section"
        style={{
          position: 'absolute',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/todo-for-ai/pages')}
      >
        <RobotOutlined
          style={{
            fontSize: '28px',
            color: '#1890ff'
          }}
        />
        <Title
          level={4}
          style={{
            margin: 0,
            color: '#1890ff',
            fontSize: '18px',
            fontWeight: 600
          }}
        >
          Todo for AI
        </Title>
      </div>

      {/* 中间：主要菜单 + 文档链接 - 居中显示 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
        {/* 主要菜单 */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={mainMenuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            background: 'transparent',
            minWidth: '200px'
          }}
        />

        {/* 文档链接 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <LinkButton
            to="/todo-for-ai/pages/mcp-installation"
            type="text"
            icon={<AppstoreOutlined />}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: location.pathname === '/todo-for-ai/pages/mcp-installation' ? '#1890ff' : '#666',
              fontWeight: location.pathname === '/todo-for-ai/pages/mcp-installation' ? 500 : 400,
            }}
          >
            MCP安装文档
          </LinkButton>

          <LinkButton
            to="/todo-for-ai/pages/api-documentation"
            type="text"
            icon={<ApiOutlined />}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: location.pathname === '/todo-for-ai/pages/api-documentation' ? '#1890ff' : '#666',
              fontWeight: location.pathname === '/todo-for-ai/pages/api-documentation' ? 500 : 400,
            }}
          >
            HTTP API文档
          </LinkButton>
        </div>
      </div>

      {/* 右侧：用户区域 - 绝对定位到右边 */}
      <div
        className="header-user-section"
        style={{
          position: 'absolute',
          right: '24px',
        }}
      >
        <span className="welcome-text">
          欢迎使用 Todo for AI
        </span>
        <UserAvatar />
      </div>
    </Header>
  )
}

export default TopNavigation
