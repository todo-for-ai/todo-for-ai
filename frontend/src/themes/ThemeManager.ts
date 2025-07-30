/**
 * 主题管理器 - 负责主题的注册、加载、切换和管理
 */

import type { 
  Theme, 
  TypewriterTheme, 
  ThemeCategory, 
  ThemeTag, 
  ThemeFilter,
  ThemeRegistration,
  ThemeManagerConfig,
  ThemeChangeEvent
} from '../types/theme'

// 默认配置
const DEFAULT_CONFIG: ThemeManagerConfig = {
  enablePersistence: true,
  enableDynamicLoading: true,
  enableTypewriterEffects: true,
  enableAudioEffects: false,
  defaultCategory: 'modern',
  maxCachedThemes: 20
}

// 主题变更事件类型
type ThemeChangeListener = (event: ThemeChangeEvent) => void

export class ThemeManager {
  private themes: Map<string, Theme> = new Map()
  private registrations: Map<string, ThemeRegistration> = new Map()
  private currentTheme: Theme | null = null
  private config: ThemeManagerConfig
  private listeners: Set<ThemeChangeListener> = new Set()
  private cssVariables: Map<string, string> = new Map()

  constructor(config: Partial<ThemeManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeCSSVariables()
  }

  /**
   * 注册主题
   */
  registerTheme(registration: ThemeRegistration): void {
    const { theme } = registration

    // 验证主题配置
    this.validateTheme(theme)

    // 如果主题已存在，跳过注册
    if (this.themes.has(theme.id)) {
      return
    }

    // 存储主题和注册信息
    this.themes.set(theme.id, theme)
    this.registrations.set(theme.id, registration)

    // 预加载资源（如果启用动态加载）
    if (this.config.enableDynamicLoading && registration.assets) {
      this.preloadAssets(registration.assets)
    }

    console.log(`主题已注册: ${theme.name} (${theme.id})`)
  }

  /**
   * 注销主题
   */
  unregisterTheme(themeId: string): boolean {
    if (!this.themes.has(themeId)) {
      return false
    }

    // 如果是当前主题，切换到默认主题
    if (this.currentTheme?.id === themeId) {
      const defaultTheme = this.getDefaultTheme()
      if (defaultTheme) {
        this.setTheme(defaultTheme.id)
      }
    }

    this.themes.delete(themeId)
    this.registrations.delete(themeId)
    
    console.log(`主题已注销: ${themeId}`)
    return true
  }

