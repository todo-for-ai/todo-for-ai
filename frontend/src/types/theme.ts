/**
 * Markdown编辑器主题系统类型定义
 */

// 颜色配置
export interface ThemeColors {
  // 基础颜色
  primary: string
  secondary: string
  background: string
  surface: string
  
  // 文本颜色
  textPrimary: string
  textSecondary: string
  textMuted: string
  
  // 边框和分割线
  border: string
  divider: string
  
  // 状态颜色
  success: string
  warning: string
  error: string
  info: string
  
  // 编辑器特定颜色
  editorBackground: string
  editorFocusBackground: string
  editorBorder: string
  editorFocusBorder: string
  
  // 代码相关颜色
  codeBackground: string
  codeText: string
  codeBlockBackground: string
  codeBlockBorder: string
  
  // 引用块颜色
  blockquoteBackground: string
  blockquoteBorder: string
  blockquoteText: string
  
  // 链接颜色
  linkColor: string
  linkHoverColor: string
  
  // 选中文本颜色
  selectionBackground: string
  
  // 光标颜色
  caretColor: string
}

// 字体配置
export interface ThemeFonts {
  // 字体族
  fontFamily: string
  codeFontFamily: string
  
  // 字体大小
  fontSize: string
  codeSize: string
  h1Size: string
  h2Size: string
  h3Size: string
  h4Size: string
  h5Size: string
  h6Size: string
  
  // 字体权重
  fontWeight: string
  boldWeight: string
  headingWeight: string
  
  // 行高
  lineHeight: string
  headingLineHeight: string
  
  // 字母间距
  letterSpacing: string
  headingLetterSpacing: string
}

// 间距配置
export interface ThemeSpacing {
  // 基础间距单位
  unit: string
  
  // 编辑器内边距
  editorPadding: string
  
  // 段落间距
  paragraphMargin: string
  
  // 标题间距
  headingMarginTop: string
  headingMarginBottom: string
  
  // 列表间距
  listMargin: string
  listItemMargin: string
  
  // 代码块间距
  codeBlockMargin: string
  codeBlockPadding: string
  
  // 引用块间距
  blockquoteMargin: string
  blockquotePadding: string
  
  // 表格间距
  tableMargin: string
  tableCellPadding: string
}

// 边框和圆角配置
export interface ThemeBorders {
  // 边框宽度
  borderWidth: string
  focusBorderWidth: string
  
  // 圆角半径
  borderRadius: string
  smallRadius: string
  largeRadius: string
  
  // 代码块圆角
  codeBlockRadius: string
  
  // 引用块圆角
  blockquoteRadius: string
}

// 阴影配置
export interface ThemeShadows {
  // 基础阴影
  small: string
  medium: string
  large: string
  
  // 编辑器阴影
  editorShadow: string
  editorHoverShadow: string
  editorFocusShadow: string
  
  // 代码块阴影
  codeBlockShadow: string
}

// 动画配置
export interface ThemeAnimations {
  // 过渡时间
  transitionDuration: string
  fastTransition: string
  slowTransition: string
  
  // 缓动函数
  easing: string
  
  // 特殊动画
  typingGlow: string
  hoverTransform: string
}

// 完整主题配置
export interface Theme {
  id: string
  name: string
  description: string
  isDark: boolean
  colors: ThemeColors
  fonts: ThemeFonts
  spacing: ThemeSpacing
  borders: ThemeBorders
  shadows: ThemeShadows
  animations: ThemeAnimations
  // 新增字段
  category?: ThemeCategory
  tags?: ThemeTag[]
  version?: string
  author?: string
  preview?: string // 预览图片URL
  customCSS?: string // 自定义CSS
  requiredAssets?: string[] // 需要的资源文件
}

// 打字机主题配置 (扩展Theme接口)
export interface TypewriterTheme extends Theme {
  category: 'typewriter'
  typewriterEffects: TypewriterEffects
}

