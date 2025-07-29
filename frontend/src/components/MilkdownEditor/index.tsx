import React, { useState } from 'react'
import Toolbar from './Toolbar'
import { useEditor, useKeyboardShortcuts } from './hooks'
import '@milkdown/theme-nord/style.css'
import '../MilkdownEditor.css'

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
      className={`milkdown-editor ${isFullscreen ? 'fullscreen' : ''} ${autoHeight ? 'auto-height' : ''}`}
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        overflow: 'hidden',
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: '#fff',
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
          maxHeight: autoHeight && maxHeight
            ? typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
            : undefined,
          overflow: autoHeight ? 'visible' : 'auto',
          padding: '16px',
          backgroundColor: '#fff'
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
