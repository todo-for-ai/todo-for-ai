import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { nord } from '@milkdown/theme-nord'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { history } from '@milkdown/plugin-history'
import { clipboard } from '@milkdown/plugin-clipboard'
import { cursor } from '@milkdown/plugin-cursor'

/**
 * ========================================
 * MARKDOWN编辑器核心配置 - 三大法则
 * ========================================
 *
 * 此文件负责Milkdown编辑器的核心配置，必须确保：
 *
 * 1. 【实时保存】通过listener插件监听内容变化，实现实时保存
 * 2. 【所见即所得】通过commonmark和gfm插件确保Markdown语法正确渲染为HTML
 * 3. 【无滚动条】编辑器本身不设置固定高度，由外层容器控制高度自适应
 *
 * 重要提醒：修改此文件时必须确保上述三个法则不被破坏！
 * ========================================
 */

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

      // 创建编辑器 - 确保所见即所得模式
      this.editor = Editor.make()
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

          // 设置监听器
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              this.currentContent = markdown
              this.onChange(markdown)
            }
          })
        })
        .use(nord)  // 主题
        .use(listener)  // 监听器
        .use(commonmark)  // 基础Markdown支持 - 包含标题、列表、粗体等
        .use(gfm)  // GitHub Flavored Markdown扩展 - 包含表格、删除线等
        .use(history)  // 历史记录
        .use(clipboard)  // 剪贴板支持
        .use(cursor)  // 光标支持

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

    // 如果内容不同，重新创建编辑器（简单但稳定的方法）
    if (this.currentContent !== content) {
      return await this.recreate(content)
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