// 主题上下文类型 (扩展)
export interface ThemeContextType {
  currentTheme: Theme
  availableThemes: Theme[]
  setTheme: (themeId: string) => void
  isDarkMode: boolean
  toggleDarkMode: () => void
  // 新增方法
  getThemesByCategory: (category: ThemeCategory) => Theme[]
  getThemesByTag: (tag: ThemeTag) => Theme[]
  registerTheme: (theme: Theme) => void
  unregisterTheme: (themeId: string) => void
  isTypewriterTheme: (theme: Theme) => theme is TypewriterTheme
}

// 主题配置选项
export interface ThemeOptions {
  // 是否启用主题持久化
  enablePersistence?: boolean
  
  // 默认主题ID
  defaultThemeId?: string
  
  // 是否跟随系统深色模式
  followSystemDarkMode?: boolean
  
  // 自定义主题存储键
  storageKey?: string
}

// 主题变更事件 (扩展)
export interface ThemeChangeEvent {
  previousTheme: Theme
  currentTheme: Theme
  timestamp: number
  reason: 'user' | 'system' | 'auto' | 'time-based'
  metadata?: Record<string, any>
}

// 主题注册配置
export interface ThemeRegistration {
  theme: Theme
  assets?: string[]
  dependencies?: string[]
  loadPriority?: 'high' | 'normal' | 'low'
}

// 主题过滤器
export interface ThemeFilter {
  category?: ThemeCategory
  tags?: ThemeTag[]
  isDark?: boolean
  search?: string
}

// 主题排序选项
export type ThemeSortBy = 'name' | 'category' | 'created' | 'popularity'
export type ThemeSortOrder = 'asc' | 'desc'

// 主题管理器配置
export interface ThemeManagerConfig {
  enablePersistence: boolean
  enableDynamicLoading: boolean
  enableTypewriterEffects: boolean
  enableAudioEffects: boolean
  defaultCategory: ThemeCategory
  maxCachedThemes: number
}

// 主题分类类型
export type ThemeCategory = 'modern' | 'typewriter' | 'vintage' | 'minimal' | 'code' | 'dynamic'

// 主题标签类型
export type ThemeTag = 'focus' | 'dark' | 'retro' | 'animation' | 'immersive' | 'code-friendly' | 'zen'

// 打字机效果配置
export interface TypewriterEffects {
  // 焦点行效果
  focusLine: {
    enabled: boolean
    highlightColor: string
    fadeDistance: number
    centerOnFocus: boolean
    gradientIntensity: number
    markerColor?: string
    markerWidth?: string
  }

  // 渐变淡化效果
  fadeEffect: {
    enabled: boolean
    fadeOpacity: number
    fadeDistance: string
    animationDuration: string
    easing: string
  }

  // 特殊视觉效果
  visualEffects: {
    scanLines: boolean
    scanLineOpacity?: number
    scanLineSpeed?: string
    paperTexture: string | null
    glowEffect: boolean
    glowColor?: string
    glowIntensity?: number
    breathingCursor: boolean
    breathingDuration?: string
    pageFlipAnimation: boolean
    noiseTexture: boolean
  }

  // 动态效果
  dynamicEffects: {
    colorTemperature: boolean
    temperatureRange?: [number, number] // [min, max] in Kelvin
    autoAdjustBrightness: boolean
    brightnessRange?: [number, number] // [min, max] 0-1
    timeBasedTheme: boolean
    smartFocus: boolean
    paragraphExpansion: boolean
  }

  // 音效支持
  audioEffects: {
    enabled: boolean
    typingSound: string | null
    volume: number
    soundSet: 'mechanical' | 'vintage' | 'modern' | 'silent'
  }
}

// 主题预设类型 (扩展)
export type ThemePreset = 'default' | 'dark' | 'minimal' | 'comfort' | 'high-contrast' | 'vintage' |
  'typewriter-classic' | 'typewriter-dark' | 'typewriter-zen' | 'typewriter-code' | 'typewriter-vintage' | 'typewriter-dynamic'

// 所有类型已在上面单独导出，这里不需要重复导出
