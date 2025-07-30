# 打字机模式主题系列设计文档

## 设计理念

打字机模式主题系列旨在为用户提供沉浸式的写作体验，通过模拟传统打字机的视觉效果和交互方式，帮助用户专注于内容创作。每个主题都有独特的视觉风格和交互特效，同时保持Milkdown编辑器的三大法则。

## 主题分类系统

### 主题类别 (ThemeCategory)
- `typewriter`: 打字机系列
- `modern`: 现代系列  
- `vintage`: 复古系列
- `minimal`: 极简系列
- `code`: 代码系列
- `dynamic`: 动态系列

### 主题标签 (ThemeTags)
- `focus`: 焦点模式
- `dark`: 深色主题
- `retro`: 复古风格
- `animation`: 动画效果
- `immersive`: 沉浸式体验

## 六大打字机主题设计

### 1. 经典打字机主题 (Classic Typewriter)

**主题ID**: `typewriter-classic`
**分类**: `typewriter`
**标签**: `focus`, `retro`, `immersive`

**核心特点**:
- 焦点行高亮（当前编辑行居中+上下渐变淡化）
- 仿纸质背景（米黄/浅灰纹理）
- 等宽字体（Courier New, Monaco）
- 段落两侧留白（模拟纸张边界）
- 打字机音效支持（可选）

**配色方案**:
```
背景: #f5f5dc (米黄色)
纸张纹理: 微妙的纸质纹理背景图
文字: #2c2c2c (深灰)
焦点行背景: #ffffff (纯白)
焦点行标记: #d2691e (橙棕色左侧竖线)
标题: #8b4513 (深棕色)
代码: #556b2f (深橄榄绿)
链接: #b8860b (深金色)
```

**特殊效果**:
- 焦点行上下渐变淡化 (opacity: 0.3 → 1.0 → 0.3)
- 光标闪烁效果增强
- 段落边界阴影效果
- 纸张边缘撕裂效果

### 2. 暗黑打字机主题 (Dark Typewriter)

**主题ID**: `typewriter-dark`
**分类**: `typewriter`
**标签**: `focus`, `dark`, `immersive`

**核心特点**:
- 深色背景减少眼睛疲劳
- 荧光绿/青柠色文字
- 焦点行微光效果
- CRT显示器扫描线纹理
- 复古终端风格

**配色方案**:
```
背景: #0a0a0a (深黑)
文字: #00ff41 (荧光绿)
焦点行背景: #1a1a1a (深灰)
焦点行发光: 0 0 10px #00ff41
标题: #00ffff (青色)
代码: #ffff00 (黄色)
链接: #ff6b6b (珊瑚红)
扫描线: rgba(0, 255, 65, 0.03)
```

**特殊效果**:
- CRT扫描线动画
- 文字发光效果
- 焦点行呼吸灯效果
- 终端光标样式
- 电子噪音纹理

### 3. 极简禅意模式主题 (Zen Mode)

**主题ID**: `typewriter-zen`
**分类**: `minimal`
**标签**: `focus`, `animation`, `immersive`

**核心特点**:
- 去除所有干扰元素
- 仅显示当前段落（其他半透明）
- 呼吸灯光标效果
- 纸张翻动动画
- 极简配色

**配色方案**:
```
背景: #fefefe (纯白)
文字: #333333 (深灰)
当前段落: opacity: 1.0
其他段落: opacity: 0.3
光标: #ff6b6b (呼吸灯效果)
选中文本: #e3f2fd (浅蓝)
```

**特殊效果**:
- 段落淡入淡出动画
- 光标呼吸灯效果 (1s周期)
- 换页纸张翻动动画
- 字数统计浮动显示
- 专注模式渐变遮罩

### 4. 代码友好主题 (Coder's Markdown)

**主题ID**: `typewriter-code`
**分类**: `code`
**标签**: `focus`, `dark`

**核心特点**:
- 强化代码块与表格可读性
- VS Code风格配色
- 行内代码即时预览
- 表格自动对齐辅助
- 语法高亮增强

**配色方案**:
```
背景: #1e1e1e (VS Code深色)
文字: #d4d4d4 (浅灰)
标题: #569cd6 (VS Code蓝)
代码块背景: #252526 (深灰)
代码文字: #ce9178 (橙色)
关键字: #c586c0 (紫色)
字符串: #ce9178 (橙色)
注释: #6a9955 (绿色)
链接: #4fc1ff (亮蓝)
```

**特殊效果**:
- 代码块语法高亮
- 行号显示
- 表格对齐辅助线
- 代码折叠功能
- 智能缩进指示

### 5. 复古报纸主题 (Vintage Press)

**主题ID**: `typewriter-vintage`
**分类**: `vintage`
**标签**: `retro`, `immersive`

