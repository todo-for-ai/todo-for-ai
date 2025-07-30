/**
 * 主题演示组件 - 用于测试和展示主题系统
 */

import React from 'react'
import { Card, Select, Space, Typography, Divider } from 'antd'
import { useThemeContext } from '../../contexts/ThemeContext'
import MilkdownEditor from '../MilkdownEditor'


const { Title, Text } = Typography
const { Option } = Select

const ThemeDemoContent: React.FC = () => {
  const { 
    currentTheme, 
    availableThemes, 
    setTheme, 
    getThemesByCategory,
    isTypewriterTheme 
  } = useThemeContext()

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId)
  }

  const typewriterThemes = getThemesByCategory('typewriter')
  const modernThemes = availableThemes.filter(t => t.category !== 'typewriter')

  const demoContent = `# 主题演示文档

欢迎使用 Milkdown 编辑器主题系统！

## 打字机主题特色

### 经典打字机主题
- 焦点行高亮效果
- 仿纸质背景纹理
- 等宽字体设计
- 段落边界模拟

### 暗黑打字机主题
- 荧光绿文字发光
- CRT扫描线效果
- 深色护眼背景
- 复古终端风格

## 代码示例

\`\`\`javascript
// 主题切换示例
const themeManager = new ThemeManager()
themeManager.setTheme('typewriter-classic')
\`\`\`

## 引用效果

> 这是一个引用块的示例，展示不同主题下的引用样式效果。

## 列表展示

1. 第一项内容
2. 第二项内容
   - 子项目 A
   - 子项目 B
3. 第三项内容

## 表格示例

| 主题名称 | 类型 | 特色 |
|---------|------|------|
| 经典打字机 | 打字机 | 焦点行高亮 |
| 暗黑打字机 | 打字机 | 荧光绿发光 |
| 默认主题 | 现代 | 简洁明快 |

---

**链接测试**: [Milkdown 官网](https://milkdown.dev)

*斜体文字* 和 **粗体文字** 的展示效果。

试试在不同主题间切换，体验各种视觉效果！`

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>Milkdown 主题系统演示</Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>当前主题: </Text>
            <Text code>{currentTheme.name}</Text>
            {isTypewriterTheme(currentTheme) && (
              <Text type="secondary"> (打字机主题)</Text>
            )}
          </div>

          <div>
            <Text strong>选择主题: </Text>
            <Select
              value={currentTheme.id}
              onChange={handleThemeChange}
              style={{ width: 200, marginLeft: 8 }}
            >
              {modernThemes.length > 0 && (
                <Select.OptGroup label="现代主题">
                  {modernThemes.map(theme => (
                    <Option key={theme.id} value={theme.id}>
                      {theme.name}
                    </Option>
                  ))}
                </Select.OptGroup>
              )}
              
              {typewriterThemes.length > 0 && (
                <Select.OptGroup label="打字机主题">
                  {typewriterThemes.map(theme => (
                    <Option key={theme.id} value={theme.id}>
                      {theme.name}
                    </Option>
                  ))}
                </Select.OptGroup>
              )}
            </Select>
          </div>

          <Divider />

          <div>
            <Title level={3}>编辑器演示</Title>
            <Text type="secondary">
              在下方编辑器中体验不同主题的效果，支持实时切换主题。
            </Text>
          </div>

          <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden' }}>
            <MilkdownEditor
              value={demoContent}
              onChange={(value) => console.log('Content changed:', value)}
              placeholder="开始输入内容..."
              autoHeight={true}
            />
          </div>

          <div>
            <Title level={4}>主题信息</Title>
            <Space direction="vertical">
              <Text><strong>ID:</strong> {currentTheme.id}</Text>
              <Text><strong>描述:</strong> {currentTheme.description}</Text>
              <Text><strong>类型:</strong> {currentTheme.isDark ? '深色' : '浅色'}</Text>
              {currentTheme.category && (
                <Text><strong>分类:</strong> {currentTheme.category}</Text>
              )}
              {currentTheme.tags && currentTheme.tags.length > 0 && (
                <Text><strong>标签:</strong> {currentTheme.tags.join(', ')}</Text>
              )}
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  )
}

const ThemeDemo: React.FC = () => {
  return <ThemeDemoContent />
}

export default ThemeDemo
