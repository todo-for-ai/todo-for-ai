import React, { useState, useEffect } from 'react'
import { 
  Modal, 
  List, 
  Button, 
  message, 
  Typography, 
  Space,
  Popconfirm,
  Empty
} from 'antd'
import { 
  PushpinOutlined, 
  DeleteOutlined, 
  DragOutlined,
  HolderOutlined
} from '@ant-design/icons'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { pinsApi } from '../api/pins'

const { Text } = Typography

interface PinnedProject {
  id: number
  project_id: number
  pin_order: number
  project: {
    id: number
    name: string
    color: string
  }
}

interface SortableItemProps {
  id: string
  pin: PinnedProject
  onRemove: (projectId: number) => void
}

const SortableItem: React.FC<SortableItemProps> = ({ id, pin, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <List.Item
        style={{
          padding: '12px 16px',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          marginBottom: '8px',
          backgroundColor: '#fff',
          cursor: 'move'
        }}
        actions={[
          <Popconfirm
            title="确定要取消Pin这个项目吗？"
            onConfirm={() => onRemove(pin.project_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              danger
            />
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          avatar={
            <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
              <HolderOutlined style={{ color: '#999' }} />
            </div>
          }
          title={
            <Space>
              <PushpinOutlined style={{ color: pin.project.color || '#1890ff' }} />
              <Text>{pin.project.name}</Text>
            </Space>
          }
          description={`项目ID: ${pin.project_id} | 排序: ${pin.pin_order}`}
        />
      </List.Item>
    </div>
  )
}

interface PinManagerProps {
  visible: boolean
  onClose: () => void
  onUpdate: () => void
}

const PinManager: React.FC<PinManagerProps> = ({ visible, onClose, onUpdate }) => {
  const [pins, setPins] = useState<PinnedProject[]>([])
  const [loading, setLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 加载Pin列表
  const loadPins = async () => {
    setLoading(true)
    try {
      const response = await pinsApi.getUserPins()
      // 处理标准API响应格式
      const data = response?.data || response
      if (data && data.pins) {
        setPins(data.pins.sort((a, b) => (a.pin_order || 0) - (b.pin_order || 0)))
      }
    } catch (error) {
      console.error('Failed to load pins:', error)
      message.error('加载Pin列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 移除Pin
  const handleRemovePin = async (projectId: number) => {
    try {
      await pinsApi.unpinProject(projectId)
      message.success('已取消Pin项目')
      loadPins() // 重新加载列表
      onUpdate() // 通知父组件更新
      // 通知其他组件Pin状态更新
      window.dispatchEvent(new CustomEvent('pinUpdated'))
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '取消Pin失败'
      message.error(errorMessage)
    }
  }

  // 拖拽结束处理 - 实时保存排序
  const handleDragEnd = async (event: any) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const newPins = [...pins]
      const oldIndex = newPins.findIndex((item) => item.id.toString() === active.id)
      const newIndex = newPins.findIndex((item) => item.id.toString() === over.id)

      const reorderedPins = arrayMove(newPins, oldIndex, newIndex)
      setPins(reorderedPins)

      // 实时保存新的排序
      try {
        const reorderData = reorderedPins.map((pin, index) => ({
          project_id: pin.project_id,
          pin_order: index + 1
        }))

        await pinsApi.reorderPins(reorderData)
        message.success('Pin顺序已更新')
        onUpdate() // 通知父组件更新导航栏
        // 通知其他组件Pin状态更新
        window.dispatchEvent(new CustomEvent('pinUpdated'))
      } catch (error: any) {
        // 如果保存失败，恢复原来的顺序
        setPins(pins)
        const errorMessage = error.response?.data?.error || '更新Pin顺序失败'
        message.error(errorMessage)
      }
    }
  }

  useEffect(() => {
    if (visible) {
      loadPins()
    }
  }, [visible])

  return (
    <Modal
      title="管理Pin项目"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Text type="secondary">
            拖拽项目来调整Pin在导航栏中的显示顺序，顺序会实时保存。点击删除按钮可以取消Pin项目。
          </Text>
          {pins.length > 0 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已Pin {pins.length}/10 个项目
            </Text>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>正在加载Pin项目...</div>
        </div>
      ) : pins.length === 0 ? (
        <Empty
          description={
            <div>
              <div>暂无Pin的项目</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                在项目详情页面点击Pin按钮可以将项目添加到导航栏
              </div>
            </div>
          }
          style={{ padding: '40px' }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={pins.map(pin => pin.id.toString())} 
            strategy={verticalListSortingStrategy}
          >
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {pins.map((pin) => (
                <SortableItem
                  key={pin.id}
                  id={pin.id.toString()}
                  pin={pin}
                  onRemove={handleRemovePin}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </Modal>
  )
}

export default PinManager
