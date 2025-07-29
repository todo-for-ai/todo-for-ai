import React, { useEffect, useRef, useState } from 'react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { nord } from '@milkdown/theme-nord'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { Button, Space, Tooltip, message } from 'antd'
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined
} from '@ant-design/icons'
import '@milkdown/theme-nord/style.css'
import './MilkdownEditor.css'

interface MilkdownEditorProps {
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
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInstanceRef = useRef<Editor | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'live' | 'edit' | 'preview'>(preview)
  const [lastSaved, setLastSaved] = useState<string>(value)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 自动调整高度
  const adjustHeight = () => {
    if (!autoHeight || !editorRef.current) return

    const proseMirrorElement = editorRef.current.querySelector('.ProseMirror') as HTMLElement
    const editorElement = editorRef.current.querySelector('.milkdown .editor') as HTMLElement

    if (proseMirrorElement && editorElement) {
      // 获取内容的实际高度
      const contentHeight = proseMirrorElement.scrollHeight

      // 应用最小和最大高度限制
      const minHeightPx = typeof minHeight === 'number' ? minHeight : parseInt(minHeight as string) || 200
      const maxHeightPx = maxHeight ? (typeof maxHeight === 'number' ? maxHeight : parseInt(maxHeight as string)) : Infinity

      // 计算最终高度（包括padding）
      const finalHeight = Math.max(minHeightPx, Math.min(contentHeight + 32, maxHeightPx))

      // 设置编辑器容器高度
      editorRef.current.style.height = `${finalHeight}px`
    }
  }

  // 自动保存
  useEffect(() => {
    if (!autoSave || !onChange || !hasUnsavedChanges) return

    const timer = setTimeout(() => {
      if (onSave && value !== lastSaved) {
        onSave(value)
        setLastSaved(value)
        setHasUnsavedChanges(false)
        message.success('自动保存成功')
      }
    }, autoSaveInterval)

    return () => clearTimeout(timer)
  }, [value, autoSave, autoSaveInterval, hasUnsavedChanges, lastSaved, onSave])

  // 处理内容变化
  const handleChange = (markdown: string) => {
    if (onChange) {
      onChange(markdown)
      setHasUnsavedChanges(markdown !== lastSaved)
    }

    // 自动调整高度
    if (autoHeight) {
      setTimeout(adjustHeight, 0)
    }
  }

  // 手动保存
  const handleSave = () => {
    if (onSave) {
      onSave(value)
      setLastSaved(value)
      setHasUnsavedChanges(false)
      message.success('保存成功')
    }
  }

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      message.success('内容已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }

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

  useEffect(() => {
    if (!editorRef.current) return

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorRef.current)
        ctx.set(defaultValueCtx, value)

        // 设置监听器
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            handleChange(markdown)
          }
        })
      })
      .use(nord)
      .use(commonmark)
      .use(gfm)
      .use(listener)

    editor.create().then(() => {
      editorInstanceRef.current = editor

      // 初始化后调整高度
      if (autoHeight) {
        setTimeout(adjustHeight, 100)

        // 设置 ResizeObserver 监听内容变化
        const proseMirrorElement = editorRef.current?.querySelector('.ProseMirror') as HTMLElement
        if (proseMirrorElement && window.ResizeObserver) {
          const resizeObserver = new ResizeObserver(() => {
            adjustHeight()
          })
          resizeObserver.observe(proseMirrorElement)

          // 保存 observer 引用以便清理
          ;(editorInstanceRef.current as any)._resizeObserver = resizeObserver
        }
      }
    })

    return () => {
      if (editorInstanceRef.current) {
        // 清理 ResizeObserver
        const resizeObserver = (editorInstanceRef.current as any)._resizeObserver
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
        editorInstanceRef.current.destroy()
      }
    }
  }, [])

  // 当外部value变化时更新编辑器内容
  useEffect(() => {
    if (editorInstanceRef.current && value !== undefined) {
      editorInstanceRef.current.action((ctx) => {
        ctx.set(defaultValueCtx, value)
      })
      // 内容更新后调整高度
      if (autoHeight) {
        setTimeout(adjustHeight, 100)
      }
    }
  }, [value, autoHeight])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            handleSave()
            break
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault()
              togglePreviewMode()
            }
            break
        }
      }
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const customToolbar = !hideToolbar && (
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
            onClick={togglePreviewMode}
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
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            />
          </Tooltip>
        )}
        <Tooltip title={isFullscreen ? '退出全屏 (F11)' : '全屏 (F11)'}>
          <Button
            type="text"
            size="small"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          />
        </Tooltip>
      </Space>
    </div>
  )

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
      {customToolbar}
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
    </div>
  )
}

export default MilkdownEditor
