import { useState } from 'react'
import { Layout, Menu, Typography, Button } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  SettingOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  FileTextOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
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
    {
      key: '/todo-for-ai/pages/context-rules',
      icon: <FileTextOutlined />,
      label: '上下文规则',
    },
    {
      key: '/todo-for-ai/pages/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Layout className="app-layout">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '8px'
        }}>
          <RobotOutlined 
            style={{ 
              fontSize: collapsed ? '24px' : '32px', 
              color: '#1890ff',
              transition: 'all 0.2s'
            }} 
          />
          {!collapsed && (
            <Title 
              level={4} 
              style={{ 
                margin: '8px 0 0 0', 
                color: '#1890ff',
                fontSize: '16px'
              }}
            >
              Todo for AI
            </Title>
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>
      
      <Layout>
        <Header 
          className="app-header"
          style={{ 
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '16px', color: '#666' }}>
              欢迎使用 Todo for AI
            </span>
          </div>
        </Header>
        
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
