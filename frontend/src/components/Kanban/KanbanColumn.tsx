import { useDroppable } from '@dnd-kit/core'
import { Card, Typography, Badge, Button, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const { Title } = Typography

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  count: number
  loading?: boolean
  children: React.ReactNode
  onAddTask?: () => void
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  count,
  loading = false,
  children,
  onAddTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: 300,
        maxWidth: 300,
        height: 'fit-content',
        minHeight: 400,
      }}
    >
      <Card
        size="small"
        style={{
          backgroundColor: isOver ? '#f0f8ff' : color,
          border: isOver ? '2px dashed #1890ff' : '1px solid #d9d9d9',
          transition: 'all 0.2s ease',
          height: '100%',
        }}
        bodyStyle={{ padding: '12px' }}
      >
        {/* 列标题 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Title level={5} style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              {title}
            </Title>
            <Badge 
              count={count} 
              style={{ 
                backgroundColor: '#f0f0f0', 
                color: '#666',
                fontSize: '11px',
                minWidth: '18px',
                height: '18px',
                lineHeight: '18px'
              }} 
            />
          </div>
          
          {onAddTask && (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAddTask}
              style={{ 
                color: '#666',
                fontSize: '12px',
                padding: '2px 4px',
                height: 'auto'
              }}
            />
          )}
        </div>

        {/* 任务列表 */}
        <div style={{ 
          minHeight: 300,
          position: 'relative'
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: 200
            }}>
              <Spin />
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px' 
            }}>
              {children}
            </div>
          )}
          
          {/* 拖拽提示 */}
          {isOver && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(24, 144, 255, 0.1)',
              border: '2px dashed #1890ff',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1890ff',
              fontSize: '14px',
              fontWeight: 500,
              pointerEvents: 'none',
            }}>
              放置任务到此列
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default KanbanColumn