  /**
   * 设置当前主题
   */
  async setTheme(themeId: string, reason: ThemeChangeEvent['reason'] = 'user'): Promise<boolean> {
    const theme = this.themes.get(themeId)
    if (!theme) {
      console.warn(`主题不存在: ${themeId}`)
      return false
    }

    const previousTheme = this.currentTheme
    
    try {
      // 加载主题资源
      await this.loadThemeAssets(themeId)
      
      // 应用主题样式
      this.applyTheme(theme)
      
      // 更新当前主题
      this.currentTheme = theme
      
      // 持久化存储
      if (this.config.enablePersistence) {
        this.saveThemeToStorage(themeId)
      }
      
      // 触发变更事件
      if (previousTheme) {
        this.notifyThemeChange({
          previousTheme,
          currentTheme: theme,
          timestamp: Date.now(),
          reason
        })
      }
      
      console.log(`主题已切换: ${theme.name}`)
      return true
    } catch (error) {
      console.error(`主题切换失败: ${themeId}`, error)
      return false
    }
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme(): Theme | null {
    return this.currentTheme
  }

  /**
   * 获取所有主题
   */
  getAllThemes(): Theme[] {
    return Array.from(this.themes.values())
  }

  /**
   * 根据分类获取主题
   */
  getThemesByCategory(category: ThemeCategory): Theme[] {
    return this.getAllThemes().filter(theme => theme.category === category)
  }

  /**
   * 根据标签获取主题
   */
  getThemesByTag(tag: ThemeTag): Theme[] {
    return this.getAllThemes().filter(theme => theme.tags?.includes(tag))
  }

  /**
   * 过滤主题
   */
  filterThemes(filter: ThemeFilter): Theme[] {
    let themes = this.getAllThemes()

    if (filter.category) {
      themes = themes.filter(theme => theme.category === filter.category)
    }

    if (filter.tags && filter.tags.length > 0) {
      themes = themes.filter(theme => 
        filter.tags!.some(tag => theme.tags?.includes(tag))
      )
    }

    if (filter.isDark !== undefined) {
      themes = themes.filter(theme => theme.isDark === filter.isDark)
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      themes = themes.filter(theme => 
        theme.name.toLowerCase().includes(searchLower) ||
        theme.description.toLowerCase().includes(searchLower)
      )
    }

    return themes
  }

  /**
   * 判断是否为打字机主题
   */
  isTypewriterTheme(theme: Theme): theme is TypewriterTheme {
    return theme.category === 'typewriter' && 'typewriterEffects' in theme
  }

  /**
   * 添加主题变更监听器
   */
  addThemeChangeListener(listener: ThemeChangeListener): void {
    this.listeners.add(listener)
  }

  /**
   * 移除主题变更监听器
   */
  removeThemeChangeListener(listener: ThemeChangeListener): void {
    this.listeners.delete(listener)
  }

  /**
   * 从存储中恢复主题
   */
  restoreThemeFromStorage(): string | null {
    if (!this.config.enablePersistence) {
      return null
    }

    try {
      const stored = localStorage.getItem('milkdown-theme-id')
      if (stored && this.themes.has(stored)) {
        return stored
      }
    } catch (error) {
      console.warn('无法从存储中恢复主题:', error)
    }

    return null
  }

  /**
   * 获取默认主题
   */
  private getDefaultTheme(): Theme | null {
    // 优先返回默认分类的第一个主题
    const categoryThemes = this.getThemesByCategory(this.config.defaultCategory)
    if (categoryThemes.length > 0) {
      return categoryThemes[0]
    }

    // 否则返回第一个可用主题
    const allThemes = this.getAllThemes()
    return allThemes.length > 0 ? allThemes[0] : null
  }

  /**
   * 验证主题配置
   */
  private validateTheme(theme: Theme): void {
    if (!theme.id || !theme.name) {
      throw new Error('主题必须包含 id 和 name')
    }

    if (this.themes.has(theme.id)) {
      console.warn(`主题 ID 已存在，跳过注册: ${theme.id}`)
      return
    }

    // 验证必需的颜色配置
    const requiredColors = ['primary', 'background', 'textPrimary']
    for (const color of requiredColors) {
      if (!(color in theme.colors)) {
        throw new Error(`主题缺少必需的颜色配置: ${color}`)
      }
    }
  }

  /**
   * 预加载资源
   */
  private async preloadAssets(assets: string[]): Promise<void> {
    const promises = assets.map(async (asset) => {
      if (asset.endsWith('.css')) {
        return this.preloadCSS(asset)
      } else if (asset.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return this.preloadImage(asset)
      }
    })

    try {
      await Promise.all(promises)
    } catch (error) {
      console.warn('资源预加载失败:', error)
    }
  }

  /**
   * 预加载CSS文件
   */
  private preloadCSS(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = url
      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`CSS预加载失败: ${url}`))
      document.head.appendChild(link)
    })
  }

  /**
   * 预加载图片
   */
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`图片预加载失败: ${url}`))
      img.src = url
    })
  }

  /**
   * 加载主题资源
   */
  private async loadThemeAssets(themeId: string): Promise<void> {
    const registration = this.registrations.get(themeId)
    if (!registration?.assets) {
      return
    }

    // 加载CSS文件
    const cssAssets = registration.assets.filter(asset => asset.endsWith('.css'))
    for (const css of cssAssets) {
      await this.loadCSS(css)
    }
  }

  /**
   * 动态加载CSS文件
   */
  private loadCSS(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      const existing = document.querySelector(`link[href="${url}"]`)
      if (existing) {
        resolve()
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`CSS加载失败: ${url}`))
      document.head.appendChild(link)
    })
  }

  /**
   * 应用主题样式
   */
  private applyTheme(theme: Theme): void {
    // 应用CSS变量
    this.applyCSSVariables(theme)

    // 应用主题容器类名
    this.applyThemeContainerClass(theme)

    // 应用自定义CSS
    if (theme.customCSS) {
      this.applyCustomCSS(theme.customCSS, theme.id)
    }

    // 应用打字机效果
    if (this.isTypewriterTheme(theme) && this.config.enableTypewriterEffects) {
      this.applyTypewriterEffects(theme)
    }
  }

  /**
   * 初始化CSS变量
   */
  private initializeCSSVariables(): void {
    // 这里可以定义默认的CSS变量
    this.cssVariables.set('--theme-transition-duration', '0.3s')
    this.cssVariables.set('--theme-transition-easing', 'ease')
  }

  /**
   * 应用CSS变量
   */
  private applyCSSVariables(theme: Theme): void {
    const root = document.documentElement
    
    // 基础颜色变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-color-${this.kebabCase(key)}`, value)
    })
    
    // 字体变量
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--theme-font-${this.kebabCase(key)}`, value)
    })
    
    // 间距变量
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--theme-spacing-${this.kebabCase(key)}`, value)
    })
    
    // 边框变量
    Object.entries(theme.borders).forEach(([key, value]) => {
      root.style.setProperty(`--theme-border-${this.kebabCase(key)}`, value)
    })
    
    // 阴影变量
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--theme-shadow-${this.kebabCase(key)}`, value)
    })
    
    // 动画变量
    Object.entries(theme.animations).forEach(([key, value]) => {
      root.style.setProperty(`--theme-animation-${this.kebabCase(key)}`, value)
    })
  }

  /**
   * 应用主题容器类名
   */
  private applyThemeContainerClass(theme: Theme): void {
    // 查找所有主题容器（包括新的和旧的容器类名）
    const containers = document.querySelectorAll('.milkdown-theme-container, .milkdown-editor-themed')

    containers.forEach(container => {
      // 移除旧的主题类名
      container.className = container.className.replace(/theme-[\w-]+/g, '')

      // 添加新的主题类名
      container.classList.add(`theme-${theme.id}`)

      // 添加主题类别类名
      if (theme.category) {
        container.classList.add(`theme-category-${theme.category}`)
      }
    })
  }

  /**
   * 应用自定义CSS
   */
  private applyCustomCSS(css: string, themeId: string): void {
    // 移除旧的自定义样式
    const oldStyle = document.getElementById(`theme-custom-${themeId}`)
    if (oldStyle) {
      oldStyle.remove()
    }

    // 添加新的自定义样式
    const style = document.createElement('style')
    style.id = `theme-custom-${themeId}`
    style.textContent = css
    document.head.appendChild(style)
  }

  /**
   * 应用打字机效果
   */
  private applyTypewriterEffects(theme: TypewriterTheme): void {
    const root = document.documentElement
    const effects = theme.typewriterEffects
    
    // 焦点行效果变量
    if (effects.focusLine.enabled) {
      root.style.setProperty('--typewriter-focus-enabled', '1')
      root.style.setProperty('--typewriter-focus-color', effects.focusLine.highlightColor)
      root.style.setProperty('--typewriter-focus-fade-distance', `${effects.focusLine.fadeDistance}px`)
      root.style.setProperty('--typewriter-focus-gradient-intensity', `${effects.focusLine.gradientIntensity}`)
      
      if (effects.focusLine.markerColor) {
        root.style.setProperty('--typewriter-focus-marker-color', effects.focusLine.markerColor)
      }
      if (effects.focusLine.markerWidth) {
        root.style.setProperty('--typewriter-focus-marker-width', effects.focusLine.markerWidth)
      }
    } else {
      root.style.setProperty('--typewriter-focus-enabled', '0')
    }
    
    // 渐变淡化效果变量
    if (effects.fadeEffect.enabled) {
      root.style.setProperty('--typewriter-fade-enabled', '1')
      root.style.setProperty('--typewriter-fade-opacity', `${effects.fadeEffect.fadeOpacity}`)
      root.style.setProperty('--typewriter-fade-distance', effects.fadeEffect.fadeDistance)
      root.style.setProperty('--typewriter-fade-duration', effects.fadeEffect.animationDuration)
      root.style.setProperty('--typewriter-fade-easing', effects.fadeEffect.easing)
    } else {
      root.style.setProperty('--typewriter-fade-enabled', '0')
    }
    
    // 视觉效果变量
    const visual = effects.visualEffects
    root.style.setProperty('--typewriter-scan-lines', visual.scanLines ? '1' : '0')
    root.style.setProperty('--typewriter-glow-effect', visual.glowEffect ? '1' : '0')
    root.style.setProperty('--typewriter-breathing-cursor', visual.breathingCursor ? '1' : '0')
    root.style.setProperty('--typewriter-page-flip', visual.pageFlipAnimation ? '1' : '0')
    root.style.setProperty('--typewriter-noise-texture', visual.noiseTexture ? '1' : '0')
    
    if (visual.paperTexture) {
      root.style.setProperty('--typewriter-paper-texture', `url(${visual.paperTexture})`)
    }
    
    if (visual.glowColor) {
      root.style.setProperty('--typewriter-glow-color', visual.glowColor)
    }
    
    if (visual.glowIntensity !== undefined) {
      root.style.setProperty('--typewriter-glow-intensity', `${visual.glowIntensity}`)
    }
    
    if (visual.breathingDuration) {
      root.style.setProperty('--typewriter-breathing-duration', visual.breathingDuration)
    }
    
    if (visual.scanLineOpacity !== undefined) {
      root.style.setProperty('--typewriter-scan-line-opacity', `${visual.scanLineOpacity}`)
    }
    
    if (visual.scanLineSpeed) {
      root.style.setProperty('--typewriter-scan-line-speed', visual.scanLineSpeed)
    }
  }

  /**
   * 保存主题到存储
   */
  private saveThemeToStorage(themeId: string): void {
    try {
      localStorage.setItem('milkdown-theme-id', themeId)
    } catch (error) {
      console.warn('无法保存主题到存储:', error)
    }
  }

  /**
   * 通知主题变更
   */
  private notifyThemeChange(event: ThemeChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('主题变更监听器执行失败:', error)
      }
    })
  }

  /**
   * 转换为kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  }
}

// 创建全局主题管理器实例
export const themeManager = new ThemeManager()

// 导出类型
export type { ThemeChangeListener }
