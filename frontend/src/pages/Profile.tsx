import React, { useState, useEffect } from 'react'
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

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

const Profile = () => {
  const { user, updateUser, isLoading } = useAuthStore()
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)


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
    document.title = '个人中心 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

  const handleUpdateProfile = async (values: any) => {
    try {
      await updateUser(values)
      message.success('个人信息更新成功')
      setIsEditing(false)
    } catch (error: any) {
      message.error(error.response?.data?.error || '更新失败')
    }
  }



  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2}>个人中心</Title>
        <Paragraph>管理您的个人信息和API Token</Paragraph>
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
                    <strong>角色：</strong>
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </Text>
                  <Text>
                    <strong>状态：</strong>
                    {user.status === 'active' ? '活跃' : '非活跃'}
                  </Text>
                  <Text>
                    <strong>注册时间：</strong>
                    {new Date(user.created_at).toLocaleDateString()}
                  </Text>
                  {user.last_login_at && (
                    <Text>
                      <strong>最后登录：</strong>
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
                  个人信息
                </span>
              }
              key="profile"
            >
              <Card
                title="基本信息"
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
                    {isEditing ? '保存' : '编辑'}
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
                        label="用户名"
                        name="username"
                        rules={[
                          { required: true, message: '请输入用户名' },
                          { min: 2, message: '用户名至少2个字符' }
                        ]}
                      >
                        <Input placeholder="请输入用户名" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="昵称"
                        name="nickname"
                      >
                        <Input placeholder="请输入昵称" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="全名"
                    name="full_name"
                  >
                    <Input placeholder="请输入全名" />
                  </Form.Item>

                  <Form.Item
                    label="个人简介"
                    name="bio"
                  >
                    <Input.TextArea 
                      rows={4} 
                      placeholder="介绍一下自己..." 
                      maxLength={500}
                      showCount
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="时区"
                        name="timezone"
                      >
                        <Input placeholder="如：Asia/Shanghai" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="语言"
                        name="locale"
                      >
                        <Input placeholder="如：zh-CN" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {isEditing && (
                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" loading={isLoading}>
                          保存更改
                        </Button>
                        <Button onClick={() => setIsEditing(false)}>
                          取消
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
                  API Token
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
