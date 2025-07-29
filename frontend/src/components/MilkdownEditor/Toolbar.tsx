import React from 'react'
import { Button, Space, Tooltip, message } from 'antd'
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined
} from '@ant-design/icons'

interface ToolbarProps {
  previewMode: 'live' | 'edit' | 'preview'
  isFullscreen: boolean
  hasUnsavedChanges: boolean
  hideToolbar: boolean
  value: string
  onTogglePreview: () => void
  onToggleFullscreen: () => void
  onSave?: () => void
  onCopy: () => void
}

const Toolbar: React.FC<ToolbarProps> = ({
  previewMode,
  isFullscreen,
  hasUnsavedChanges,
  hideToolbar,
  value,
  onTogglePreview,
  onToggleFullscreen,
  onSave,
  onCopy
}) => {
  if (hideToolbar) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      message.success('内容已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
    onCopy()
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      borderBottom: '1px solid #d9d9d9',
      backgroundColor: '#fafafa'
    }}>
      <Space>
        <Tooltip title="切换预览模式 (Ctrl+Shift+Enter)">
          <Button
            type="text"
            size="small"
            icon={previewMode === 'edit' ? <EyeOutlined /> : <EditOutlined />}
            onClick={onTogglePreview}
          >
            {previewMode === 'live' ? '实时预览' : previewMode === 'edit' ? '编辑模式' : '预览模式'}
          </Button>
        </Tooltip>
        <Tooltip title="复制内容">
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
          />
        </Tooltip>
      </Space>
      <Space>
        {hasUnsavedChanges && (
          <span style={{ fontSize: '12px', color: '#ff4d4f' }}>
            未保存的更改
          </span>
        )}
        {onSave && (
          <Tooltip title="保存 (Ctrl+S)">
            <Button
              type="text"
              size="small"
              icon={<SaveOutlined />}
              onClick={onSave}
              disabled={!hasUnsavedChanges}
            />
          </Tooltip>
        )}
        <Tooltip title={isFullscreen ? '退出全屏 (F11)' : '全屏 (F11)'}>
          <Button
            type="text"
            size="small"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={onToggleFullscreen}
          />
        </Tooltip>
      </Space>
    </div>
  )
}

export default Toolbar
