/**
 * 打字机效果处理模块
 * Typewriter Effects Handler
 */

import type { TypewriterTheme } from '../../types/theme'

export interface TypewriterEffectsHandler {
  enable(): void
  disable(): void
  updateConfig(theme: TypewriterTheme): void
  destroy(): void
}

export class TypewriterEffectsManager implements TypewriterEffectsHandler {
  private container: HTMLElement | null = null
  private proseMirrorElement: HTMLElement | null = null
  private currentTheme: TypewriterTheme | null = null
  private isEnabled = false
  private observers: MutationObserver[] = []
  private eventListeners: Array<{ element: HTMLElement; event: string; handler: EventListener }> = []

  constructor(container?: HTMLElement) {
    if (container) {
      this.setContainer(container)
    }
  }

  /**
   * 设置容器元素
   */
  setContainer(container: HTMLElement): void {
    this.container = container
    this.proseMirrorElement = container.querySelector('.ProseMirror')
  }

  /**
   * 启用打字机效果
   */
  enable(): void {
    if (this.isEnabled || !this.container || !this.currentTheme) {
      return
    }

    this.isEnabled = true
    this.setupEffects()
  }

  /**
   * 禁用打字机效果
   */
  disable(): void {
    if (!this.isEnabled) {
      return
    }

    this.isEnabled = false
    this.cleanupEffects()
  }

  /**
   * 更新配置
   */
  updateConfig(theme: TypewriterTheme): void {
    this.currentTheme = theme
    
    if (this.isEnabled) {
      this.cleanupEffects()
      this.setupEffects()
    }
  }

  /**
   * 销毁效果处理器
   */
  destroy(): void {
    this.disable()
    this.container = null
    this.proseMirrorElement = null
    this.currentTheme = null
  }

  /**
   * 设置所有效果
   */
  private setupEffects(): void {
    if (!this.currentTheme || !this.container) {
      return
    }

    const effects = this.currentTheme.typewriterEffects

    // 设置焦点行效果
    if (effects.focusLine.enabled) {
      this.setupFocusLineEffect()
    }

    // 设置渐变淡化效果
    if (effects.fadeEffect.enabled) {
      this.setupFadeEffect()
    }

    // 设置视觉效果
    this.setupVisualEffects()

    // 设置动态效果
    if (effects.dynamicEffects.smartFocus) {
      this.setupSmartFocus()
    }
  }

