import type { Theme } from '../../types/theme'
import './styles.css'

// 经典手写风格主题
export const handwritingClassicTheme: Theme = {
  id: 'handwriting-classic',
  name: '经典手写',
  description: '模拟传统纸质笔记本的书写体验，米白色纸张背景配横线',
  isDark: false,
  colors: {
    primary: '#3E3A33',
    secondary: '#8B7355',
    background: '#F8F4E8', // 米白色纸张背景
    surface: '#FEFCF6',
    
    textPrimary: '#3E3A33', // 深棕色墨水
    textSecondary: '#5D4E37', // 棕色
    textMuted: '#8B7355', // 浅棕色
    
    border: '#E0E0E0', // 浅灰色横线
    divider: '#F0EDE5',
    
    success: '#556B2F', // 深橄榄绿
    warning: '#B8860B', // 深金黄色
    error: '#8B4513', // 马鞍棕
    info: '#4682B4', // 钢蓝色
    
    editorBackground: '#F8F4E8', // 纸张色
    editorFocusBackground: '#F5F1E8',
    editorBorder: '#E0E0E0',
    editorFocusBorder: '#3E3A33',
    
    codeBackground: '#FFFDE7', // 便签纸黄色
    codeText: '#8B4513',
    codeBlockBackground: '#FFFDE7',
    codeBlockBorder: '#DDD6C1',
    
    blockquoteBackground: '#F9F6F0', // 引用块背景
    blockquoteBorder: '#8B7355',
    blockquoteText: '#5D4E37',
    
    linkColor: '#4682B4', // 蓝墨水色
    linkHoverColor: '#2F4F4F',
    
    selectionBackground: '#FFF9C4', // 荧光笔高亮
    caretColor: '#3E3A33'
  },
  fonts: {
    fontFamily: '"Segoe Print", "Comic Sans MS", "Brush Script MT", "楷体", "KaiTi", cursive, sans-serif',
    codeFontFamily: '"Courier New", "Monaco", "Menlo", monospace',
    
    fontSize: '16px',
    codeSize: '14px',
    h1Size: '32px', // 2em
    h2Size: '24px', // 1.5em  
    h3Size: '19px', // 1.2em
    h4Size: '18px',
    h5Size: '16px',
    h6Size: '14px',
    
    fontWeight: '400',
    boldWeight: '600',
    headingWeight: '500',
    
    lineHeight: '1.6', // 模拟真实书写行距
    headingLineHeight: '1.4',
    
    letterSpacing: '0.5px', // 轻微字间距
    headingLetterSpacing: '0.3px'
  },
  spacing: {
    unit: '4px',
    editorPadding: '32px', // 更大的内边距模拟纸张边距
    paragraphMargin: '20px', // 段落间距
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
    borderRadius: '8px', // 轻微圆角模拟纸张
    smallRadius: '4px',
    largeRadius: '12px',
    codeBlockRadius: '6px',
    blockquoteRadius: '0 6px 6px 0'
  },
  shadows: {
    small: '0 1px 3px rgba(62, 58, 51, 0.1)',
    medium: '0 2px 8px rgba(62, 58, 51, 0.15)',
    large: '0 4px 16px rgba(62, 58, 51, 0.2)',
    editorShadow: '0 2px 8px rgba(62, 58, 51, 0.08)', // 纸张阴影
    editorHoverShadow: '0 4px 12px rgba(62, 58, 51, 0.12)',
    editorFocusShadow: '0 0 8px rgba(62, 58, 51, 0.2)',
    codeBlockShadow: '0 2px 6px rgba(221, 214, 193, 0.3)' // 便签纸阴影
  },
  animations: {
    transitionDuration: '0.3s', // 稍慢的过渡模拟手写
    fastTransition: '0.2s',
    slowTransition: '0.5s',
    easing: 'ease-out',
    typingGlow: 'handwriting-glow 1.5s ease-in-out infinite',
    hoverTransform: 'translateY(-1px)' // 轻微上浮效果
  }
}

export default handwritingClassicTheme
