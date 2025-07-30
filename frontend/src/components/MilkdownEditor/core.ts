/**
 * ========================================
 * MARKDOWN编辑器核心配置 - 三大法则 + 禁用规则
 * ========================================
 *
 * 【三大法则】此文件负责Milkdown编辑器的核心配置，必须确保：
 *
 * 1. 【实时保存】通过listener插件监听内容变化，实现实时保存
 *    - 使用listenerCtx.markdownUpdated监听内容变化
 *    - 每次内容变化都触发onChange回调
 *    - 确保实时保存功能正常工作
 *
 * 2. 【所见即所得】通过commonmark和gfm插件确保Markdown语法正确渲染为HTML
 *    - Milkdown本身就是所见即所得编辑器
 *    - 使用commonmark插件支持基础Markdown语法
 *    - 使用gfm插件支持GitHub Flavored Markdown扩展
 *    - 用户输入Markdown语法时立即渲染为对应样式
 *
 * 3. 【无滚动条】编辑器本身不设置固定高度，由外层容器控制高度自适应
 *    - 编辑器容器不设置固定高度
 *    - 不使用overflow: auto或scroll
 *    - 让内容自然流动，高度完全自适应
 *
 * 【禁用规则】
 * ❌ 严禁使用 @uiw/react-md-editor
 * ❌ 严禁使用任何其他Markdown编辑器替代Milkdown
 * ❌ 必须使用Milkdown实现所见即所得功能
 *
 * 重要提醒：修改此文件时必须确保上述三个法则和禁用规则不被破坏！
 * 任何违反这些规则的配置修改都是不被允许的！
 * ========================================
 */

import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { nord } from '@milkdown/theme-nord'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { cursor } from '@milkdown/kit/plugin/cursor'

export interface EditorConfig {
  container: HTMLElement
  initialValue: string
  onChange: (markdown: string) => void
}

export class MilkdownEditorCore {
  private editor: Editor | null = null
  private isInitializing = false
  private container: HTMLElement
  private onChange: (markdown: string) => void
  private currentContent: string = ''

  constructor(config: EditorConfig) {
    this.container = config.container
    this.onChange = config.onChange
    this.currentContent = config.initialValue
  }

  async create(initialValue: string = ''): Promise<boolean> {
    if (this.isInitializing || this.editor) {
      return false
    }

    this.isInitializing = true
    this.currentContent = initialValue

    try {
      // 清理容器
      this.clearContainer()

      // 创建编辑器 - 按照官方文档的正确配置方式
      this.editor = Editor.make()
        .config(nord)  // 首先配置主题
        .config((ctx) => {
          ctx.set(rootCtx, this.container)
          ctx.set(defaultValueCtx, initialValue)

          // 设置编辑器视图选项 - 确保所见即所得模式
          ctx.set(editorViewOptionsCtx, {
            editable: () => true,
            attributes: {
              class: 'milkdown-editor-content'
            }
          })
        })
        .use(commonmark)  // 基础Markdown支持 - 这是最重要的插件
        .use(gfm)  // GitHub Flavored Markdown扩展
        .use(listener)  // 监听器 - 用于实时保存
        .use(history)  // 历史记录
        .use(clipboard)  // 剪贴板支持
        .use(cursor)  // 光标支持
        .config((ctx) => {
          // 设置监听器 - 实现实时保存功能（必须在use(listener)之后配置）
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              this.currentContent = markdown
              this.onChange(markdown)
            }
          })
        })

      await this.editor.create()
      this.isInitializing = false
      return true
    } catch (error) {
      console.error('创建编辑器失败:', error)
      this.isInitializing = false
      this.editor = null
      return false
    }
  }

  async updateContent(content: string): Promise<boolean> {
    if (!this.editor || this.isInitializing) {
      return false
    }

    // 修复：避免频繁重新创建编辑器，只在必要时才重新创建
    if (this.currentContent !== content) {
      try {
        // 尝试使用温和的方式更新内容，而不是完全重新创建
        const { replaceAll } = await import('@milkdown/kit/utils')
        this.editor.action(replaceAll(content || ''))
        this.currentContent = content
        return true
      } catch (error) {
        console.warn('温和更新失败，尝试重新创建编辑器:', error)
        // 只有在温和更新失败时才重新创建
        return await this.recreate(content)
      }
    }
    return true
  }

  getCurrentContent(): string {
    return this.currentContent
  }

  private async recreate(initialValue: string = ''): Promise<boolean> {
    // 销毁当前编辑器
    if (this.editor) {
      try {
        this.editor.destroy()
      } catch (error) {
        // 忽略销毁错误
      }
      this.editor = null
    }

    // 重新创建
    return await this.create(initialValue)
  }

  destroy(): void {
    if (this.editor) {
      try {
        this.editor.destroy()
      } catch (error) {
        console.error('销毁编辑器失败:', error)
      }
      this.editor = null
    }
    this.clearContainer()
  }

  private clearContainer(): void {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild)
    }
  }

  isReady(): boolean {
    return this.editor !== null && !this.isInitializing
  }
}
