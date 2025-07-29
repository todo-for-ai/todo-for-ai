import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { nord } from '@milkdown/theme-nord'
import { listener, listenerCtx } from '@milkdown/plugin-listener'

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

  constructor(config: EditorConfig) {
    this.container = config.container
    this.onChange = config.onChange
  }

  async create(initialValue: string = ''): Promise<boolean> {
    if (this.isInitializing || this.editor) {
      return false
    }

    this.isInitializing = true

    try {
      // 清理容器
      this.clearContainer()

      // 创建编辑器
      this.editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, this.container)
          ctx.set(defaultValueCtx, initialValue)

          // 设置监听器
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              this.onChange(markdown)
            }
          })
        })
        .use(commonmark)
        .use(gfm)
        .use(listener)
        .use(nord)

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

    // 如果内容不同，重新创建编辑器
    const currentContent = this.getCurrentContent()
    if (currentContent !== content) {
      await this.recreate(content)
    }
    return true
  }

  getCurrentContent(): string {
    if (!this.editor) return ''

    try {
      let content = ''
      this.editor.action((ctx) => {
        try {
          const view = ctx.get('prosemirrorViewCtx')
          const serializer = ctx.get('serializerCtx')

          if (view && serializer) {
            content = serializer(view.state.doc)
          }
        } catch (contextError) {
          // Context可能还没准备好，返回空字符串
          content = ''
        }
      })
      return content
    } catch (error) {
      return ''
    }
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
