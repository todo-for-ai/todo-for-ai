import React, { useEffect } from 'react'
import { Typography, Card, Space, Divider } from 'antd'

const { Title, Paragraph, Text } = Typography

const TermsOfService: React.FC = () => {
  // 设置网页标题
  useEffect(() => {
    document.title = '服务条款 - Todo for AI'

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
              <Title level={1}>服务条款</Title>
              <Text type="secondary">最后更新时间：{new Date().toLocaleDateString('zh-CN')}</Text>
            </div>

            <Divider />

            <div>
              <Title level={2}>1. 服务说明</Title>
              <Paragraph>
                Todo for AI（以下简称"本服务"）是一个智能任务管理平台，旨在帮助用户更高效地管理和执行任务。
                通过使用本服务，您同意遵守以下条款和条件。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>2. 用户账户</Title>
              <Paragraph>
                <ul>
                  <li>您需要通过GitHub或Google账户登录使用本服务</li>
                  <li>您有责任保护您的账户安全</li>
                  <li>您不得与他人共享您的账户信息</li>
                  <li>如发现账户被盗用，请立即联系我们</li>
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>3. 使用规范</Title>
              <Paragraph>
                在使用本服务时，您同意：
                <ul>
                  <li>不上传、发布或传输任何违法、有害、威胁、辱骂、骚扰、诽谤、粗俗、淫秽或其他令人反感的内容</li>
                  <li>不干扰或破坏本服务的正常运行</li>
                  <li>不尝试未经授权访问其他用户的账户或数据</li>
                  <li>遵守所有适用的法律法规</li>
                </ul>
              </Paragraph>
            </div>

            <div>
              <Title level={2}>4. 知识产权</Title>
              <Paragraph>
                本服务的所有内容，包括但不限于文本、图形、用户界面、视觉界面、照片、商标、标识、声音或音乐、
                艺术作品和计算机代码，均由我们或我们的许可方拥有、控制或许可，受版权、商标和其他知识产权法保护。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>5. 数据和隐私</Title>
              <Paragraph>
                我们重视您的隐私。有关我们如何收集、使用和保护您的个人信息的详细信息，
                请参阅我们的<Text strong>隐私政策</Text>。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>6. 服务变更</Title>
              <Paragraph>
                我们保留随时修改或终止本服务（或其任何部分）的权利，无论是否通知。
                我们不对您或任何第三方承担因修改、暂停或终止本服务而产生的任何责任。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>7. 免责声明</Title>
              <Paragraph>
                本服务按"现状"提供，不提供任何明示或暗示的保证。我们不保证服务将不间断、
                无错误或完全安全。您使用本服务的风险由您自行承担。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>8. 责任限制</Title>
              <Paragraph>
                在任何情况下，我们对因使用或无法使用本服务而产生的任何直接、间接、偶然、
                特殊或后果性损害不承担责任，即使我们已被告知此类损害的可能性。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>9. 适用法律</Title>
              <Paragraph>
                本条款受中华人民共和国法律管辖。因本条款引起的任何争议应通过友好协商解决，
                协商不成的，应提交有管辖权的人民法院解决。
              </Paragraph>
            </div>

            <div>
              <Title level={2}>10. 联系我们</Title>
              <Paragraph>
                如果您对本服务条款有任何疑问，请通过以下方式联系我们：
                <ul>
                  <li>邮箱：support@todoforai.com</li>
                  <li>GitHub：https://github.com/todo-for-ai/todo-for-ai</li>
                </ul>
              </Paragraph>
            </div>

            <Divider />

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                通过使用Todo for AI服务，您确认已阅读、理解并同意受本服务条款的约束。
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  )
}

export default TermsOfService
