import React, { useEffect } from 'react'
import { Typography, Card, Space, Divider } from 'antd'

const { Title, Paragraph, Text } = Typography

const PrivacyPolicy: React.FC = () => {
  // 设置网页标题
  useEffect(() => {
    document.title = '隐私政策 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])

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
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <Title level={1}>隐私政策</Title>
              <Text type="secondary">最后更新时间：{new Date().toLocaleDateString('zh-CN')}</Text>
            </div>

            <Divider />

            <div>
              <Title level={2}>1. 信息收集</Title>
              <Paragraph>
                我们收集以下类型的信息：
                <ul>
                  <li><Text strong>账户信息：</Text>当您通过GitHub或Google登录时，我们会收集您的基本账户信息，包括用户名、邮箱地址和头像</li>
                  <li><Text strong>使用数据：</Text>我们收集您如何使用我们服务的信息，包括您创建的项目、任务和使用模式</li>
                  <li><Text strong>技术信息：</Text>我们自动收集某些技术信息，如IP地址、浏览器类型、设备信息和访问时间</li>
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>2. 信息使用</Title>
              <Paragraph>
                我们使用收集的信息用于：
                <ul>
                  <li>提供、维护和改进我们的服务</li>
                  <li>处理您的请求和交易</li>
                  <li>向您发送服务相关的通知</li>
                  <li>分析服务使用情况以改进用户体验</li>
                  <li>检测、预防和解决技术问题</li>
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>3. 信息共享</Title>
              <Paragraph>
                我们不会出售、交易或以其他方式转让您的个人信息给第三方，除非：
                <ul>
                  <li>获得您的明确同意</li>
                  <li>为了提供您请求的服务</li>
                  <li>遵守法律要求或法院命令</li>
                  <li>保护我们的权利、财产或安全</li>
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>4. 数据安全</Title>
              <Paragraph>
                我们采取适当的安全措施来保护您的个人信息：
                <ul>
                  <li>使用加密技术保护数据传输</li>
                  <li>限制对个人信息的访问权限</li>
                  <li>定期审查我们的安全实践</li>
                  <li>使用安全的服务器和数据库</li>
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>5. Cookie和跟踪技术</Title>
              <Paragraph>
                我们使用Cookie和类似技术来：
                <ul>
                  <li>记住您的登录状态</li>
                  <li>保存您的偏好设置</li>
                  <li>分析网站使用情况</li>
                  <li>改善用户体验</li>
                </ul>
                您可以通过浏览器设置控制Cookie的使用。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>6. 第三方服务</Title>
              <Paragraph>
                我们的服务可能包含指向第三方网站的链接或集成第三方服务（如GitHub、Google）。
                这些第三方有自己的隐私政策，我们不对其隐私实践负责。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>7. 数据保留</Title>
              <Paragraph>
                我们会保留您的个人信息，直到：
                <ul>
                  <li>您删除您的账户</li>
                  <li>不再需要为您提供服务</li>
                  <li>法律要求我们删除</li>
                </ul>
                即使在删除后，某些信息可能会在我们的备份系统中保留一段时间。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>8. 您的权利</Title>
              <Paragraph>
                您有权：
                <ul>
                  <li>访问我们持有的关于您的个人信息</li>
                  <li>更正不准确的个人信息</li>
                  <li>删除您的个人信息</li>
                  <li>限制或反对处理您的个人信息</li>
                  <li>数据可携带性</li>
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>9. 儿童隐私</Title>
              <Paragraph>
                我们的服务不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。
                如果我们发现收集了此类信息，我们会立即删除。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>10. 政策变更</Title>
              <Paragraph>
                我们可能会不时更新本隐私政策。重大变更时，我们会通过服务通知您或发送邮件。
                继续使用服务即表示您接受更新后的政策。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>11. 联系我们</Title>
              <Paragraph>
                如果您对本隐私政策有任何疑问或关切，请联系我们：
                <ul>
                  <li>邮箱：privacy@todoforai.com</li>
                  <li>GitHub：https://github.com/todo-for-ai/todo-for-ai</li>
                </ul>
              </Paragraph>
            </div>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                我们致力于保护您的隐私，并确保您的个人信息得到安全处理。
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  )
}

export default PrivacyPolicy
