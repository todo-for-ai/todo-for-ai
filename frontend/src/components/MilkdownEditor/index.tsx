import React, { useState } from 'react'
import Toolbar from './Toolbar'
import { useEditor, useKeyboardShortcuts } from './hooks'
import { useThemeContext, useThemeClasses } from '../../contexts/ThemeContext'
import '@milkdown/theme-nord/style.css'
import './themes.css'

/**
 * ========================================
 * MARKDOWN编辑器核心规则 - 三大法则
 * ========================================
 *
 * 无论是哪个主题，都必须遵循以下三个核心法则：
 *
 * 1. 【实时保存】无论是哪个主题，都必须要能够支持内容实时保存，这是核心功能
 * 2. 【所见即所得】无论是哪个主题，都要能够所见即所得，这是核心功能，不要是源码模式
 * 3. 【无滚动条】无论是哪个主题，都不要有滚动条，如果内容太长，就直接高度动态自适应变高就可以了，
 *    我们只需要页面级别的滚动条，不要有Markdown编辑器级别的滚动条，这条也非常重要
 *
 * 后续新增主题以及修改主题，都必须遵循这三个法则！
 * ========================================
 */

export interface MilkdownEditorProps {
  value?: string
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  placeholder?: string
  height?: string | number
  minHeight?: string | number
  maxHeight?: string | number
  autoHeight?: boolean
  style?: React.CSSProperties
  readOnly?: boolean
  hideToolbar?: boolean
  preview?: 'live' | 'edit' | 'preview'
  autoSave?: boolean
  autoSaveInterval?: number
  taskId?: number
  enableImageUpload?: boolean
}

const MilkdownEditor: React.FC<MilkdownEditorProps> = ({
  value = '',
  onChange,
  onSave,
  placeholder = '请输入任务内容...',
  height = '300px',
  minHeight = '200px',
  maxHeight,
  autoHeight = false,
  style,
  readOnly = false,
  hideToolbar = false,
  preview = 'live',
  autoSave = false,
  autoSaveInterval = 30000,
  taskId,
  enableImageUpload = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'live' | 'edit' | 'preview'>(preview)

  // 使用主题
  const { getThemeClass } = useThemeClasses()

  const {
    editorRef,
    isReady,
    hasUnsavedChanges,
    handleSave
  } = useEditor({
    value,
    onChange,
    onSave,
    autoSave,
    autoSaveInterval,
    autoHeight,
    minHeight,
    maxHeight
  })

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 切换预览模式
  const togglePreviewMode = () => {
    const modes: Array<'live' | 'edit' | 'preview'> = ['edit', 'live', 'preview']
    const currentIndex = modes.indexOf(previewMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setPreviewMode(modes[nextIndex])
  }

  // 键盘快捷键
  useKeyboardShortcuts(handleSave, togglePreviewMode, toggleFullscreen)

  return (
    <div
      className={getThemeClass(`milkdown-editor ${isFullscreen ? 'fullscreen' : ''} ${autoHeight ? 'auto-height' : ''} ${readOnly ? 'readonly' : ''}`)}
      style={{
        overflow: 'visible',
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }),
        ...style
      }}
    >
      <Toolbar
        previewMode={previewMode}
        isFullscreen={isFullscreen}
        hasUnsavedChanges={hasUnsavedChanges}
        hideToolbar={hideToolbar}
        value={value}
        onTogglePreview={togglePreviewMode}
        onToggleFullscreen={toggleFullscreen}
        onSave={onSave ? handleSave : undefined}
        onCopy={() => {}}
      />
      
      <div
        ref={editorRef}
        style={{
          height: isFullscreen
            ? `calc(100vh - ${hideToolbar ? '0px' : '60px'})`
            : autoHeight
            ? 'auto'
            : typeof height === 'number' ? `${height}px` : height,
          minHeight: autoHeight
            ? typeof minHeight === 'number' ? `${minHeight}px` : minHeight
            : undefined,
          maxHeight: autoHeight
            ? undefined  // autoHeight模式下永远不设置maxHeight，让编辑器完全自适应
            : maxHeight
            ? typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
            : undefined,
          overflow: autoHeight ? 'visible' : 'auto'  // autoHeight模式下使用visible，固定高度模式下使用auto
        }}
        data-placeholder={placeholder}
      />
      
      {!isReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#999',
          fontSize: '14px'
        }}>
          编辑器加载中...
        </div>
      )}
    </div>
  )
}

export default MilkdownEditor
