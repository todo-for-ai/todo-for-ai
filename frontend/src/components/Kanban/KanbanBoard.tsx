import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
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
import { tasksApi } from '../../api/tasks'
import type { Task } from '../../api/tasks'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

// const { Title } = Typography

interface KanbanBoardProps {
  projectId?: number
  onTaskClick?: (task: Task) => void
}

export interface KanbanBoardRef {
  refresh: () => void
}

const KanbanBoard = forwardRef<KanbanBoardRef, KanbanBoardProps>(({ projectId, onTaskClick }, ref) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // 独立的任务数据获取逻辑，不受任务列表筛选条件影响
  const fetchKanbanTasks = async () => {
    if (!projectId) return

    setLoading(true)
    try {
      // 获取项目的所有任务，不应用任何状态筛选
      const response = await tasksApi.getTasks({
        project_id: projectId,
        per_page: 1000, // 获取所有任务
        sort_by: 'created_at',
        sort_order: 'desc'
      })

      if (response.data && response.data.items) {
        setTasks(response.data.items)
      } else {
        setTasks([])
      }
    } catch (error) {
      console.error('Failed to fetch kanban tasks:', error)
      message.error('获取任务数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKanbanTasks()
  }, [projectId])

  // 计算按状态分组的任务
  const tasksByStatus = useMemo(() => {
    if (!Array.isArray(tasks)) {
      return {
        todo: [],
        in_progress: [],
        review: [],
        done: []
      }
    }

    return {
      todo: tasks.filter(task => task.status === 'todo'),
      in_progress: tasks.filter(task => task.status === 'in_progress'),
      review: tasks.filter(task => task.status === 'review'),
      done: tasks.filter(task => task.status === 'done')
    }
  }, [tasks])



  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: fetchKanbanTasks
  }))

  // 定义看板列
  const columns = [
    { id: 'todo', title: '待办', color: '#f0f0f0' },
    { id: 'in_progress', title: '进行中', color: '#e6f7ff' },
    { id: 'review', title: '待审核', color: '#fff7e6' },
    { id: 'done', title: '已完成', color: '#f6ffed' },
  ]



  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = (Array.isArray(tasks) ? tasks : []).find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // 可以在这里添加拖拽过程中的视觉反馈
  }

  // 独立的任务状态更新逻辑
  const updateTaskStatus = async (taskId: number, newStatus: Task['status']) => {
    try {
      const response = await tasksApi.updateTask(taskId, { status: newStatus })
      if (response.data) {
        // 更新本地状态
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        )
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update task status:', error)
      return false
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as number
    const newStatus = over.id as Task['status']

    const task = (Array.isArray(tasks) ? tasks : []).find(t => t.id === taskId)
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
})

KanbanBoard.displayName = 'KanbanBoard'

export default KanbanBoard
