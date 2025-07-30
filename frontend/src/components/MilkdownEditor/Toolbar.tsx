/**
 * ========================================
 * MARKDOWN编辑器工具栏 - 三大法则 + 禁用规则
 * ========================================
 *
 * 【三大法则】此工具栏必须遵循Markdown编辑器的三大法则：
 *
 * 1. 【实时保存】提供保存按钮，显示未保存状态
 * 2. 【所见即所得】不提供预览模式切换，因为Milkdown本身就是所见即所得
 * 3. 【无滚动条】工具栏本身不产生滚动条，保持简洁
 *
 * 【禁用规则】
 * ❌ 严禁使用 @uiw/react-md-editor
 * ❌ 严禁使用任何其他Markdown编辑器替代Milkdown
 * ❌ 严禁添加预览模式切换功能
 *
 * 重要：不要添加预览模式切换功能，Milkdown编辑器本身就是所见即所得的！
 * 任何违反这些规则的修改都是不被允许的！
 * ========================================
 */

import React from 'react'
import { Button, Space, Tooltip, message } from 'antd'
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  SaveOutlined,
  CopyOutlined
} from '@ant-design/icons'
import ThemeSelector from '../ThemeSelector'


interface ToolbarProps {
  isFullscreen: boolean
  hasUnsavedChanges: boolean
  hideToolbar: boolean
  value: string
  onToggleFullscreen: () => void
  onSave?: () => void
  onCopy: () => void
}

const Toolbar: React.FC<ToolbarProps> = ({
  isFullscreen,
  hasUnsavedChanges,
  hideToolbar,
  value,
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
        {/* 移除预览模式切换按钮，因为Milkdown本身就是所见即所得的编辑器 */}
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

        {/* 主题选择器 - 集成真正的主题切换功能 */}
        <div style={{
          borderLeft: '1px solid #d9d9d9',
          paddingLeft: '8px',
          marginLeft: '4px'
        }}>
          <ThemeSelector mode="dropdown" size="small" />
        </div>

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
