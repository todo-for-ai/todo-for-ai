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
}

// 主题上下文类型
export interface ThemeContextType {
  currentTheme: Theme
  availableThemes: Theme[]
  setTheme: (themeId: string) => void
  isDarkMode: boolean
  toggleDarkMode: () => void
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

// 主题变更事件
export interface ThemeChangeEvent {
  previousTheme: Theme
  currentTheme: Theme
  timestamp: number
}

// 主题预设类型
export type ThemePreset = 'default' | 'dark' | 'minimal' | 'comfort' | 'high-contrast' | 'vintage'

// 导出所有类型
export type {
  ThemeColors,
  ThemeFonts,
  ThemeSpacing,
  ThemeBorders,
  ThemeShadows,
  ThemeAnimations,
  Theme,
  ThemeContextType,
  ThemeOptions,
  ThemeChangeEvent,
  ThemePreset
}
