import React, { useEffect } from 'react'
import { Card, Button, Typography, Space, Divider, Alert } from 'antd'
import { GithubOutlined, GoogleOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/useAuthStore'
import { useTranslation } from '../i18n/hooks/useTranslation'
import LanguageSwitch from '../components/LanguageSwitch'

const { Title, Paragraph } = Typography

const Login: React.FC = () => {
  const { loginWithGitHub, loginWithGoogle, isLoading, error, isAuthenticated } = useAuthStore()
  const { t } = useTranslation('login')

  useEffect(() => {
    // 如果已经登录，重定向到主页
    if (isAuthenticated) {
      window.location.href = '/todo-for-ai/pages'
    }
  }, [isAuthenticated])

  // 设置网页标题
  useEffect(() => {
    document.title = t('pageTitle')

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [t])

  const handleGitHubLogin = () => {
    loginWithGitHub('/todo-for-ai/pages')
  }

  const handleGoogleLogin = () => {
    loginWithGoogle('/todo-for-ai/pages')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      position: 'relative'
    }}>
      {/* 语言切换按钮 */}
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <LanguageSwitch size="small" />
      </div>

      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            {t('title')}
          </Title>
          <Paragraph style={{ margin: '8px 0 0 0', color: '#666' }}>
            {t('subtitle')}
          </Paragraph>
        </div>

        {error && (
          <Alert
            message={t('loginFailed')}
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>
              {t('chooseLoginMethod')}
            </Title>

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                icon={<GithubOutlined />}
                loading={isLoading}
                onClick={handleGitHubLogin}
                style={{
                  width: '100%',
                  height: 48,
                  fontSize: 16,
                  borderRadius: 8,
                  backgroundColor: '#24292e',
                  borderColor: '#24292e',
                }}
              >
                {t('loginWithGitHub')}
              </Button>

              <Button
                size="large"
                icon={<GoogleOutlined />}
                loading={isLoading}
                onClick={handleGoogleLogin}
                style={{
                  width: '100%',
                  height: 48,
                  fontSize: 16,
                  borderRadius: 8,
                  backgroundColor: '#db4437',
                  borderColor: '#db4437',
                  color: 'white',
                }}
              >
                {t('loginWithGmail')}
              </Button>
            </Space>
          </div>

          <Divider style={{ margin: '16px 0' }}>
            <span style={{ color: '#999', fontSize: 12 }}>{t('supportedMethods')}</span>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Space size="large">
              <div style={{ textAlign: 'center' }}>
                <GithubOutlined style={{ fontSize: 24, color: '#333' }} />
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>GitHub</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <GoogleOutlined style={{ fontSize: 24, color: '#db4437' }} />
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Gmail</div>
              </div>
            </Space>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Paragraph style={{ fontSize: 12, color: '#999', margin: 0 }}>
              {t('agreement.text')}
              <a
                href="/todo-for-ai/pages/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1890ff', textDecoration: 'none' }}
              >
                {t('agreement.terms')}
              </a>
              {t('agreement.and')}
              <a
                href="/todo-for-ai/pages/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1890ff', textDecoration: 'none' }}
              >
                {t('agreement.privacy')}
              </a>
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default Login
