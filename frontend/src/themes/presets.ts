import type { Theme } from '../types/theme'
import classicTypewriterTheme from './typewriter/classic'
import darkTypewriterTheme from './typewriter/dark'
import handwritingClassicTheme from './handwriting-classic'
import handwritingNotebookTheme from './handwriting-notebook'
import handwritingKraftTheme from './handwriting-kraft'
import handwritingGridTheme from './handwriting-grid'

// 默认主题（当前样式的优化版本）
export const defaultTheme: Theme = {
  id: 'default',
  name: '默认主题',
  description: '现代化的默认主题，适合日常使用',
  isDark: false,
  colors: {
    primary: '#1890ff',
    secondary: '#52c41a',
    background: '#fafbfc',
    surface: '#ffffff',
    
    textPrimary: '#2c3e50',
    textSecondary: '#34495e',
    textMuted: '#a0aec0',
    
    border: '#e2e8f0',
    divider: '#f1f5f9',
    
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1890ff',
    
    editorBackground: '#fafbfc',
    editorFocusBackground: 'rgba(24, 144, 255, 0.02)',
    editorBorder: '#e2e8f0',
    editorFocusBorder: '#1890ff',
    
    codeBackground: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    codeText: '#e53e3e',
    codeBlockBackground: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
    codeBlockBorder: '#4a5568',
    
    blockquoteBackground: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    blockquoteBorder: '#1890ff',
    blockquoteText: '#475569',
    
    linkColor: '#1890ff',
    linkHoverColor: '#0056b3',
    
    selectionBackground: 'rgba(24, 144, 255, 0.2)',
    caretColor: '#1890ff'
  },
  fonts: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
    codeFontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", monospace',
    
    fontSize: '15px',
    codeSize: '13px',
    h1Size: '28px',
    h2Size: '24px',
    h3Size: '20px',
    h4Size: '18px',
    h5Size: '16px',
    h6Size: '14px',
    
    fontWeight: '400',
    boldWeight: '700',
    headingWeight: '700',
    
    lineHeight: '1.8',
    headingLineHeight: '1.4',
    
    letterSpacing: '0.3px',
    headingLetterSpacing: '-0.5px'
  },
  spacing: {
    unit: '4px',
    editorPadding: '20px',
    paragraphMargin: '18px',
    headingMarginTop: '32px',
    headingMarginBottom: '20px',
    listMargin: '20px',
    listItemMargin: '8px',
    codeBlockMargin: '24px',
    codeBlockPadding: '24px',
    blockquoteMargin: '24px',
    blockquotePadding: '20px 24px',
    tableMargin: '24px',
    tableCellPadding: '12px 16px'
  },
  borders: {
    borderWidth: '1px',
    focusBorderWidth: '2px',
    borderRadius: '12px',
    smallRadius: '6px',
    largeRadius: '16px',
    codeBlockRadius: '12px',
    blockquoteRadius: '0 8px 8px 0'
  },
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.1)',
    large: '0 8px 24px rgba(0, 0, 0, 0.15)',
    editorShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    editorHoverShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    editorFocusShadow: '0 0 8px rgba(24, 144, 255, 0.3)',
    codeBlockShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
  },
  animations: {
    transitionDuration: '0.2s',
    fastTransition: '0.15s',
    slowTransition: '0.3s',
    easing: 'ease',
    typingGlow: 'typing-glow 2s ease-in-out infinite',
    hoverTransform: 'translateX(4px)'
  }
}

// 深色主题
export const darkTheme: Theme = {
  id: 'dark',
  name: '深色主题',
  description: '护眼的深色主题，适合夜间使用',
  isDark: true,
  colors: {
    primary: '#4096ff',
    secondary: '#73d13d',
    background: '#0f1419',
    surface: '#1a202c',
    
    textPrimary: '#f7fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#718096',
    
    border: '#4a5568',
    divider: '#2d3748',
    
    success: '#73d13d',
    warning: '#ffc53d',
    error: '#ff7875',
    info: '#4096ff',
    
    editorBackground: '#1a202c',
    editorFocusBackground: 'rgba(64, 150, 255, 0.05)',
    editorBorder: '#4a5568',
    editorFocusBorder: '#4096ff',
    
    codeBackground: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
    codeText: '#68d391',
    codeBlockBackground: 'linear-gradient(135deg, #0f1419 0%, #1a202c 100%)',
    codeBlockBorder: '#2d3748',
    
    blockquoteBackground: 'linear-gradient(135deg, #2d3748 0%, #4a5568 100%)',
    blockquoteBorder: '#4096ff',
    blockquoteText: '#cbd5e0',
    
    linkColor: '#4096ff',
    linkHoverColor: '#69c0ff',
    
    selectionBackground: 'rgba(64, 150, 255, 0.3)',
    caretColor: '#4096ff'
  },
  fonts: defaultTheme.fonts,
  spacing: defaultTheme.spacing,
  borders: defaultTheme.borders,
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.4)',
    large: '0 8px 24px rgba(0, 0, 0, 0.5)',
    editorShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    editorHoverShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    editorFocusShadow: '0 0 8px rgba(64, 150, 255, 0.4)',
    codeBlockShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
  },
  animations: defaultTheme.animations
}

