import { useState, useEffect, useRef } from 'react'
import { Typography, Select, Button, Space, Drawer } from 'antd'
import { ReloadOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useProjectStore } from '../stores'
import { KanbanBoard } from '../components/Kanban'
import type { KanbanBoardRef } from '../components/Kanban/KanbanBoard'
import { MarkdownEditor } from '../components/MarkdownEditor'
import type { Task } from '../api/tasks'

const { Title, Paragraph } = Typography
const { Option } = Select

const Kanban = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>()
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const kanbanRef = useRef<KanbanBoardRef>(null)

  const {
    projects,
    fetchProjects,
  } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // 设置网页标题
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId)
      const projectName = project?.name || '未知项目'
      document.title = `${projectName} - 看板视图 - Todo for AI`
    } else {
      document.title = '看板视图 - Todo for AI'
    }

    // 组件卸载时恢复默认标题
    return () => {
      document.title = 'Todo for AI'
    }
  }, [selectedProjectId, projects])

  const handleProjectChange = (projectId: number) => {
    setSelectedProjectId(projectId)
  }

  const handleTaskClick = (task: Task) => {
    setViewingTask(task)
    setIsDetailVisible(true)
  }

  const handleRefresh = () => {
    kanbanRef.current?.refresh()
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="page-container" style={{ padding: 0 }}>
      {/* 页面头部 */}
      <div style={{ 
        padding: '24px 24px 16px 24px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff'
      }}>
        <div className="flex-between">
          <div>
            <Title level={2} className="page-title" style={{ margin: 0 }}>
              任务看板
            </Title>
            <Paragraph className="page-description" style={{ margin: '8px 0 0 0' }}>
              拖拽式任务管理，可视化工作流程
            </Paragraph>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              刷新
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              disabled={!selectedProjectId}
            >
              新建任务
            </Button>
          </Space>
        </div>

        {/* 项目选择器 */}
        <div style={{ marginTop: '16px' }}>
          <Space>
            <span style={{ fontWeight: 500 }}>选择项目：</span>
            <Select
              placeholder="请选择项目"
              style={{ width: 300 }}
              value={selectedProjectId}
              onChange={handleProjectChange}
              allowClear
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: project.color,
                        flexShrink: 0
                      }} 
                    />
                    <span>{project.name}</span>
                  </div>
                </Option>
              ))}
            </Select>
            
            {selectedProject && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '4px 12px',
                backgroundColor: '#f6f8fa',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#666'
              }}>
                <span>当前项目：</span>
                <div 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: selectedProject.color,
                  }} 
                />
                <span style={{ fontWeight: 500 }}>{selectedProject.name}</span>
              </div>
            )}
          </Space>
        </div>
      </div>

      {/* 看板内容 */}
      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 200px)' }}>
        {selectedProjectId ? (
          <KanbanBoard
            ref={kanbanRef}
            projectId={selectedProjectId}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: 400,
            color: '#999'
          }}>
            <SettingOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>请选择一个项目</div>
            <div style={{ fontSize: '14px' }}>选择项目后即可查看和管理任务看板</div>
          </div>
        )}
      </div>

      {/* 任务详情抽屉 */}
      <Drawer
        title="任务详情"
        placement="right"
        width={800}
        open={isDetailVisible}
        onClose={() => setIsDetailVisible(false)}
      >
        {viewingTask && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <Title level={3}>{viewingTask.title}</Title>
              {viewingTask.description && (
                <Paragraph style={{ color: 'rgba(0, 0, 0, 0.65)' }}>
                  {viewingTask.description}
                </Paragraph>
              )}
            </div>

            <div>
              <Title level={4}>任务内容</Title>
              <MarkdownEditor
                value={viewingTask.content || ''}
                readOnly
                height={400}
                hideToolbar
                preview="preview"
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default Kanban
