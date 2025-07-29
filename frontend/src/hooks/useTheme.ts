import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Theme, ThemeOptions, ThemeChangeEvent } from '../types/theme'
import { themes, getThemeById, getDefaultTheme } from '../themes/presets'

// 默认配置
const DEFAULT_OPTIONS: Required<ThemeOptions> = {
  enablePersistence: true,
  defaultThemeId: 'default',
  followSystemDarkMode: true,
  storageKey: 'milkdown-editor-theme'
}

// 主题管理Hook
export const useTheme = (options: ThemeOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // 检测系统深色模式
  const [systemDarkMode, setSystemDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  
  // 获取初始主题
  const getInitialTheme = useCallback((): Theme => {
    if (typeof window === 'undefined') {
      return getDefaultTheme()
    }
    
    // 尝试从本地存储获取
    if (config.enablePersistence) {
      try {
        const stored = localStorage.getItem(config.storageKey)
        if (stored) {
          const { themeId, timestamp } = JSON.parse(stored)
          // 检查存储的主题是否仍然有效（7天内）
          if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
            const theme = getThemeById(themeId)
            if (theme) return theme
          }
        }
      } catch (error) {
        console.warn('Failed to load theme from storage:', error)
      }
    }
    
    // 如果启用了跟随系统深色模式
    if (config.followSystemDarkMode) {
      if (systemDarkMode) {
        const darkTheme = getThemeById('dark')
        if (darkTheme) return darkTheme
      }
    }
    
    // 返回默认主题
    return getThemeById(config.defaultThemeId) || getDefaultTheme()
  }, [config, systemDarkMode])
  
  const [currentTheme, setCurrentTheme] = useState<Theme>(getInitialTheme)
  
  // 监听系统深色模式变化
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDarkMode(e.matches)
      
      // 如果启用了跟随系统深色模式，自动切换主题
      if (config.followSystemDarkMode) {
        const targetTheme = e.matches 
          ? getThemeById('dark') || getDefaultTheme()
          : getThemeById('default') || getDefaultTheme()
        setCurrentTheme(targetTheme)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [config.followSystemDarkMode])
  
  // 保存主题到本地存储
  const saveThemeToStorage = useCallback((theme: Theme) => {
    if (!config.enablePersistence || typeof window === 'undefined') return
    
    try {
      const data = {
        themeId: theme.id,
        timestamp: Date.now()
      }
      localStorage.setItem(config.storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save theme to storage:', error)
    }
  }, [config])
  
  // 切换主题
  const setTheme = useCallback((themeId: string) => {
    const newTheme = getThemeById(themeId)
    if (!newTheme) {
      console.warn(`Theme with id "${themeId}" not found`)
      return
    }
    
    const previousTheme = currentTheme
    setCurrentTheme(newTheme)
    saveThemeToStorage(newTheme)
    
    // 触发主题变更事件
    const event: ThemeChangeEvent = {
      previousTheme,
      currentTheme: newTheme,
      timestamp: Date.now()
    }
    
    // 可以在这里添加全局事件分发
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChange', { detail: event }))
    }
  }, [currentTheme, saveThemeToStorage])
  
  // 切换深色模式
  const toggleDarkMode = useCallback(() => {
    const targetThemeId = currentTheme.isDark ? 'default' : 'dark'
    setTheme(targetThemeId)
  }, [currentTheme.isDark, setTheme])
  
  // 获取下一个主题
  const getNextTheme = useCallback((): Theme => {
    const currentIndex = themes.findIndex(theme => theme.id === currentTheme.id)
    const nextIndex = (currentIndex + 1) % themes.length
    return themes[nextIndex]
  }, [currentTheme.id])
  
  // 循环切换主题
  const cycleTheme = useCallback(() => {
    const nextTheme = getNextTheme()
    setTheme(nextTheme.id)
  }, [getNextTheme, setTheme])
  
  // 重置为默认主题
  const resetTheme = useCallback(() => {
    setTheme(config.defaultThemeId)
  }, [config.defaultThemeId, setTheme])
  
  // 获取主题CSS变量
  const getCSSVariables = useCallback((theme: Theme = currentTheme) => {
    const variables: Record<string, string> = {}
    
    // 颜色变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables[`--theme-color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
    })
    
    // 字体变量
    Object.entries(theme.fonts).forEach(([key, value]) => {
      variables[`--theme-font-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
    })
    
    // 间距变量
    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables[`--theme-spacing-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
    })
    
    // 边框变量
    Object.entries(theme.borders).forEach(([key, value]) => {
      variables[`--theme-border-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
    })
    
    // 阴影变量
    Object.entries(theme.shadows).forEach(([key, value]) => {
      variables[`--theme-shadow-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
    })
    
    // 动画变量
    Object.entries(theme.animations).forEach(([key, value]) => {
      variables[`--theme-animation-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
    })
    
    return variables
  }, [currentTheme])
  
  // 应用CSS变量到文档
  const applyCSSVariables = useCallback((theme: Theme = currentTheme) => {
    if (typeof document === 'undefined') return
    
    const variables = getCSSVariables(theme)
    const root = document.documentElement
    
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    
    // 添加主题类名
    root.className = root.className.replace(/theme-\w+/g, '')
    root.classList.add(`theme-${theme.id}`)
    
    // 设置深色模式类名
    if (theme.isDark) {
      root.classList.add('dark-theme')
    } else {
      root.classList.remove('dark-theme')
    }
  }, [currentTheme, getCSSVariables])
  
  // 应用当前主题的CSS变量
  useEffect(() => {
    applyCSSVariables(currentTheme)
  }, [currentTheme, applyCSSVariables])
  
  // 可用主题列表
  const availableThemes = useMemo(() => themes, [])
  
  // 当前是否为深色模式
  const isDarkMode = useMemo(() => currentTheme.isDark, [currentTheme.isDark])
  
  return {
    // 当前主题
    currentTheme,
    
    // 可用主题列表
    availableThemes,
    
    // 主题切换方法
    setTheme,
    toggleDarkMode,
    cycleTheme,
    resetTheme,
    
    // 状态
    isDarkMode,
    systemDarkMode,
    
    // 工具方法
    getCSSVariables,
    applyCSSVariables,
    getNextTheme,
    
    // 主题查找
    getThemeById: (id: string) => getThemeById(id),
    
    // 配置
    config
  }
}