// 简约主题
export const minimalTheme: Theme = {
  id: 'minimal',
  name: '简约主题',
  description: '极简设计，专注内容',
  isDark: false,
  colors: {
    primary: '#000000',
    secondary: '#666666',
    background: '#ffffff',
    surface: '#ffffff',
    
    textPrimary: '#000000',
    textSecondary: '#333333',
    textMuted: '#999999',
    
    border: '#e0e0e0',
    divider: '#f5f5f5',
    
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
    
    editorBackground: '#ffffff',
    editorFocusBackground: '#fafafa',
    editorBorder: '#e0e0e0',
    editorFocusBorder: '#000000',
    
    codeBackground: '#f5f5f5',
    codeText: '#d32f2f',
    codeBlockBackground: '#f8f8f8',
    codeBlockBorder: '#e0e0e0',
    
    blockquoteBackground: '#f9f9f9',
    blockquoteBorder: '#000000',
    blockquoteText: '#555555',
    
    linkColor: '#000000',
    linkHoverColor: '#333333',
    
    selectionBackground: 'rgba(0, 0, 0, 0.1)',
    caretColor: '#000000'
  },
  fonts: {
    ...defaultTheme.fonts,
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '16px',
    lineHeight: '1.6'
  },
  spacing: {
    ...defaultTheme.spacing,
    editorPadding: '24px',
    paragraphMargin: '16px'
  },
  borders: {
    borderWidth: '1px',
    focusBorderWidth: '2px',
    borderRadius: '0px',
    smallRadius: '0px',
    largeRadius: '0px',
    codeBlockRadius: '0px',
    blockquoteRadius: '0px'
  },
  shadows: {
    small: 'none',
    medium: 'none',
    large: 'none',
    editorShadow: 'none',
    editorHoverShadow: 'none',
    editorFocusShadow: 'none',
    codeBlockShadow: 'none'
  },
  animations: {
    ...defaultTheme.animations,
    transitionDuration: '0.1s'
  }
}

// 护眼主题
export const comfortTheme: Theme = {
  id: 'comfort',
  name: '护眼主题',
  description: '温和的色彩，减少眼部疲劳',
  isDark: false,
  colors: {
    primary: '#8b5a3c',
    secondary: '#a0845c',
    background: '#f7f3e9',
    surface: '#faf8f1',
    
    textPrimary: '#3e2723',
    textSecondary: '#5d4037',
    textMuted: '#8d6e63',
    
    border: '#d7ccc8',
    divider: '#efebe9',
    
    success: '#689f38',
    warning: '#f57c00',
    error: '#d32f2f',
    info: '#1976d2',
    
    editorBackground: '#faf8f1',
    editorFocusBackground: '#f5f1e8',
    editorBorder: '#d7ccc8',
    editorFocusBorder: '#8b5a3c',
    
    codeBackground: '#efebe9',
    codeText: '#bf360c',
    codeBlockBackground: '#3e2723',
    codeBlockBorder: '#5d4037',
    
    blockquoteBackground: '#f3e5ab',
    blockquoteBorder: '#8b5a3c',
    blockquoteText: '#5d4037',
    
    linkColor: '#8b5a3c',
    linkHoverColor: '#6d4c41',
    
    selectionBackground: 'rgba(139, 90, 60, 0.2)',
    caretColor: '#8b5a3c'
  },
  fonts: {
    ...defaultTheme.fonts,
    fontSize: '16px',
    lineHeight: '1.7'
  },
  spacing: defaultTheme.spacing,
  borders: {
    ...defaultTheme.borders,
    borderRadius: '8px',
    smallRadius: '4px',
    largeRadius: '12px'
  },
  shadows: {
    small: '0 1px 3px rgba(62, 39, 35, 0.1)',
    medium: '0 2px 8px rgba(62, 39, 35, 0.15)',
    large: '0 4px 16px rgba(62, 39, 35, 0.2)',
    editorShadow: '0 1px 3px rgba(62, 39, 35, 0.1)',
    editorHoverShadow: '0 2px 8px rgba(62, 39, 35, 0.15)',
    editorFocusShadow: '0 0 6px rgba(139, 90, 60, 0.3)',
    codeBlockShadow: '0 2px 8px rgba(62, 39, 35, 0.2)'
  },
  animations: defaultTheme.animations
}

