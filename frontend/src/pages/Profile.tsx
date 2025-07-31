import { useState, useEffect } from 'react'
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Avatar,
  Typography,
  Space,
  Divider,
  message,
  Row,
  Col
} from 'antd'
import {
  UserOutlined,
  KeyOutlined,
  EditOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../stores/useAuthStore'
import { APITokenManager } from '../components/APITokenManager'
import { usePageTranslation } from '../i18n/hooks/useTranslation'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

const Profile = () => {
  const { user, updateUser, isLoading } = useAuthStore()
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
  const { tp } = usePageTranslation('profile')


  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        username: user.username,
        full_name: user.full_name,
        nickname: user.nickname,
        bio: user.bio,
        timezone: user.timezone,
        locale: user.locale
      })
    }
  }, [user, form])

  // 设置网页标题
  useEffect(() => {
    document.title = tp('pageTitle')

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [tp])

  const handleUpdateProfile = async (values: any) => {
    try {
      await updateUser(values)
      message.success(tp('messages.updateSuccess'))
      setIsEditing(false)
    } catch (error: any) {
      message.error(error.response?.data?.error || tp('messages.updateFailed'))
    }
  }



  if (!user) {
    return <div>{tp('messages.loading')}</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2}>{tp('title')}</Title>
        <Paragraph>{tp('subtitle')}</Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          {/* 用户信息卡片 */}
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Avatar
                size={120}
                src={user.avatar_url}
                icon={<UserOutlined />}
                style={{ marginBottom: 16 }}
              />

              
              <Divider />
              
              <Title level={4} style={{ marginBottom: 8 }}>
                {user.full_name || user.nickname || user.username}
              </Title>
              <Text type="secondary">{user.email}</Text>
              
              <div style={{ marginTop: 16 }}>
                <Space direction="vertical" size="small">
                  <Text>
                    <strong>{tp('userInfo.role')}</strong>
                    {user.role === 'admin' ? tp('userInfo.roles.admin') : tp('userInfo.roles.user')}
                  </Text>
                  <Text>
                    <strong>{tp('userInfo.status')}</strong>
                    {user.status === 'active' ? tp('userInfo.statuses.active') : tp('userInfo.statuses.inactive')}
                  </Text>
                  <Text>
                    <strong>{tp('userInfo.registeredAt')}</strong>
                    {new Date(user.created_at).toLocaleDateString()}
                  </Text>
                  {user.last_login_at && (
                    <Text>
                      <strong>{tp('userInfo.lastLogin')}</strong>
                      {new Date(user.last_login_at).toLocaleString()}
                    </Text>
                  )}
                </Space>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Tabs defaultActiveKey="profile" size="large">
            <TabPane
              tab={
                <span>
                  <UserOutlined />
                  {tp('tabs.profile')}
                </span>
              }
              key="profile"
            >
              <Card
                title={tp('basicInfo.title')}
                extra={
                  <Button
                    type={isEditing ? "primary" : "default"}
                    icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
                    onClick={() => {
                      if (isEditing) {
                        form.submit()
                      } else {
                        setIsEditing(true)
                      }
                    }}
                    loading={isLoading}
                  >
                    {isEditing ? tp('buttons.save') : tp('buttons.edit')}
                  </Button>
                }
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleUpdateProfile}
                  disabled={!isEditing}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label={tp('basicInfo.username')}
                        name="username"
                        rules={[
                          { required: true, message: tp('basicInfo.validation.usernameRequired') },
                          { min: 2, message: tp('basicInfo.validation.usernameMinLength') }
                        ]}
                      >
                        <Input placeholder={tp('basicInfo.placeholders.username')} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={tp('basicInfo.nickname')}
                        name="nickname"
                      >
                        <Input placeholder={tp('basicInfo.placeholders.nickname')} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label={tp('basicInfo.fullName')}
                    name="full_name"
                  >
                    <Input placeholder={tp('basicInfo.placeholders.fullName')} />
                  </Form.Item>

                  <Form.Item
                    label={tp('basicInfo.bio')}
                    name="bio"
                  >
                    <Input.TextArea
                      rows={4}
                      placeholder={tp('basicInfo.placeholders.bio')}
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label={tp('basicInfo.timezone')}
                        name="timezone"
                      >
                        <Input placeholder={tp('basicInfo.placeholders.timezone')} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={tp('basicInfo.language')}
                        name="locale"
                      >
                        <Input placeholder={tp('basicInfo.placeholders.language')} />
                      </Form.Item>
                    </Col>
                  </Row>

                  {isEditing && (
                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={isLoading}>
                          {tp('buttons.saveChanges')}
                        </Button>
                        <Button onClick={() => setIsEditing(false)}>
                          {tp('buttons.cancel')}
                        </Button>
                      </Space>
                    </Form.Item>
                  )}
                </Form>
              </Card>
            </TabPane>

            <TabPane
              tab={
                <span>
                  <KeyOutlined />
                  {tp('tabs.tokens')}
                </span>
              }
              key="tokens"
            >
              <APITokenManager />
            </TabPane>


          </Tabs>
        </Col>
      </Row>
    </div>
  )
}

export default Profile
