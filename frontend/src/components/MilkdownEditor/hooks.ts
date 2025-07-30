/**
 * ========================================
 * MARKDOWN编辑器HOOKS - 三大法则 + 禁用规则
 * ========================================
 *
 * 【三大法则】此文件的hooks必须遵循Markdown编辑器的三大法则：
 *
 * 1. 【实时保存】提供实时保存相关的hooks和状态管理
 * 2. 【所见即所得】确保编辑器hooks支持所见即所得功能
 * 3. 【无滚动条】hooks不产生滚动条相关的副作用
 *
 * 【禁用规则】
 * ❌ 严禁使用 @uiw/react-md-editor 相关hooks
 * ❌ 严禁使用任何其他Markdown编辑器的hooks
 * ❌ 必须使用Milkdown相关的hooks和API
 *
 * 重要：任何违反这些法则和禁用规则的修改都是不被允许的！
 * ========================================
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { message } from 'antd'
import { MilkdownEditorCore } from './core'

export interface UseEditorOptions {
  value?: string
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  autoSave?: boolean
  autoSaveInterval?: number
  autoHeight?: boolean
  minHeight?: string | number
  maxHeight?: string | number
}

export const useEditor = (options: UseEditorOptions) => {
  const {
    value = '',
    onChange,
    onSave,
    autoSave = false,
    autoSaveInterval = 30000,
    autoHeight = false,
    minHeight = '200px',
    maxHeight
  } = options

  const editorRef = useRef<HTMLDivElement>(null)
  const editorCoreRef = useRef<MilkdownEditorCore | null>(null)
  const [lastSaved, setLastSaved] = useState<string>(value)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // 处理内容变化
  const handleChange = useCallback((markdown: string) => {
    if (onChange) {
      onChange(markdown)
      setHasUnsavedChanges(markdown !== lastSaved)
    }

    // 自动调整高度
    if (autoHeight) {
      adjustHeight()
    }
  }, [onChange, lastSaved, autoHeight])

  // 自动调整高度
  const adjustHeight = useCallback(() => {
    if (!autoHeight || !editorRef.current) return

    const proseMirrorElement = editorRef.current.querySelector('.ProseMirror') as HTMLElement
    
    if (proseMirrorElement) {
      // 获取内容的实际高度
      const contentHeight = proseMirrorElement.scrollHeight

      // 应用最小和最大高度限制
      const minHeightPx = typeof minHeight === 'number' ? minHeight : parseInt(minHeight as string) || 200
      const maxHeightPx = maxHeight ? (typeof maxHeight === 'number' ? maxHeight : parseInt(maxHeight as string)) : Infinity

      // 计算最终高度（包括padding）
      const finalHeight = Math.max(minHeightPx, Math.min(contentHeight + 32, maxHeightPx))

      // 设置编辑器容器高度
      editorRef.current!.style.height = `${finalHeight}px`
    }
  }, [autoHeight, minHeight, maxHeight])

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current) return

    const initEditor = async () => {
      const core = new MilkdownEditorCore({
        container: editorRef.current!,
        initialValue: value,
        onChange: handleChange
      })

      const success = await core.create(value)
      if (success) {
        editorCoreRef.current = core
        setIsReady(true)
        
        // 初始化后调整高度
        if (autoHeight) {
          setTimeout(adjustHeight, 100)
        }
      }
    }

    initEditor()

    return () => {
      if (editorCoreRef.current) {
        editorCoreRef.current.destroy()
        editorCoreRef.current = null
      }
      setIsReady(false)
    }
  }, []) // 只在组件挂载时初始化一次

  // 当外部value变化时更新编辑器内容
  useEffect(() => {
    if (isReady && editorCoreRef.current && value !== undefined) {
      const currentContent = editorCoreRef.current.getCurrentContent()
      if (currentContent !== value) {
        editorCoreRef.current.updateContent(value)
      }
    }
  }, [value, isReady])

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

  // 手动保存
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(value)
      setLastSaved(value)
      setHasUnsavedChanges(false)
    }
  }, [onSave, value])

  return {
    editorRef,
    isReady,
    hasUnsavedChanges,
    handleSave,
    adjustHeight
  }
}

export const useKeyboardShortcuts = (
  onSave: () => void,
  onToggleFullscreen: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            onSave()
            break
          // 移除预览模式切换快捷键，因为Milkdown本身就是所见即所得
        }
      }
      if (e.key === 'F11') {
        e.preventDefault()
        onToggleFullscreen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onToggleFullscreen])
}
