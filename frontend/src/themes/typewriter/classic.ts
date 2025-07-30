/**
 * 经典打字机主题 - Classic Typewriter Theme
 * 
 * 核心特点：
 * - 焦点行高亮（当前编辑行居中+上下渐变淡化）
 * - 仿纸质背景（米黄/浅灰纹理）
 * - 等宽字体（Courier New, Monaco）
 * - 段落两侧留白（模拟纸张边界）
 * - 打字机音效支持（可选）
 */

import type { TypewriterTheme } from '../../types/theme'

export const classicTypewriterTheme: TypewriterTheme = {
  id: 'typewriter-classic',
  name: '经典打字机',
  description: '模拟传统打字机的经典体验，专注写作的沉浸式环境',
  isDark: false,
  category: 'typewriter',
  tags: ['focus', 'retro', 'immersive'],
  version: '1.0.0',
  author: 'Milkdown Theme Team',
  
  // 颜色配置
  colors: {
    // 基础颜色
    primary: '#d2691e', // 橙棕色
    secondary: '#8b4513', // 深棕色
    background: '#f5f5dc', // 米黄色背景
    surface: '#ffffff', // 纯白表面
    
    // 文本颜色
    textPrimary: '#2c2c2c', // 深灰文字
    textSecondary: '#4a4a4a', // 中灰文字
    textMuted: '#808080', // 浅灰文字
    
    // 边框和分割线
    border: '#d3d3d3', // 浅灰边框
    divider: '#e6e6e6', // 分割线
    
    // 状态颜色
    success: '#228b22', // 森林绿
    warning: '#daa520', // 金黄色
    error: '#b22222', // 火砖红
    info: '#4682b4', // 钢蓝色
    
    // 编辑器特定颜色
    editorBackground: '#f5f5dc', // 米黄色编辑器背景
    editorFocusBackground: '#ffffff', // 焦点行纯白背景
    editorBorder: '#d3d3d3', // 编辑器边框
    editorFocusBorder: '#d2691e', // 焦点边框
    
    // 代码相关颜色
    codeBackground: '#f0f0f0', // 浅灰代码背景
    codeText: '#8b0000', // 深红代码文字
    codeBlockBackground: '#f8f8f8', // 代码块背景
    codeBlockBorder: '#d3d3d3', // 代码块边框
    
    // 引用块颜色
    blockquoteBackground: '#f9f9f9', // 引用背景
    blockquoteBorder: '#d2691e', // 引用边框（橙棕色）
    blockquoteText: '#555555', // 引用文字
    
    // 链接颜色
    linkColor: '#b8860b', // 深金色链接
    linkHoverColor: '#daa520', // 悬停金黄色
    
    // 选中文本颜色
    selectionBackground: '#ffe4b5', // 浅橙色选中背景
    
    // 光标颜色
    caretColor: '#d2691e' // 橙棕色光标
  },
  
  // 字体配置
  fonts: {
    // 字体族 - 使用等宽字体模拟打字机
    fontFamily: '"Courier New", "Monaco", "Menlo", "Ubuntu Mono", monospace',
    codeFontFamily: '"Courier New", "Monaco", "Menlo", "Ubuntu Mono", monospace',
    
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
    
    // 行高 - 适合打字机风格的行距
    lineHeight: '1.8',
    headingLineHeight: '1.4',
    
    // 字母间距 - 模拟打字机的字符间距
    letterSpacing: '0.5px',
    headingLetterSpacing: '1px'
  },
  
  // 间距配置
  spacing: {
    // 基础间距单位
    unit: '8px',
    
    // 编辑器内边距 - 模拟纸张边距
    editorPadding: '60px 80px',
    
    // 段落间距
    paragraphMargin: '24px 0',
    
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
    blockquotePadding: '16px 20px 16px 40px',
    
    // 表格间距
    tableMargin: '24px 0',
    tableCellPadding: '12px 16px'
  },
  
  // 边框和圆角配置
  borders: {
    // 边框宽度
    borderWidth: '1px',
    focusBorderWidth: '2px',
    
    // 圆角半径 - 较小的圆角保持复古感
    borderRadius: '4px',
    smallRadius: '2px',
    largeRadius: '8px',
    
    // 代码块圆角
    codeBlockRadius: '4px',
    
    // 引用块圆角
    blockquoteRadius: '4px'
  },
  
  // 阴影配置
  shadows: {
    // 基础阴影
    small: '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: '0 2px 6px rgba(0, 0, 0, 0.15)',
    large: '0 4px 12px rgba(0, 0, 0, 0.2)',
    
    // 编辑器阴影 - 模拟纸张效果
    editorShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    editorHoverShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
    editorFocusShadow: '0 0 8px rgba(210, 105, 30, 0.3)',
    
    // 代码块阴影
    codeBlockShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  
  // 动画配置
  animations: {
    // 过渡时间
    transitionDuration: '0.3s',
    fastTransition: '0.15s',
    slowTransition: '0.6s',
    
    // 缓动函数
    easing: 'ease-out',
    
    // 特殊动画
    typingGlow: '0 0 5px rgba(210, 105, 30, 0.5)',
    hoverTransform: 'translateY(-1px)'
  },
  
  // 打字机特效配置
  typewriterEffects: {
    // 焦点行效果
    focusLine: {
      enabled: true,
      highlightColor: '#ffffff',
      fadeDistance: 150, // 渐变淡化距离（像素）
      centerOnFocus: true, // 焦点行居中
      gradientIntensity: 0.7, // 渐变强度
      markerColor: '#d2691e', // 左侧标记颜色
      markerWidth: '4px' // 左侧标记宽度
    },
    
    // 渐变淡化效果
    fadeEffect: {
      enabled: true,
      fadeOpacity: 0.3, // 非焦点内容透明度
      fadeDistance: '200px', // 淡化距离
      animationDuration: '0.3s', // 动画持续时间
      easing: 'ease-out' // 缓动函数
    },
    
    // 特殊视觉效果
    visualEffects: {
      scanLines: false, // 不使用扫描线（现代打字机风格）
      paperTexture: '/assets/textures/paper-texture.png', // 纸质纹理
      glowEffect: false, // 不使用发光效果
      breathingCursor: true, // 呼吸灯光标
      breathingDuration: '1.5s', // 呼吸周期
      pageFlipAnimation: true, // 翻页动画
      noiseTexture: false // 不使用噪点纹理
    },
    
    // 动态效果
    dynamicEffects: {
      colorTemperature: false, // 不使用色温调节
      autoAdjustBrightness: false, // 不自动调节亮度
      timeBasedTheme: false, // 不使用时间主题
      smartFocus: true, // 智能焦点
      paragraphExpansion: false // 不使用段落展开
    },
    
    // 音效支持
    audioEffects: {
      enabled: false, // 默认关闭音效
      typingSound: '/assets/sounds/typewriter-classic.mp3',
      volume: 0.3,
      soundSet: 'vintage'
    }
  },
  
  // 自定义CSS
  customCSS: `
    /* 经典打字机主题自定义样式 */
    .theme-typewriter-classic {
      /* 纸质纹理背景 */
      background-image: var(--typewriter-paper-texture, none);
      background-repeat: repeat;
      background-size: 200px 200px;
    }
    
    /* 焦点行效果 */
    .theme-typewriter-classic .milkdown-editor-content {
      position: relative;
    }
    
    /* 焦点行高亮 */
    .theme-typewriter-classic .milkdown-editor-content .ProseMirror-focused .focus-line {
      background: var(--typewriter-focus-color);
      border-left: var(--typewriter-focus-marker-width) solid var(--typewriter-focus-marker-color);
      box-shadow: 0 0 10px rgba(210, 105, 30, 0.2);
      position: relative;
      z-index: 1;
    }
    
    /* 渐变淡化效果 */
    .theme-typewriter-classic .milkdown-editor-content .fade-content {
      opacity: var(--typewriter-fade-opacity);
      transition: opacity var(--typewriter-fade-duration) var(--typewriter-fade-easing);
    }
    
    /* 呼吸灯光标 */
    .theme-typewriter-classic .ProseMirror-focused .ProseMirror-cursor {
      animation: cursor-breathing var(--typewriter-breathing-duration) ease-in-out infinite;
    }
    
    @keyframes cursor-breathing {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    
    /* 纸张边界效果 */
    .theme-typewriter-classic .milkdown-editor-content {
      max-width: 800px;
      margin: 0 auto;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      border: 1px solid #d3d3d3;
    }
    
    /* 段落样式 */
    .theme-typewriter-classic .milkdown-editor-content p {
      text-indent: 2em; /* 段落首行缩进 */
      margin: 1.2em 0;
    }
    
    /* 标题样式 */
    .theme-typewriter-classic .milkdown-editor-content h1,
    .theme-typewriter-classic .milkdown-editor-content h2,
    .theme-typewriter-classic .milkdown-editor-content h3 {
      text-align: center;
      border-bottom: 2px solid var(--theme-color-primary);
      padding-bottom: 0.5em;
      margin-bottom: 1em;
    }
    
    /* 引用块样式 */
    .theme-typewriter-classic .milkdown-editor-content blockquote {
      font-style: italic;
      position: relative;
    }
    
    .theme-typewriter-classic .milkdown-editor-content blockquote::before {
      content: '"';
      font-size: 3em;
      color: var(--theme-color-primary);
      position: absolute;
      left: -0.5em;
      top: -0.2em;
    }
    
    /* 代码块样式 */
    .theme-typewriter-classic .milkdown-editor-content pre {
      background: var(--theme-color-code-block-background);
      border: 1px solid var(--theme-color-code-block-border);
      position: relative;
    }
    
    .theme-typewriter-classic .milkdown-editor-content pre::before {
      content: '> ';
      color: var(--theme-color-primary);
      font-weight: bold;
    }
  `,
  
  // 需要的资源文件
  requiredAssets: [
    '/assets/textures/paper-texture.png',
    '/assets/sounds/typewriter-classic.mp3'
  ]
}

export default classicTypewriterTheme
