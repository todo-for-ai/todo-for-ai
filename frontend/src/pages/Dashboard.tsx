import { useEffect } from 'react'
import { Typography, Card, Row, Col, Statistic } from 'antd'
import {
  ProjectOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  RobotOutlined
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

const Dashboard = () => {
  // 设置网页标题
  useEffect(() => {
    document.title = '仪表板 - Todo for AI'

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [])
  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="page-title">
          仪表板
        </Title>
        <Paragraph className="page-description">
          查看项目和任务的整体概况
        </Paragraph>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总项目数"
              value={4}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={12}
              prefix={<CheckSquareOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="进行中"
              value={5}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="AI执行中"
              value={2}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="最近项目" variant="borderless">
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <ProjectOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>暂无项目数据</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近任务" variant="borderless">
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <CheckSquareOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>暂无任务数据</div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
