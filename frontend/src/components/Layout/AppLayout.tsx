// import React from 'react' // React 18+ with JSX Transform doesn't need explicit React import
import { Layout } from 'antd'
import { Outlet } from 'react-router-dom'
import TopNavigation from './TopNavigation'
import { Footer } from '../Footer'
import WeChatGroup from '../WeChatGroup'

const { Content } = Layout

const AppLayout = () => {
  return (
    <Layout className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航栏 */}
      <TopNavigation />

      {/* 主要内容区域 */}
      <Content
        style={{
          marginTop: '64px', // 为固定的顶部导航栏留出空间
          padding: '24px',
          flex: '1',
          background: '#f5f5f5',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            minHeight: 'calc(100vh - 64px - 48px - 48px)', // 减去顶部导航栏、padding和页脚高度
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Outlet />
        </div>
      </Content>

      {/* 页脚 */}
      <Footer />

      {/* 微信群组件 - 悬浮在右下角 */}
      <WeChatGroup />
    </Layout>
  )
}

export default AppLayout