// 高对比度主题
export const highContrastTheme: Theme = {
  id: 'high-contrast',
  name: '高对比度主题',
  description: '高对比度设计，提升可读性',
  isDark: false,
  colors: {
    primary: '#0066cc',
    secondary: '#009900',
    background: '#ffffff',
    surface: '#ffffff',

    textPrimary: '#000000',
    textSecondary: '#000000',
    textMuted: '#666666',

    border: '#000000',
    divider: '#cccccc',

    success: '#008000',
    warning: '#ff8c00',
    error: '#cc0000',
    info: '#0066cc',

    editorBackground: '#ffffff',
    editorFocusBackground: '#f0f8ff',
    editorBorder: '#000000',
    editorFocusBorder: '#0066cc',

    codeBackground: '#f0f0f0',
    codeText: '#cc0000',
    codeBlockBackground: '#000000',
    codeBlockBorder: '#000000',

    blockquoteBackground: '#f5f5f5',
    blockquoteBorder: '#0066cc',
    blockquoteText: '#000000',

    linkColor: '#0066cc',
    linkHoverColor: '#004499',

    selectionBackground: 'rgba(0, 102, 204, 0.3)',
    caretColor: '#0066cc'
  },
  fonts: {
    ...defaultTheme.fonts,
    fontWeight: '500',
    boldWeight: '800',
    fontSize: '16px'
  },
  spacing: defaultTheme.spacing,
  borders: {
    borderWidth: '2px',
    focusBorderWidth: '3px',
    borderRadius: '4px',
    smallRadius: '2px',
    largeRadius: '6px',
    codeBlockRadius: '4px',
    blockquoteRadius: '4px'
  },
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.4)',
    large: '0 6px 12px rgba(0, 0, 0, 0.5)',
    editorShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    editorHoverShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
    editorFocusShadow: '0 0 8px rgba(0, 102, 204, 0.5)',
    codeBlockShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
  },
  animations: {
    ...defaultTheme.animations,
    transitionDuration: '0.1s'
  }
}

// 复古主题
export const vintageTheme: Theme = {
  id: 'vintage',
  name: '复古主题',
  description: '怀旧的复古风格，温暖的色调',
  isDark: false,
  colors: {
    primary: '#8b4513',
    secondary: '#cd853f',
    background: '#fdf6e3',
    surface: '#fefbf3',

    textPrimary: '#2f1b14',
    textSecondary: '#5d4037',
    textMuted: '#8d6e63',

    border: '#deb887',
    divider: '#f5deb3',

    success: '#556b2f',
    warning: '#b8860b',
    error: '#a0522d',
    info: '#4682b4',

    editorBackground: '#fefbf3',
    editorFocusBackground: '#faf0e6',
    editorBorder: '#deb887',
    editorFocusBorder: '#8b4513',

    codeBackground: '#f5deb3',
    codeText: '#a0522d',
    codeBlockBackground: '#2f1b14',
    codeBlockBorder: '#5d4037',

    blockquoteBackground: '#fff8dc',
    blockquoteBorder: '#8b4513',
    blockquoteText: '#5d4037',

    linkColor: '#8b4513',
    linkHoverColor: '#654321',

    selectionBackground: 'rgba(139, 69, 19, 0.2)',
    caretColor: '#8b4513'
  },
  fonts: {
    ...defaultTheme.fonts,
    fontFamily: '"Crimson Text", Georgia, "Times New Roman", serif',
    fontSize: '16px',
    lineHeight: '1.7',
    letterSpacing: '0.5px'
  },
  spacing: {
    ...defaultTheme.spacing,
    editorPadding: '28px',
    paragraphMargin: '20px'
  },
  borders: {
    ...defaultTheme.borders,
    borderRadius: '6px',
    smallRadius: '3px',
    largeRadius: '9px'
  },
  shadows: {
    small: '0 1px 3px rgba(47, 27, 20, 0.2)',
    medium: '0 2px 6px rgba(47, 27, 20, 0.25)',
    large: '0 4px 12px rgba(47, 27, 20, 0.3)',
    editorShadow: '0 1px 3px rgba(47, 27, 20, 0.2)',
    editorHoverShadow: '0 2px 6px rgba(47, 27, 20, 0.25)',
    editorFocusShadow: '0 0 6px rgba(139, 69, 19, 0.3)',
    codeBlockShadow: '0 2px 6px rgba(47, 27, 20, 0.3)'
  },
  animations: {
    ...defaultTheme.animations,
    transitionDuration: '0.25s'
  }
}

// 所有预设主题
export const themes: Theme[] = [
  defaultTheme,
  darkTheme,
  minimalTheme,
  comfortTheme,
  highContrastTheme,
  vintageTheme,
  classicTypewriterTheme,
  darkTypewriterTheme,
  handwritingClassicTheme,
  handwritingNotebookTheme,
  handwritingKraftTheme,
  handwritingGridTheme
]

// 根据ID获取主题
export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id)
}

// 获取默认主题
export const getDefaultTheme = (): Theme => {
  return defaultTheme
}
