/**
 * 暗黑打字机主题 - Dark Typewriter Theme
 * 
 * 核心特点：
 * - 深色背景减少眼睛疲劳
 * - 荧光绿/青柠色文字
 * - 焦点行微光效果
 * - CRT显示器扫描线纹理
 * - 复古终端风格
 */

import type { TypewriterTheme } from '../../types/theme'

export const darkTypewriterTheme: TypewriterTheme = {
  id: 'typewriter-dark',
  name: '暗黑打字机',
  description: '复古终端风格的暗黑主题，荧光绿文字配合CRT扫描线效果',
  isDark: true,
  category: 'typewriter',
  tags: ['focus', 'dark', 'immersive', 'retro'],
  version: '1.0.0',
  author: 'Milkdown Theme Team',
  
  // 颜色配置
  colors: {
    // 基础颜色
    primary: '#00ff41', // 荧光绿
    secondary: '#00ffff', // 青色
    background: '#0a0a0a', // 深黑背景
    surface: '#1a1a1a', // 深灰表面
    
    // 文本颜色
    textPrimary: '#00ff41', // 荧光绿文字
    textSecondary: '#00cc33', // 深绿文字
    textMuted: '#006600', // 暗绿文字
    
    // 边框和分割线
    border: '#333333', // 深灰边框
    divider: '#222222', // 分割线
    
    // 状态颜色
    success: '#00ff00', // 亮绿
    warning: '#ffff00', // 黄色
    error: '#ff6b6b', // 珊瑚红
    info: '#00ffff', // 青色
    
    // 编辑器特定颜色
    editorBackground: '#0a0a0a', // 深黑编辑器背景
    editorFocusBackground: '#1a1a1a', // 焦点行深灰背景
    editorBorder: '#333333', // 编辑器边框
    editorFocusBorder: '#00ff41', // 焦点边框荧光绿
    
    // 代码相关颜色
    codeBackground: '#1a1a1a', // 深灰代码背景
    codeText: '#ffff00', // 黄色代码文字
    codeBlockBackground: '#0f0f0f', // 代码块背景
    codeBlockBorder: '#333333', // 代码块边框
    
    // 引用块颜色
    blockquoteBackground: '#1a1a1a', // 引用背景
    blockquoteBorder: '#00ff41', // 引用边框荧光绿
    blockquoteText: '#00cc33', // 引用文字
    
    // 链接颜色
    linkColor: '#00ffff', // 青色链接
    linkHoverColor: '#66ffff', // 悬停浅青色
    
    // 选中文本颜色
    selectionBackground: '#004400', // 深绿选中背景
    
    // 光标颜色
    caretColor: '#00ff41' // 荧光绿光标
  },
  
  // 字体配置
  fonts: {
    // 字体族 - 使用等宽字体模拟终端
    fontFamily: '"Courier New", "Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace',
    codeFontFamily: '"Courier New", "Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace',
    
    // 字体大小
    fontSize: '16px',
    codeSize: '14px',
    h1Size: '28px',
    h2Size: '24px',
    h3Size: '20px',
    h4Size: '18px',
    h5Size: '16px',
    h6Size: '14px',
    
    // 字体权重
    fontWeight: '400',
    boldWeight: '700',
    headingWeight: '700',
    
    // 行高
    lineHeight: '1.6',
    headingLineHeight: '1.4',
    
    // 字母间距 - 模拟终端字符间距
    letterSpacing: '0.5px',
    headingLetterSpacing: '1px'
  },
  
  // 间距配置
  spacing: {
    // 基础间距单位
    unit: '8px',
    
    // 编辑器内边距
    editorPadding: '40px 60px',
    
    // 段落间距
    paragraphMargin: '20px 0',
    
    // 标题间距
    headingMarginTop: '32px',
    headingMarginBottom: '16px',
    
    // 列表间距
    listMargin: '16px 0',
    listItemMargin: '8px 0',
    
    // 代码块间距
    codeBlockMargin: '24px 0',
    codeBlockPadding: '16px 20px',
    
    // 引用块间距
    blockquoteMargin: '24px 0',
    blockquotePadding: '16px 20px',
    
    // 表格间距
    tableMargin: '24px 0',
    tableCellPadding: '12px 16px'
  },
  
  // 边框和圆角配置
  borders: {
    // 边框宽度
    borderWidth: '1px',
    focusBorderWidth: '2px',
    
    // 圆角半径
    borderRadius: '2px',
    smallRadius: '1px',
    largeRadius: '4px',
    
    // 代码块圆角
    codeBlockRadius: '2px',
    
    // 引用块圆角
    blockquoteRadius: '2px'
  },
  
  // 阴影配置
  shadows: {
    // 基础阴影
    small: '0 1px 3px rgba(0, 255, 65, 0.2)',
    medium: '0 2px 6px rgba(0, 255, 65, 0.3)',
    large: '0 4px 12px rgba(0, 255, 65, 0.4)',
    
    // 编辑器阴影 - 荧光绿发光效果
    editorShadow: '0 0 10px rgba(0, 255, 65, 0.3)',
    editorHoverShadow: '0 0 20px rgba(0, 255, 65, 0.4)',
    editorFocusShadow: '0 0 30px rgba(0, 255, 65, 0.5)',
    
    // 代码块阴影
    codeBlockShadow: '0 0 5px rgba(0, 255, 65, 0.2)'
  },
  
  // 动画配置
  animations: {
    // 过渡时间
    transitionDuration: '0.2s',
    fastTransition: '0.1s',
    slowTransition: '0.4s',
    
    // 缓动函数
    easing: 'ease-out',
    
    // 特殊动画
    typingGlow: '0 0 10px rgba(0, 255, 65, 0.8)',
    hoverTransform: 'none'
  },
  
  // 打字机特效配置
  typewriterEffects: {
    // 焦点行效果
    focusLine: {
      enabled: true,
      highlightColor: '#1a1a1a',
      fadeDistance: 120,
      centerOnFocus: true,
      gradientIntensity: 0.8,
      markerColor: '#00ff41',
      markerWidth: '3px'
    },
    
    // 渐变淡化效果
    fadeEffect: {
      enabled: true,
      fadeOpacity: 0.2,
      fadeDistance: '180px',
      animationDuration: '0.2s',
      easing: 'ease-out'
    },
    
    // 特殊视觉效果
    visualEffects: {
      scanLines: true, // 启用CRT扫描线
      scanLineOpacity: 0.03,
      scanLineSpeed: '2s',
      paperTexture: null, // 不使用纸质纹理
      glowEffect: true, // 启用发光效果
      glowColor: '#00ff41',
      glowIntensity: 0.6,
      breathingCursor: true,
      breathingDuration: '1s',
      pageFlipAnimation: false,
      noiseTexture: true // 启用电子噪音纹理
    },
    
    // 动态效果
    dynamicEffects: {
      colorTemperature: false,
      autoAdjustBrightness: false,
      timeBasedTheme: false,
      smartFocus: true,
      paragraphExpansion: false
    },
    
    // 音效支持
    audioEffects: {
      enabled: false,
      typingSound: '/assets/sounds/typewriter-electronic.mp3',
      volume: 0.2,
      soundSet: 'modern'
    }
  },
  
  // 自定义CSS
  customCSS: `
    /* 暗黑打字机主题自定义样式 */
    .theme-typewriter-dark {
      /* CRT扫描线效果 */
      background-image: 
        linear-gradient(
          90deg,
          transparent 50%,
          rgba(0, 255, 65, var(--typewriter-scan-line-opacity, 0.03)) 50%
        );
      background-size: 2px 2px;
      animation: scan-lines var(--typewriter-scan-line-speed, 2s) linear infinite;
    }
    
    @keyframes scan-lines {
      0% { background-position: 0 0; }
      100% { background-position: 0 2px; }
    }
    
    /* 电子噪音纹理 */
    .theme-typewriter-dark::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><filter id="noise"><feTurbulence baseFrequency="0.9" numOctaves="1" result="noise"/><feColorMatrix in="noise" type="saturate" values="0"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0.1 0 0.2 0"/></feComponentTransfer></filter></defs><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.05"/></svg>');
      pointer-events: none;
      z-index: 1;
    }
    
    /* 编辑器容器发光效果 */
    .theme-typewriter-dark .milkdown-editor-content {
      background: var(--theme-color-editor-background);
      border: var(--theme-border-border-width) solid var(--theme-color-editor-border);
      box-shadow: 
        var(--theme-shadow-editor-shadow),
        inset 0 0 20px rgba(0, 255, 65, 0.1);
      position: relative;
      z-index: 2;
    }
    
    /* 焦点行发光效果 */
    .theme-typewriter-dark .ProseMirror-focused .current-line {
      background: var(--typewriter-focus-color);
      border-left: var(--typewriter-focus-marker-width) solid var(--typewriter-focus-marker-color);
      box-shadow: 
        0 0 10px rgba(0, 255, 65, 0.4),
        inset 0 0 5px rgba(0, 255, 65, 0.2);
      text-shadow: 0 0 3px rgba(0, 255, 65, 0.5);
    }
    
    /* 文字发光效果 */
    .theme-typewriter-dark .ProseMirror {
      text-shadow: 0 0 2px rgba(0, 255, 65, 0.3);
    }
    
    /* 标题发光效果 */
    .theme-typewriter-dark .ProseMirror h1,
    .theme-typewriter-dark .ProseMirror h2,
    .theme-typewriter-dark .ProseMirror h3 {
      text-shadow: 0 0 5px rgba(0, 255, 65, 0.6);
      border-bottom-color: var(--theme-color-primary);
      border-bottom-style: solid;
    }
    
    /* 光标发光效果 */
    .theme-typewriter-dark .ProseMirror-cursor {
      border-left-color: var(--theme-color-caret-color);
      box-shadow: 0 0 5px rgba(0, 255, 65, 0.8);
    }
    
    /* 呼吸灯光标动画 */
    .theme-typewriter-dark .ProseMirror-focused .ProseMirror-cursor {
      animation: cursor-glow var(--typewriter-breathing-duration, 1s) ease-in-out infinite;
    }
    
    @keyframes cursor-glow {
      0%, 100% { 
        opacity: 1;
        box-shadow: 0 0 5px rgba(0, 255, 65, 0.8);
      }
      50% { 
        opacity: 0.3;
        box-shadow: 0 0 15px rgba(0, 255, 65, 1);
      }
    }
    
    /* 代码块终端风格 */
    .theme-typewriter-dark .ProseMirror pre {
      background: var(--theme-color-code-block-background);
      border: var(--theme-border-border-width) solid var(--theme-color-code-block-border);
      box-shadow: 
        var(--theme-shadow-code-block-shadow),
        inset 0 0 10px rgba(0, 255, 65, 0.1);
    }
    
    .theme-typewriter-dark .ProseMirror pre::before {
      content: '$ ';
      color: var(--theme-color-primary);
      text-shadow: 0 0 3px rgba(0, 255, 65, 0.8);
    }
    
    /* 引用块发光边框 */
    .theme-typewriter-dark .ProseMirror blockquote {
      border-left-color: var(--theme-color-blockquote-border);
      box-shadow: -3px 0 10px rgba(0, 255, 65, 0.3);
    }
    
    /* 链接发光效果 */
    .theme-typewriter-dark .ProseMirror a {
      color: var(--theme-color-link-color);
      text-shadow: 0 0 3px rgba(0, 255, 255, 0.6);
      text-decoration: none;
      border-bottom: 1px dotted var(--theme-color-link-color);
    }
    
    .theme-typewriter-dark .ProseMirror a:hover {
      text-shadow: 0 0 5px rgba(0, 255, 255, 0.8);
      border-bottom-style: solid;
    }
    
    /* 选中文本发光 */
    .theme-typewriter-dark .ProseMirror ::selection {
      background: var(--theme-color-selection-background);
      text-shadow: 0 0 3px rgba(0, 255, 65, 0.8);
    }
    
    /* 表格发光边框 */
    .theme-typewriter-dark .ProseMirror table {
      border-color: var(--theme-color-border);
      box-shadow: 0 0 5px rgba(0, 255, 65, 0.2);
    }
    
    .theme-typewriter-dark .ProseMirror th,
    .theme-typewriter-dark .ProseMirror td {
      border-color: var(--theme-color-border);
    }
    
    .theme-typewriter-dark .ProseMirror th {
      background: var(--theme-color-surface);
      text-shadow: 0 0 2px rgba(0, 255, 65, 0.4);
    }
    
    /* 水平分割线发光 */
    .theme-typewriter-dark .ProseMirror hr {
      border: none;
      height: 1px;
      background: var(--theme-color-primary);
      box-shadow: 0 0 5px rgba(0, 255, 65, 0.6);
      margin: 2em 0;
    }
    
    /* 滚动条样式 */
    .theme-typewriter-dark ::-webkit-scrollbar {
      width: 8px;
      background: var(--theme-color-background);
    }
    
    .theme-typewriter-dark ::-webkit-scrollbar-thumb {
      background: var(--theme-color-primary);
      border-radius: 4px;
      box-shadow: 0 0 3px rgba(0, 255, 65, 0.5);
    }
    
    .theme-typewriter-dark ::-webkit-scrollbar-thumb:hover {
      box-shadow: 0 0 5px rgba(0, 255, 65, 0.8);
    }
  `,
  
  // 需要的资源文件
  requiredAssets: [
    '/assets/sounds/typewriter-electronic.mp3'
  ]
}

export default darkTypewriterTheme
