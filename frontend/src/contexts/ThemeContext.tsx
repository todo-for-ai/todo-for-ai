import React, { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ThemeContextType, ThemeOptions } from '../types/theme'
import { useTheme } from '../hooks/useTheme'

// 创建主题上下文
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// 主题Provider组件的Props
interface ThemeProviderProps {
  children: ReactNode
  options?: ThemeOptions
}

// 主题Provider组件
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  options = {} 
}) => {
  const themeHook = useTheme(options)
  
  const contextValue: ThemeContextType = {
    currentTheme: themeHook.currentTheme,
    availableThemes: themeHook.availableThemes,
    setTheme: themeHook.setTheme,
    isDarkMode: themeHook.isDarkMode,
    toggleDarkMode: themeHook.toggleDarkMode,
    getThemesByCategory: themeHook.getThemesByCategory,
    getThemesByTag: themeHook.getThemesByTag,
    registerTheme: themeHook.registerTheme,
    unregisterTheme: themeHook.unregisterTheme,
    isTypewriterTheme: themeHook.isTypewriterTheme
  }
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// 使用主题上下文的Hook
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  
  return context
}

// 高阶组件：为组件提供主题支持
export const withTheme = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WithThemeComponent = (props: P) => {
    const theme = useThemeContext()
    return <Component {...props} theme={theme} />
  }
  
  WithThemeComponent.displayName = `withTheme(${Component.displayName || Component.name})`
  
  return WithThemeComponent
}

// 主题样式Hook - 用于在组件中获取主题相关的样式
export const useThemeStyles = () => {
  const { currentTheme } = useThemeContext()
  
  // 生成常用的样式对象
  const styles = {
    // 编辑器容器样式
    editorContainer: {
      backgroundColor: currentTheme.colors.editorBackground,
      border: `${currentTheme.borders.borderWidth} solid ${currentTheme.colors.editorBorder}`,
      borderRadius: currentTheme.borders.borderRadius,
      boxShadow: currentTheme.shadows.editorShadow,
      fontFamily: currentTheme.fonts.fontFamily,
      fontSize: currentTheme.fonts.fontSize,
      lineHeight: currentTheme.fonts.lineHeight,
      color: currentTheme.colors.textPrimary,
      transition: `all ${currentTheme.animations.transitionDuration} ${currentTheme.animations.easing}`
    },
    
    // 编辑器聚焦样式
    editorFocused: {
      backgroundColor: currentTheme.colors.editorFocusBackground,
      borderColor: currentTheme.colors.editorFocusBorder,
      boxShadow: currentTheme.shadows.editorFocusShadow
    },
    
    // 代码块样式
    codeBlock: {
      background: currentTheme.colors.codeBlockBackground,
      border: `${currentTheme.borders.borderWidth} solid ${currentTheme.colors.codeBlockBorder}`,
      borderRadius: currentTheme.borders.codeBlockRadius,
      boxShadow: currentTheme.shadows.codeBlockShadow,
      fontFamily: currentTheme.fonts.codeFontFamily,
      fontSize: currentTheme.fonts.codeSize,
      padding: currentTheme.spacing.codeBlockPadding,
      margin: currentTheme.spacing.codeBlockMargin
    },
    
    // 引用块样式
    blockquote: {
      background: currentTheme.colors.blockquoteBackground,
      borderLeft: `5px solid ${currentTheme.colors.blockquoteBorder}`,
      borderRadius: currentTheme.borders.blockquoteRadius,
      color: currentTheme.colors.blockquoteText,
      padding: currentTheme.spacing.blockquotePadding,
      margin: currentTheme.spacing.blockquoteMargin
    },
    
    // 链接样式
    link: {
      color: currentTheme.colors.linkColor,
      textDecoration: 'none',
      transition: `color ${currentTheme.animations.transitionDuration} ${currentTheme.animations.easing}`
    },
    
    // 链接悬停样式
    linkHover: {
      color: currentTheme.colors.linkHoverColor
    }
  }
  
  return { styles, theme: currentTheme }
}

// 主题CSS类名生成器
export const useThemeClasses = () => {
  const { currentTheme } = useThemeContext()
  
  const getThemeClass = (baseClass: string = '') => {
    const classes = [baseClass, `theme-${currentTheme.id}`]
    
    if (currentTheme.isDark) {
      classes.push('dark-theme')
    }
    
    return classes.filter(Boolean).join(' ')
  }
  
  return { getThemeClass, themeId: currentTheme.id, isDark: currentTheme.isDark }
}

// 导出主题上下文
export { ThemeContext }
export default ThemeProvider