  /**
   * 清理所有效果
   */
  private cleanupEffects(): void {
    // 清理事件监听器
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler)
    })
    this.eventListeners = []

    // 清理观察器
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []

    // 清理CSS类
    if (this.container) {
      this.container.querySelectorAll('.current-line, .fade-content, .focus-nearby').forEach(el => {
        el.classList.remove('current-line', 'fade-content', 'focus-nearby')
      })
    }
  }

  /**
   * 设置焦点行效果
   */
  private setupFocusLineEffect(): void {
    if (!this.proseMirrorElement) {
      return
    }

    const updateFocusLine = () => {
      this.updateFocusLine()
    }

    // 监听光标位置变化
    const selectionChangeHandler = () => {
      requestAnimationFrame(updateFocusLine)
    }

    // 监听键盘输入
    const keyHandler = () => {
      requestAnimationFrame(updateFocusLine)
    }

    // 监听鼠标点击
    const clickHandler = () => {
      setTimeout(updateFocusLine, 10)
    }

    this.addEventListener(document, 'selectionchange', selectionChangeHandler)
    this.addEventListener(this.proseMirrorElement, 'keyup', keyHandler)
    this.addEventListener(this.proseMirrorElement, 'keydown', keyHandler)
    this.addEventListener(this.proseMirrorElement, 'click', clickHandler)
    this.addEventListener(this.proseMirrorElement, 'focus', updateFocusLine)

    // 初始更新
    updateFocusLine()
  }

  /**
   * 更新焦点行高亮
   */
  private updateFocusLine(): void {
    if (!this.proseMirrorElement || !this.currentTheme) {
      return
    }

    // 清除之前的焦点行
    this.proseMirrorElement.querySelectorAll('.current-line').forEach(el => {
      el.classList.remove('current-line')
    })

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    const focusNode = range.startContainer

    // 找到当前段落元素
    let currentParagraph: Element | null = null
    
    if (focusNode.nodeType === Node.TEXT_NODE) {
      currentParagraph = (focusNode.parentElement as Element)?.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote')
    } else if (focusNode.nodeType === Node.ELEMENT_NODE) {
      const element = focusNode as Element
      currentParagraph = element.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote') || element.querySelector('p, h1, h2, h3, h4, h5, h6, li, blockquote')
    }

    if (currentParagraph) {
      currentParagraph.classList.add('current-line')
      
      // 如果启用了居中功能，滚动到当前行
      if (this.currentTheme.typewriterEffects.focusLine.centerOnFocus) {
        this.scrollToElement(currentParagraph)
      }
    }
  }

  /**
   * 设置渐变淡化效果
   */
  private setupFadeEffect(): void {
    if (!this.proseMirrorElement) {
      return
    }

    const updateFadeEffect = () => {
      this.updateFadeEffect()
    }

    // 监听光标位置变化
    this.addEventListener(document, 'selectionchange', updateFadeEffect)
    this.addEventListener(this.proseMirrorElement, 'keyup', updateFadeEffect)
    this.addEventListener(this.proseMirrorElement, 'click', updateFadeEffect)

    // 初始更新
    updateFadeEffect()
  }

  /**
   * 更新渐变淡化效果
   */
  private updateFadeEffect(): void {
    if (!this.proseMirrorElement || !this.currentTheme) {
      return
    }

    const effects = this.currentTheme.typewriterEffects
    const fadeDistance = parseInt(effects.fadeEffect.fadeDistance) || 200

    // 清除之前的淡化类
    this.proseMirrorElement.querySelectorAll('.fade-content, .focus-nearby').forEach(el => {
      el.classList.remove('fade-content', 'focus-nearby')
    })

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    const focusElement = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer as Element

    if (!focusElement) {
      return
    }

    const currentParagraph = focusElement.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote')
    if (!currentParagraph) {
      return
    }

    // 获取所有段落元素
    const allParagraphs = Array.from(this.proseMirrorElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote'))
    const currentIndex = allParagraphs.indexOf(currentParagraph)

    if (currentIndex === -1) {
      return
    }

    // 计算淡化范围（以段落数量为单位）
    const fadeRange = Math.max(1, Math.floor(fadeDistance / 100)) // 每100px约等于1个段落

    allParagraphs.forEach((paragraph, index) => {
      const distance = Math.abs(index - currentIndex)
      
      if (distance === 0) {
        // 当前段落，不淡化
        return
      } else if (distance <= fadeRange) {
        // 附近段落，轻微淡化
        paragraph.classList.add('focus-nearby')
      } else {
        // 远离段落，重度淡化
        paragraph.classList.add('fade-content')
      }
    })
  }

  /**
   * 设置视觉效果
   */
  private setupVisualEffects(): void {
    if (!this.container || !this.currentTheme) {
      return
    }

    const effects = this.currentTheme.typewriterEffects.visualEffects

    // 应用纸质纹理
    if (effects.paperTexture) {
      this.container.style.setProperty('--typewriter-paper-texture', `url(${effects.paperTexture})`)
    }

    // 应用其他视觉效果的CSS变量
    this.container.style.setProperty('--typewriter-breathing-duration', effects.breathingDuration || '1.5s')
  }

  /**
   * 设置智能焦点
   */
  private setupSmartFocus(): void {
    if (!this.proseMirrorElement) {
      return
    }

    // 智能焦点：自动滚动到编辑位置
    const smartFocusHandler = () => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        // 如果光标不在视窗中心区域，平滑滚动
        const viewportHeight = window.innerHeight
        const centerY = viewportHeight / 2
        const threshold = viewportHeight * 0.3 // 30%的阈值
        
        if (Math.abs(rect.top - centerY) > threshold) {
          const targetY = window.scrollY + rect.top - centerY
          window.scrollTo({
            top: targetY,
            behavior: 'smooth'
          })
        }
      }
    }

    this.addEventListener(this.proseMirrorElement, 'keydown', smartFocusHandler)
    this.addEventListener(this.proseMirrorElement, 'click', smartFocusHandler)
  }

  /**
   * 滚动到指定元素
   */
  private scrollToElement(element: Element): void {
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const targetY = window.scrollY + rect.top - (viewportHeight / 2) + (rect.height / 2)

    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    })
  }

  /**
   * 添加事件监听器（带清理功能）
   */
  private addEventListener(element: HTMLElement | Document, event: string, handler: EventListener): void {
    element.addEventListener(event, handler)
    this.eventListeners.push({ element: element as HTMLElement, event, handler })
  }
}

// 全局打字机效果管理器实例
let globalTypewriterEffects: TypewriterEffectsManager | null = null

/**
 * 获取全局打字机效果管理器
 */
export function getTypewriterEffectsManager(): TypewriterEffectsManager {
  if (!globalTypewriterEffects) {
    globalTypewriterEffects = new TypewriterEffectsManager()
  }
  return globalTypewriterEffects
}

/**
 * 初始化打字机效果
 */
export function initTypewriterEffects(container: HTMLElement, theme: TypewriterTheme): TypewriterEffectsManager {
  const manager = getTypewriterEffectsManager()
  manager.setContainer(container)
  manager.updateConfig(theme)
  manager.enable()
  return manager
}

/**
 * 清理打字机效果
 */
export function cleanupTypewriterEffects(): void {
  if (globalTypewriterEffects) {
    globalTypewriterEffects.destroy()
    globalTypewriterEffects = null
  }
}
