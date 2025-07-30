import type { Theme } from '../../types/theme'
import './styles.css'

// 方格纸主题
export const handwritingGridTheme: Theme = {
  id: 'handwriting-grid',
  name: '方格纸',
  description: '浅灰色方格线的方格纸风格，适合绘图和精确书写',
  isDark: false,
  colors: {
    primary: '#2D3748', // 深灰色
    secondary: '#4A5568',
    background: '#FEFEFE', // 近白色
    surface: '#FFFFFF',
    
    textPrimary: '#2D3748', // 深灰色墨水
    textSecondary: '#4A5568',
    textMuted: '#718096',
    
    border: '#E2E8F0', // 浅灰色方格线
    divider: '#F7FAFC',
    
    success: '#38A169', // 绿色
    warning: '#D69E2E', // 黄色
    error: '#E53E3E', // 红色
    info: '#3182CE', // 蓝色
    
    editorBackground: '#FEFEFE',
    editorFocusBackground: '#F7FAFC',
    editorBorder: '#E2E8F0',
    editorFocusBorder: '#2D3748',
    
    codeBackground: '#F7FAFC', // 浅灰色便签
    codeText: '#2D3748',
    codeBlockBackground: '#F7FAFC',
    codeBlockBorder: '#E2E8F0',
    
    blockquoteBackground: '#F7FAFC',
    blockquoteBorder: '#4A5568',
    blockquoteText: '#2D3748',
    
    linkColor: '#3182CE', // 蓝色链接
    linkHoverColor: '#2C5282',
    
    selectionBackground: '#BEE3F8', // 浅蓝色高亮
    caretColor: '#2D3748'
  },
  fonts: {
    fontFamily: '"Segoe Print", "Comic Sans MS", "Brush Script MT", "楷体", "KaiTi", cursive, sans-serif',
    codeFontFamily: '"Courier New", "Monaco", "Menlo", monospace',
    
    fontSize: '16px',
    codeSize: '14px',
    h1Size: '32px',
    h2Size: '24px',
    h3Size: '19px',
    h4Size: '18px',
    h5Size: '16px',
    h6Size: '14px',
    
    fontWeight: '400',
    boldWeight: '600',
    headingWeight: '500',
    
    lineHeight: '1.6',
    headingLineHeight: '1.4',
    
    letterSpacing: '0.5px',
    headingLetterSpacing: '0.3px'
  },
  spacing: {
    unit: '4px',
    editorPadding: '32px',
    paragraphMargin: '20px',
    headingMarginTop: '36px',
    headingMarginBottom: '24px',
    listMargin: '24px',
    listItemMargin: '12px',
    codeBlockMargin: '28px',
    codeBlockPadding: '20px',
    blockquoteMargin: '28px',
    blockquotePadding: '20px 28px',
    tableMargin: '28px',
    tableCellPadding: '12px 16px'
  },
  borders: {
    borderWidth: '1px',
    focusBorderWidth: '2px',
    borderRadius: '8px',
    smallRadius: '4px',
    largeRadius: '12px',
    codeBlockRadius: '6px',
    blockquoteRadius: '0 6px 6px 0'
  },
  shadows: {
    small: '0 1px 3px rgba(45, 55, 72, 0.1)',
    medium: '0 2px 8px rgba(45, 55, 72, 0.15)',
    large: '0 4px 16px rgba(45, 55, 72, 0.2)',
    editorShadow: '0 2px 8px rgba(45, 55, 72, 0.08)',
    editorHoverShadow: '0 4px 12px rgba(45, 55, 72, 0.12)',
    editorFocusShadow: '0 0 8px rgba(45, 55, 72, 0.2)',
    codeBlockShadow: '0 2px 6px rgba(226, 232, 240, 0.3)'
  },
  animations: {
    transitionDuration: '0.3s',
    fastTransition: '0.2s',
    slowTransition: '0.5s',
    easing: 'ease-out',
    typingGlow: 'grid-glow 1.5s ease-in-out infinite',
    hoverTransform: 'translateY(-1px)'
  }
}

export default handwritingGridTheme
