import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, Tag, Avatar, Tooltip, Progress } from 'antd'
import { UserOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import type { Task } from '../../api/tasks'
import dayjs from 'dayjs'

interface KanbanCardProps {
  task: Task
  priorityColor: string
  priorityText: string
  onClick?: (task: Task) => void
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  priorityColor,
  priorityText,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day')
  const isDueSoon = task.due_date && dayjs(task.due_date).diff(dayjs(), 'day') <= 3 && !isOverdue

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        cursor: isDragging ? 'grabbing' : 'grab',
        marginBottom: '8px',
        boxShadow: isDragging 
          ? '0 8px 24px rgba(0, 0, 0, 0.15)' 
          : '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: isDragging ? '1px solid #1890ff' : '1px solid #d9d9d9',
      }}
      {...attributes}
      {...listeners}
      size="small"
      hoverable
      onClick={() => onClick?.(task)}
      bodyStyle={{ padding: '12px' }}
    >
      {/* 任务标题和描述 */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ 
          fontWeight: 500, 
          marginBottom: '4px',
          fontSize: '14px',
          lineHeight: '1.4',
          color: '#262626'
        }}>
          {task.title}
        </div>
        {task.description && (
          <div style={{ 
            color: '#8c8c8c', 
            fontSize: '12px',
            lineHeight: '1.4'
          }}>
            {task.description.length > 60 
              ? task.description.substring(0, 60) + '...' 
              : task.description}
          </div>
        )}
      </div>

      {/* 进度条 */}
      {task.completion_rate > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <Progress 
            percent={task.completion_rate} 
            size="small" 
            status={task.completion_rate === 100 ? 'success' : 'active'}
            showInfo={false}
          />
        </div>
      )}

      {/* 标签区域 */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '4px',
        marginBottom: '8px'
      }}>
        {/* 优先级标签 */}
        <Tag 
          color={priorityColor}
          style={{ 
            margin: 0, 
            fontSize: '11px',
            lineHeight: '16px',
            padding: '0 4px'
          }}
        >
          {priorityText}
        </Tag>

        {/* 截止时间标签 */}
        {task.due_date && (
          <Tag 
            color={isOverdue ? 'red' : isDueSoon ? 'orange' : 'default'}
            style={{ 
              margin: 0, 
              fontSize: '11px',
              lineHeight: '16px',
              padding: '0 4px'
            }}
            icon={<ClockCircleOutlined />}
          >
            {dayjs(task.due_date).format('MM-DD')}
          </Tag>
        )}

        {/* 内容标签 */}
        {task.content && (
          <Tag 
            style={{ 
              margin: 0, 
              fontSize: '11px',
              lineHeight: '16px',
              padding: '0 4px',
              color: '#1890ff',
              borderColor: '#1890ff'
            }}
            icon={<FileTextOutlined />}
          >
            详情
          </Tag>
        )}

        {/* 自定义标签 */}
        {task.tags && task.tags.slice(0, 2).map(tag => (
          <Tag 
            key={tag}
            style={{ 
              margin: 0, 
              fontSize: '11px',
              lineHeight: '16px',
              padding: '0 4px'
            }}
          >
            {tag}
          </Tag>
        ))}
        {task.tags && task.tags.length > 2 && (
          <Tag 
            style={{ 
              margin: 0, 
              fontSize: '11px',
              lineHeight: '16px',
              padding: '0 4px'
            }}
          >
            +{task.tags.length - 2}
          </Tag>
        )}
      </div>

      {/* 底部信息 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* 任务ID */}
          <span style={{
            fontSize: '11px',
            color: '#8c8c8c',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            #{task.id}
          </span>
        </div>

        {/* AI任务标识 */}
        {task.is_ai_task && (
          <Tooltip title="AI执行任务">
            <Avatar
              size={20}
              icon={<UserOutlined />}
              style={{
                backgroundColor: '#52c41a',
                fontSize: '10px'
              }}
            >
              AI
            </Avatar>
          </Tooltip>
        )}
      </div>

      {/* 过期提示 */}
      {isOverdue && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderTop: '12px solid #ff4d4f',
        }} />
      )}
    </Card>
  )
}

export default KanbanCard
