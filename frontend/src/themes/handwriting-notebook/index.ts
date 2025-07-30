import type { Theme } from '../../types/theme'
import './styles.css'

// 经典笔记本主题（蓝色横线，白色背景）
export const handwritingNotebookTheme: Theme = {
  id: 'handwriting-notebook',
  name: '经典笔记本',
  description: '蓝色横线的经典笔记本风格，纯白背景配蓝色墨水',
  isDark: false,
  colors: {
    primary: '#1E3A8A', // 深蓝色
    secondary: '#3B82F6',
    background: '#FFFFFF', // 纯白背景
    surface: '#FEFEFE',
    
    textPrimary: '#1E3A8A', // 蓝墨水
    textSecondary: '#3B82F6',
    textMuted: '#6B7280',
    
    border: '#3B82F6', // 蓝色横线
    divider: '#E5E7EB',
    
    success: '#059669', // 绿色
    warning: '#D97706', // 橙色
    error: '#DC2626', // 红色
    info: '#0284C7', // 蓝色
    
    editorBackground: '#FFFFFF',
    editorFocusBackground: '#F8FAFC',
    editorBorder: '#3B82F6',
    editorFocusBorder: '#1E3A8A',
    
    codeBackground: '#F1F5F9', // 浅蓝灰色便签
    codeText: '#1E40AF',
    codeBlockBackground: '#F1F5F9',
    codeBlockBorder: '#CBD5E1',
    
    blockquoteBackground: '#F8FAFC', // 引用块背景
    blockquoteBorder: '#3B82F6',
    blockquoteText: '#1E3A8A',
    
    linkColor: '#1E3A8A',
    linkHoverColor: '#1E40AF',
    
    selectionBackground: '#DBEAFE', // 浅蓝色高亮
    caretColor: '#1E3A8A'
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
    small: '0 1px 3px rgba(30, 58, 138, 0.1)',
    medium: '0 2px 8px rgba(30, 58, 138, 0.15)',
    large: '0 4px 16px rgba(30, 58, 138, 0.2)',
    editorShadow: '0 2px 8px rgba(30, 58, 138, 0.08)',
    editorHoverShadow: '0 4px 12px rgba(30, 58, 138, 0.12)',
    editorFocusShadow: '0 0 8px rgba(30, 58, 138, 0.2)',
    codeBlockShadow: '0 2px 6px rgba(203, 213, 225, 0.3)'
  },
  animations: {
    transitionDuration: '0.3s',
    fastTransition: '0.2s',
    slowTransition: '0.5s',
    easing: 'ease-out',
    typingGlow: 'notebook-glow 1.5s ease-in-out infinite',
    hoverTransform: 'translateY(-1px)'
  }
}

export default handwritingNotebookTheme
