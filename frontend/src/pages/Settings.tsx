import { useEffect, useState } from 'react'
import { Typography, Card, Form, Button, Select, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { fetchApiClient } from '../api/fetchClient'
import { usePageTranslation } from '../i18n/hooks/useTranslation'
import { useLanguage } from '../contexts/LanguageContext'
import type { SupportedLanguage } from '../i18n'

const { Title, Paragraph } = Typography
const { Option } = Select

const Settings = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>(null)

  // 使用i18n翻译
  const { tp, tc, pageTitle, pageSubtitle } = usePageTranslation('settings')
  const { language, setLanguage, isLoading: languageLoading } = useLanguage()

  // 设置网页标题
  useEffect(() => {
    document.title = `${pageTitle} - Todo for AI`

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [pageTitle])

  // 加载用户设置
  useEffect(() => {
    loadUserSettings()
  }, [])

  const loadUserSettings = async () => {
    try {
      const response = await fetchApiClient.get('/user-settings')
      setSettings(response.data)
      form.setFieldsValue({
        language: response.data.language || language
      })
    } catch (error) {
      console.error('Failed to load user settings:', error)
      // 设置默认值为当前语言
      form.setFieldsValue({
        language: language
      })
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      // 如果语言发生变化，使用语言上下文来更新
      if (values.language !== language) {
        await setLanguage(values.language as SupportedLanguage)
      } else {
        // 如果语言没有变化，直接保存其他设置
        await fetchApiClient.put('/user-settings', values)
      }

      message.success(tp('messages.saveSuccess'))
      setSettings({ ...settings, ...values })
    } catch (error) {
      console.error('Failed to save settings:', error)
      message.error(tp('messages.saveError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="page-title">
          {pageTitle}
        </Title>
        <Paragraph className="page-description">
          {pageSubtitle}
        </Paragraph>
      </div>

      <Card title={tp('sections.general')}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            language: language,
          }}
        >
          <Form.Item
            label={tp('language.title')}
            name="language"
            help={tp('language.description')}
          >
            <Select style={{ width: 200 }} loading={languageLoading}>
              <Option value="zh-CN">{tp('language.options.zh-CN')}</Option>
              <Option value="en">{tp('language.options.en')}</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading || languageLoading}
            >
              {tc('actions.save')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Settings
