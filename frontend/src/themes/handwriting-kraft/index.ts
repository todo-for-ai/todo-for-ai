import type { Theme } from '../../types/theme'
import './styles.css'

// 复古牛皮纸主题
export const handwritingKraftTheme: Theme = {
  id: 'handwriting-kraft',
  name: '复古牛皮纸',
  description: '深黄色牛皮纸背景，棕色文字，复古怀旧风格',
  isDark: false,
  colors: {
    primary: '#654321', // 深棕色
    secondary: '#8B4513',
    background: '#D2B48C', // 深黄色牛皮纸
    surface: '#DEB887',
    
    textPrimary: '#654321', // 深棕色墨水
    textSecondary: '#8B4513',
    textMuted: '#A0522D',
    
    border: '#CD853F', // 棕色线条
    divider: '#F5DEB3',
    
    success: '#228B22',
    warning: '#DAA520',
    error: '#B22222',
    info: '#4682B4',
    
    editorBackground: '#D2B48C',
    editorFocusBackground: '#DEB887',
    editorBorder: '#CD853F',
    editorFocusBorder: '#654321',
    
    codeBackground: '#F5DEB3', // 浅黄色便签
    codeText: '#8B4513',
    codeBlockBackground: '#F5DEB3',
    codeBlockBorder: '#CD853F',
    
    blockquoteBackground: '#F5DEB3',
    blockquoteBorder: '#8B4513',
    blockquoteText: '#654321',
    
    linkColor: '#8B4513',
    linkHoverColor: '#654321',
    
    selectionBackground: '#F0E68C', // 卡其色高亮
    caretColor: '#654321'
  },
  fonts: {
    fontFamily: '"Brush Script MT", "Lucida Handwriting", "Segoe Print", "楷体", "KaiTi", cursive, serif',
    codeFontFamily: '"Courier New", "Monaco", "Menlo", monospace',
    
    fontSize: '17px',
    codeSize: '14px',
    h1Size: '34px',
    h2Size: '26px',
    h3Size: '20px',
    h4Size: '18px',
    h5Size: '17px',
    h6Size: '15px',
    
    fontWeight: '400',
    boldWeight: '700',
    headingWeight: '600',
    
    lineHeight: '1.7',
    headingLineHeight: '1.3',
    
    letterSpacing: '0.8px',
    headingLetterSpacing: '0.5px'
  },
  spacing: {
    unit: '4px',
    editorPadding: '40px',
    paragraphMargin: '24px',
    headingMarginTop: '40px',
    headingMarginBottom: '28px',
    listMargin: '28px',
    listItemMargin: '14px',
    codeBlockMargin: '32px',
    codeBlockPadding: '24px',
    blockquoteMargin: '32px',
    blockquotePadding: '24px 32px',
    tableMargin: '32px',
    tableCellPadding: '16px 20px'
  },
  borders: {
    borderWidth: '2px',
    focusBorderWidth: '3px',
    borderRadius: '12px',
    smallRadius: '6px',
    largeRadius: '16px',
    codeBlockRadius: '8px',
    blockquoteRadius: '0 8px 8px 0'
  },
  shadows: {
    small: '0 2px 4px rgba(101, 67, 33, 0.15)',
    medium: '0 4px 12px rgba(101, 67, 33, 0.2)',
    large: '0 6px 20px rgba(101, 67, 33, 0.25)',
    editorShadow: '0 3px 10px rgba(101, 67, 33, 0.15)',
    editorHoverShadow: '0 5px 15px rgba(101, 67, 33, 0.2)',
    editorFocusShadow: '0 0 10px rgba(101, 67, 33, 0.25)',
    codeBlockShadow: '0 3px 8px rgba(205, 133, 63, 0.3)'
  },
  animations: {
    transitionDuration: '0.4s',
    fastTransition: '0.25s',
    slowTransition: '0.6s',
    easing: 'ease-out',
    typingGlow: 'kraft-glow 2s ease-in-out infinite',
    hoverTransform: 'translateY(-2px)'
  }
}

export default handwritingKraftTheme
