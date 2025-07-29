import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, Tag, Avatar, Tooltip, Space, message } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useTaskStore } from '../../stores'
import type { Task } from '../../api/tasks'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

// const { Title } = Typography

interface KanbanBoardProps {
  projectId?: number
  onTaskClick?: (task: Task) => void
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, onTaskClick }) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  const {
    tasks,
    loading,
    fetchTasks,
    updateTaskStatus,
    setQueryParams,
  } = useTaskStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    if (projectId) {
      setQueryParams({ project_id: projectId })
    }
    fetchTasks()
  }, [projectId, fetchTasks, setQueryParams])

  // 定义看板列
  const columns = [
    { id: 'todo', title: '待办', color: '#f0f0f0' },
    { id: 'in_progress', title: '进行中', color: '#e6f7ff' },
    { id: 'review', title: '待审核', color: '#fff7e6' },
    { id: 'done', title: '已完成', color: '#f6ffed' },
  ]

  // 按状态分组任务
  const tasksByStatus = tasks.reduce((acc, task) => {
    const status = task.status
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // 可以在这里添加拖拽过程中的视觉反馈
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as number
    const newStatus = over.id as Task['status']
    
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    try {
      const success = await updateTaskStatus(taskId, newStatus)
      if (success) {
        message.success(`任务已移动到"${columns.find(c => c.id === newStatus)?.title}"`)
      }
    } catch (error) {
      message.error('更新任务状态失败')
    }
  }

  const getTaskCount = (status: string) => {
    return tasksByStatus[status]?.length || 0
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ff4d4f'
      case 'high': return '#fa8c16'
      case 'medium': return '#faad14'
      case 'low': return '#52c41a'
      default: return '#d9d9d9'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return '紧急'
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '未设置'
    }
  }

  return (
    <div className="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          padding: '16px',
          overflowX: 'auto',
          minHeight: 'calc(100vh - 200px)'
        }}>
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              count={getTaskCount(column.id)}
              loading={loading}
            >
              <SortableContext
                items={tasksByStatus[column.id]?.map(task => task.id) || []}
                strategy={verticalListSortingStrategy}
              >
                {tasksByStatus[column.id]?.map(task => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    priorityColor={getPriorityColor(task.priority)}
                    priorityText={getPriorityText(task.priority)}
                    onClick={onTaskClick}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <Card
              size="small"
              style={{
                width: 280,
                cursor: 'grabbing',
                transform: 'rotate(5deg)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <div style={{ 
                  fontWeight: 500, 
                  marginBottom: '4px',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {activeTask.title}
                </div>
                {activeTask.description && (
                  <div style={{ 
                    color: '#666', 
                    fontSize: '12px',
                    lineHeight: '1.4'
                  }}>
                    {activeTask.description.length > 60 
                      ? activeTask.description.substring(0, 60) + '...' 
                      : activeTask.description}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="small">
                  <Tag 
                    color={getPriorityColor(activeTask.priority)}
                    style={{ margin: 0, fontSize: '11px' }}
                  >
                    {getPriorityText(activeTask.priority)}
                  </Tag>
                  {activeTask.due_date && (
                    <Tag style={{ margin: 0, fontSize: '11px' }}>
                      {new Date(activeTask.due_date).toLocaleDateString('zh-CN', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Tag>
                  )}
                </Space>
                
                {activeTask.is_ai_task && (
                  <Tooltip title="AI执行任务">
                    <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }}>
                      AI
                    </Avatar>
                  </Tooltip>
                )}
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default KanbanBoard
