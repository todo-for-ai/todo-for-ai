import React, { useEffect } from 'react'
import { Typography, Card, Space, Divider } from 'antd'
import { useTranslation } from '../i18n/hooks/useTranslation'
import LanguageSwitch from '../components/LanguageSwitch'

const { Title, Paragraph, Text } = Typography

const TermsOfService: React.FC = () => {
  const { t } = useTranslation('terms')

  // 设置网页标题
  useEffect(() => {
    document.title = t('pageTitle')

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [t])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto'
      }}>
        <Card
          extra={
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <LanguageSwitch size="small" />
            </div>
          }
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <Title level={1}>{t('title')}</Title>
              <Text type="secondary">{t('lastUpdated')}{new Date().toLocaleDateString()}</Text>
            </div>

            <Divider />

            <div>
              <Title level={2}>{t('sections.service.title')}</Title>
              <Paragraph>
                {t('sections.service.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.account.title')}</Title>
              <Paragraph>
                <ul>
                  {(t('sections.account.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.usage.title')}</Title>
              <Paragraph>
                {t('sections.usage.intro')}
                <ul>
                  {(t('sections.usage.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.ip.title')}</Title>
              <Paragraph>
                {t('sections.ip.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.privacy.title')}</Title>
              <Paragraph>
                {t('sections.privacy.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.changes.title')}</Title>
              <Paragraph>
                {t('sections.changes.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.disclaimer.title')}</Title>
              <Paragraph>
                {t('sections.disclaimer.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.liability.title')}</Title>
              <Paragraph>
                {t('sections.liability.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.law.title')}</Title>
              <Paragraph>
                {t('sections.law.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.contact.title')}</Title>
              <Paragraph>
                {t('sections.contact.intro')}
                <ul>
                  <li>{t('sections.contact.email')}</li>
                  <li>{t('sections.contact.github')}</li>
                </ul>
              </Paragraph>
            </div>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                {t('footer')}
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  )
}

export default TermsOfService
