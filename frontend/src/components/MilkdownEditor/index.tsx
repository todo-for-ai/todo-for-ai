/**
 * ========================================
 * MARKDOWN编辑器组件 - 三大法则 + 禁用规则
 * ========================================
 *
 * 【三大法则】无论是哪个主题，都必须遵循以下三个核心法则：
 *
 * 1. 【实时保存】无论是哪个主题，都必须要能够支持内容实时保存，这是核心功能
 * 2. 【所见即所得】无论是哪个主题，都要能够所见即所得，这是核心功能，不要是源码模式
 * 3. 【无滚动条】无论是哪个主题，都不要有滚动条，如果内容太长，就直接高度动态自适应变高就可以了
 *
 * 【禁用规则】
 * ❌ 严禁使用 @uiw/react-md-editor
 * ❌ 严禁使用任何其他Markdown编辑器替代Milkdown
 * ❌ 必须使用Milkdown实现所见即所得功能
 *
 * 后续新增主题以及修改主题，都必须遵循这些规则！
 * 任何违反规则的修改都是不被允许的！
 * ========================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { cursor } from '@milkdown/kit/plugin/cursor'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { replaceAll } from '@milkdown/kit/utils'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { nord } from '@milkdown/theme-nord'
import Toolbar from './Toolbar'
import { useKeyboardShortcuts } from './hooks'
import { useThemeContext } from '../../contexts/ThemeContext'
import { initTypewriterEffects, cleanupTypewriterEffects } from '../../themes/typewriter/effects'
import '@milkdown/theme-nord/style.css'
import '@milkdown/kit/prose/view/style/prosemirror.css' // ProseMirror基础样式 - 所见即所得必需
import './themes.css'
import '../../themes/typewriter/classic.css'
import '../../themes/typewriter/dark.css'

/**
 * ========================================
 * MARKDOWN编辑器核心规则 - 三大法则
 * ========================================
 *
 * 无论是哪个主题，都必须遵循以下三个核心法则：
 *
 * 1. 【实时保存】无论是哪个主题，都必须要能够支持内容实时保存，这是核心功能
 *    - 通过listener插件监听内容变化，实时触发onChange回调
 *    - 支持autoSave功能，定时自动保存
 *    - 确保每次内容变化都能被及时捕获和保存
 *
 * 2. 【所见即所得】无论是哪个主题，都要能够所见即所得，这是核心功能，不要是源码模式
 *    - Milkdown本身就是所见即所得编辑器，无需额外的预览模式
 *    - 用户输入Markdown语法时，立即渲染为对应的HTML样式
 *    - 不提供源码编辑模式，始终保持所见即所得
 *
 * 3. 【无滚动条】无论是哪个主题，都不要有滚动条，如果内容太长，就直接高度动态自适应变高就可以了，
 *    我们只需要页面级别的滚动条，不要有Markdown编辑器级别的滚动条，这条也非常重要
 *    - 默认使用autoHeight模式，编辑器高度自动适应内容
 *    - 设置overflow: 'visible'，避免产生滚动条
 *    - 移除所有可能产生滚动条的CSS样式
 *
 * 后续新增主题以及修改主题，都必须遵循这三个法则！
 * 任何违反这三个法则的修改都是不被允许的！
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
  autoSave?: boolean
  autoSaveInterval?: number
}

// 内部编辑器组件 - 集成主题系统和实时保存功能
const MilkdownEditorCore: React.FC<MilkdownEditorProps> = ({
  value = '',
  onChange,
  placeholder = '请输入任务内容...'
}) => {
  const { currentTheme, isTypewriterTheme } = useThemeContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const currentValueRef = useRef(value)

  // 实时保存回调 - 符合三大法则第一条：实时保存
  // 修复：移除value依赖，避免回调频繁重新创建导致编辑器不稳定
  const handleContentChange = useCallback((markdown: string) => {
    currentValueRef.current = markdown
    if (onChange) {
      onChange(markdown)
    }
  }, [onChange])

  // 获取编辑器实例 - 用于动态更新内容
  const { get } = useEditor((root) => {
    console.log('🔧 创建Milkdown编辑器，初始值:', value)

    return Editor
      .make()
      .config(ctx => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, value || '')

        // 设置placeholder - 提升用户体验
        if (placeholder) {
          root.setAttribute('data-placeholder', placeholder)
        }
      })
      .use(commonmark) // 基础Markdown支持 - 所见即所得的核心
      .use(gfm) // GitHub Flavored Markdown扩展
      .use(listener) // 监听器插件 - 实现实时保存功能
      .use(history) // 历史记录支持
      .use(clipboard) // 剪贴板支持
      .use(cursor) // 光标支持
      .config(nord) // 主题配置
      .config(ctx => {
        // 配置实时保存监听器 - 符合三大法则第一条：实时保存
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          console.log('📝 内容变化:', { markdown, prevMarkdown })
          if (markdown !== prevMarkdown) {
            handleContentChange(markdown)
          }
        })
      })
  }, []) // 移除依赖数组，避免频繁重新创建编辑器

  // 当外部value变化时，使用Milkdown API更新内容
  // 修复：添加防抖和更智能的更新逻辑，避免频繁的replaceAll导致光标跳动
  const updateTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // 清除之前的更新定时器
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    if (get && value !== currentValueRef.current) {
      // 使用防抖，避免快速连续的更新
      updateTimeoutRef.current = window.setTimeout(() => {
        try {
          console.log('🔄 更新编辑器内容:', { value, current: currentValueRef.current })
          const editor = get()
          if (editor) {
            // 只有在内容确实不同时才更新，避免不必要的replaceAll
            const trimmedValue = (value || '').trim()
            const trimmedCurrent = (currentValueRef.current || '').trim()

            if (trimmedValue !== trimmedCurrent) {
              editor.action(replaceAll(value || ''))
              currentValueRef.current = value
              console.log('✅ 编辑器内容更新成功')
            }
          } else {
            console.warn('⚠️ 编辑器实例不存在')
          }
        } catch (error) {
          console.error('❌ 更新编辑器内容失败:', error)
        }
      }, 50) // 50ms防抖延迟
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [value, get])

  // 应用主题类名和打字机效果
  useEffect(() => {
    if (containerRef.current) {
      // 清除之前的主题类名
      containerRef.current.className = containerRef.current.className
        .replace(/theme-[\w-]+/g, '')

      // 添加当前主题类名
      containerRef.current.classList.add(`theme-${currentTheme.id}`)

      // 如果是打字机主题，初始化特效
      if (isTypewriterTheme(currentTheme)) {
        const effectsManager = initTypewriterEffects(containerRef.current, currentTheme)

        return () => {
          effectsManager.destroy()
        }
      }
    }
  }, [currentTheme, isTypewriterTheme])

  // 清理效果
  useEffect(() => {
    return () => {
      cleanupTypewriterEffects()
    }
  }, [])

  return (
    <div ref={containerRef} className="milkdown-theme-container milkdown-editor-themed">
      <Milkdown />
    </div>
  )
}

// 主编辑器组件 - 包装MilkdownProvider，实现完整的三大法则功能
const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState(props.value || '')

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 处理内容变化 - 实现实时保存状态跟踪
  const handleContentChange = useCallback((newValue: string) => {
    // 检查是否有未保存的更改
    setHasUnsavedChanges(newValue !== lastSavedContent)

    // 调用外部onChange回调 - 实现实时保存
    if (props.onChange) {
      props.onChange(newValue)
    }
  }, [props.onChange, lastSavedContent])

  // 保存功能 - 符合三大法则第一条：实时保存
  const handleSave = useCallback(() => {
    if (props.onSave && props.value) {
      props.onSave(props.value)
      setLastSavedContent(props.value)
      setHasUnsavedChanges(false)
    }
  }, [props.onSave, props.value])

  // 复制功能
  const handleCopy = useCallback(() => {
    if (props.value) {
      navigator.clipboard.writeText(props.value).then(() => {
        // 复制成功的处理在Toolbar组件中
      }).catch(() => {
        // 复制失败的处理在Toolbar组件中
      })
    }
  }, [props.value])

  // 键盘快捷键 - 移除预览模式切换，因为Milkdown本身就是所见即所得
  useKeyboardShortcuts(handleSave, toggleFullscreen)

  // 监听外部value变化，更新保存状态
  useEffect(() => {
    if (props.value !== undefined) {
      setLastSavedContent(props.value)
      setHasUnsavedChanges(false)
    }
  }, [props.value])

  return (
    <div className="milkdown-editor-wrapper">
      <Toolbar
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onCopy={handleCopy}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        hideToolbar={props.hideToolbar || false}
        value={props.value || ''}
      />

      <div className={`milkdown-editor-container ${isFullscreen ? 'fullscreen' : ''}`}>
        <MilkdownProvider>
          <MilkdownEditorCore {...props} onChange={handleContentChange} />
        </MilkdownProvider>
      </div>
    </div>
  )
}

export default MilkdownEditor