**核心特点**:
- 泛黄报纸纹理背景
- 铅印字体效果
- 旧照片滤镜
- 波浪分割线
- 复古排版风格

**配色方案**:
```
背景: #f4f1e8 (泛黄纸张)
纹理: 报纸纹理背景图
文字: #2c1810 (深棕)
标题: #8b4513 (铅印棕)
引用: #654321 (深棕)
代码: #556b2f (橄榄绿)
链接: #b8860b (古金色)
分割线: 波浪线样式
```

**特殊效果**:
- 纸张老化纹理
- 铅印字体阴影
- 图片复古滤镜
- 波浪分割线动画
- 墨水渗透效果

### 6. 动态焦点模式主题 (Dynamic Focus)

**主题ID**: `typewriter-dynamic`
**分类**: `dynamic`
**标签**: `focus`, `animation`

**核心特点**:
- 根据时间自动切换色温
- 光标移动时段落展开/收缩
- 智能焦点跟踪
- 动态色彩调整
- 自适应亮度

**配色方案** (动态调整):
```
白天模式:
  背景: #ffffff → #f8f9fa
  文字: #2c3e50 → #34495e
  
夜间模式:
  背景: #1a1a1a → #2c3e50
  文字: #ecf0f1 → #bdc3c7
  
色温调整: 2700K-6500K
亮度调整: 0.8-1.0
```

**特殊效果**:
- 色温渐变动画 (30分钟周期)
- 段落智能展开/收缩
- 焦点区域动态调整
- 环境光感应 (模拟)
- 护眼模式自动切换

## 技术实现要点

### CSS变量扩展
每个主题需要扩展以下CSS变量:
- `--typewriter-focus-opacity`: 焦点行透明度
- `--typewriter-fade-distance`: 渐变淡化距离
- `--typewriter-cursor-style`: 光标样式
- `--typewriter-animation-duration`: 动画持续时间
- `--typewriter-texture-url`: 纹理背景图片
- `--typewriter-glow-color`: 发光颜色
- `--typewriter-scan-lines`: 扫描线效果

### 动画效果
- 焦点行渐变: `focus-gradient`
- 光标呼吸: `cursor-breathing`
- 扫描线: `scan-lines`
- 纸张翻动: `page-flip`
- 色温变化: `color-temperature`

### 交互增强
- 焦点行自动居中
- 段落智能展开
- 动态色彩调整
- 环境适应性
- 沉浸式体验

## 主题配置接口扩展

### TypewriterEffects 接口
```typescript
interface TypewriterEffects {
  // 焦点行效果
  focusLine: {
    enabled: boolean
    highlightColor: string
    fadeDistance: number
    centerOnFocus: boolean
    gradientIntensity: number
  }

  // 渐变淡化效果
  fadeEffect: {
    enabled: boolean
    fadeOpacity: number
    fadeDistance: string
    animationDuration: string
  }

  // 特殊视觉效果
  visualEffects: {
    scanLines: boolean
    paperTexture: string | null
    glowEffect: boolean
    breathingCursor: boolean
    pageFlipAnimation: boolean
  }

  // 动态效果
  dynamicEffects: {
    colorTemperature: boolean
    autoAdjustBrightness: boolean
    timeBasedTheme: boolean
    smartFocus: boolean
  }

  // 音效支持
  audioEffects: {
    enabled: boolean
    typingSound: string | null
    volume: number
  }
}
```

### 扩展的主题接口
```typescript
interface TypewriterTheme extends Theme {
  category: 'typewriter' | 'modern' | 'vintage' | 'minimal' | 'code' | 'dynamic'
  tags: string[]
  typewriterEffects: TypewriterEffects
  customCSS?: string
  requiredAssets?: string[]
}
```

## 实现优先级

### 第一阶段 (核心功能)
1. 经典打字机主题
2. 暗黑打字机主题
3. 基础焦点行效果
4. CSS变量系统扩展

### 第二阶段 (增强功能)
1. 极简禅意模式主题
2. 代码友好主题
3. 动画效果系统
4. 主题分类管理

### 第三阶段 (高级功能)
1. 复古报纸主题
2. 动态焦点模式主题
3. 音效系统集成
4. 性能优化

## 兼容性考虑

### Milkdown集成
- 保持三大法则不变
- 使用CSS变量覆盖默认样式
- 不修改核心编辑器配置
- 确保所见即所得功能正常

### 浏览器兼容性
- CSS变量支持 (IE11+)
- CSS Grid/Flexbox布局
- 动画效果降级处理
- 移动端适配

### 性能优化
- 懒加载主题资源
- CSS动画硬件加速
- 防抖动画触发
- 内存泄漏防护
