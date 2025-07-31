import React, { useEffect } from 'react'
import { Typography, Card, Space, Divider } from 'antd'
import { useTranslation } from '../i18n/hooks/useTranslation'
import LanguageSwitch from '../components/LanguageSwitch'

const { Title, Paragraph, Text } = Typography

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation('privacy')

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
              <Title level={2}>{t('sections.collection.title')}</Title>
              <Paragraph>
                {t('sections.collection.intro')}
                <ul>
                  <li><Text strong>{t('sections.collection.account').split('：')[0]}：</Text>{t('sections.collection.account').split('：')[1]}</li>
                  <li><Text strong>{t('sections.collection.usage').split('：')[0]}：</Text>{t('sections.collection.usage').split('：')[1]}</li>
                  <li><Text strong>{t('sections.collection.technical').split('：')[0]}：</Text>{t('sections.collection.technical').split('：')[1]}</li>
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
              <Title level={2}>{t('sections.sharing.title')}</Title>
              <Paragraph>
                {t('sections.sharing.intro')}
                <ul>
                  {(t('sections.sharing.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.security.title')}</Title>
              <Paragraph>
                {t('sections.security.intro')}
                <ul>
                  {(t('sections.security.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.cookies.title')}</Title>
              <Paragraph>
                {t('sections.cookies.intro')}
                <ul>
                  {(t('sections.cookies.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                {t('sections.cookies.control')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.thirdParty.title')}</Title>
              <Paragraph>
                {t('sections.thirdParty.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.retention.title')}</Title>
              <Paragraph>
                {t('sections.retention.intro')}
                <ul>
                  {(t('sections.retention.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                {t('sections.retention.backup')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.rights.title')}</Title>
              <Paragraph>
                {t('sections.rights.intro')}
                <ul>
                  {(t('sections.rights.items', { returnObjects: true }) as string[]).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.children.title')}</Title>
              <Paragraph>
                {t('sections.children.content')}
              </Paragraph>
            </div>

            <div>
              <Title level={2}>{t('sections.changes.title')}</Title>
              <Paragraph>
                {t('sections.changes.content')}
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

export default PrivacyPolicy
