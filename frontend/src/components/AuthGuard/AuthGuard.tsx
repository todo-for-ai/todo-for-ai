import React, { useEffect, useState } from 'react'
import { Spin, Result, Button } from 'antd'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  fallback?: React.ReactNode
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  fallback
}) => {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      if (requireAuth) {
        await checkAuth()
      }
      setIsChecking(false)
    }

    verifyAuth()
  }, [requireAuth, checkAuth])

  // 显示加载状态
  if (isLoading || isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px'
      }}>
        <Spin size="large" tip="验证身份中..." />
      </div>
    )
  }

  // 不需要认证的页面
  if (!requireAuth) {
    return <>{children}</>
  }

  // 需要认证但未登录
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    // 直接重定向到登录页面
    return <Navigate to="/todo-for-ai/pages/login" replace />
  }

  // 需要管理员权限但用户不是管理员
  if (requireAdmin && user?.role !== 'admin') {
    return (
      <Result
        status="403"
        title="权限不足"
        subTitle="您需要管理员权限才能访问此页面"
        extra={
          <Button type="primary" href="/todo-for-ai/pages">
            返回首页
          </Button>
        }
      />
    )
  }

  // 用户账户被暂停
  if (user?.status === 'suspended') {
    return (
      <Result
        status="warning"
        title="账户已暂停"
        subTitle="您的账户已被暂停，请联系管理员"
        extra={
          <Button type="primary" onClick={() => useAuthStore.getState().logout()}>
            重新登录
          </Button>
        }
      />
    )
  }

  // 用户账户未激活
  if (user?.status === 'inactive') {
    return (
      <Result
        status="warning"
        title="账户未激活"
        subTitle="您的账户尚未激活，请联系管理员"
        extra={
          <Button type="primary" onClick={() => useAuthStore.getState().logout()}>
            重新登录
          </Button>
        }
      />
    )
  }

  // 通过所有检查，渲染子组件
  return <>{children}</>
}

export default AuthGuard
