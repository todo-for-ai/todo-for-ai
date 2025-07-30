import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  Theme,
  ThemeOptions,
  ThemeCategory,
  ThemeTag,
  TypewriterTheme
} from '../types/theme'
import { themes, getThemeById, getDefaultTheme } from '../themes/presets'
import { themeManager } from '../themes/ThemeManager'
import { cssVariableManager } from '../themes/CSSVariableManager'

// 默认配置
const DEFAULT_OPTIONS: Required<ThemeOptions> = {
  enablePersistence: true,
  defaultThemeId: 'default',
  followSystemDarkMode: true,
  storageKey: 'milkdown-editor-theme'
}

// 主题管理Hook (增强版)
export const useTheme = (options: ThemeOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // 先设置默认主题，避免初始化时的问题
  const [currentTheme, setCurrentTheme] = useState<Theme>(getDefaultTheme)

  // 检测系统深色模式
  const [systemDarkMode, setSystemDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // 获取初始主题 (使用主题管理器)
  const getInitialTheme = useCallback((): Theme => {
    if (typeof window === 'undefined') {
      return getDefaultTheme()
    }

    console.log('🔍 正在恢复主题设置...')

    // 尝试从主题管理器恢复
    const restoredThemeId = themeManager.restoreThemeFromStorage()
    console.log('📦 从存储中恢复的主题ID:', restoredThemeId)

    if (restoredThemeId) {
      const theme = themeManager.getAllThemes().find(t => t.id === restoredThemeId)
      if (theme) {
        console.log('✅ 成功恢复主题:', theme.name)
        return theme
      }
    }

    // 如果启用了跟随系统深色模式
    if (config.followSystemDarkMode) {
      if (systemDarkMode) {
        const darkTheme = themeManager.getAllThemes().find(t => t.id === 'dark')
        if (darkTheme) return darkTheme
      }
    }

    // 返回默认主题
    const defaultTheme = themeManager.getAllThemes().find(t => t.id === config.defaultThemeId)
    const finalTheme = defaultTheme || getDefaultTheme()
    console.log('🎨 使用默认主题:', finalTheme.name)
    return finalTheme
  }, [config, systemDarkMode])

  // 初始化主题管理器和恢复主题
  useEffect(() => {
    console.log('🚀 初始化主题管理器...')

    // 注册预设主题到主题管理器
    themes.forEach(theme => {
      themeManager.registerTheme({ theme })
    })

    // 恢复保存的主题
    const initialTheme = getInitialTheme()
    setCurrentTheme(initialTheme)

    // 应用主题到主题管理器
    themeManager.setTheme(initialTheme.id, 'auto')

    console.log('✅ 主题管理器初始化完成')
  }, [])
  
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
  
  // 保存主题到本地存储 (暂时未使用)
  /*
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
  */
  
  // 切换主题 (使用主题管理器)
  const setTheme = useCallback(async (themeId: string) => {
    console.log('🎨 切换主题到:', themeId)

    const success = await themeManager.setTheme(themeId, 'user')
    if (success) {
      const newTheme = themeManager.getCurrentTheme()
      if (newTheme) {
        console.log('✅ 主题切换成功:', newTheme.name)
        setCurrentTheme(newTheme)
        // 应用CSS变量
        cssVariableManager.applyThemeVariables(newTheme)
      }
    } else {
      console.error('❌ 主题切换失败:', themeId)
    }
  }, [])

  // 应用当前主题的CSS变量
  useEffect(() => {
    if (currentTheme) {
      cssVariableManager.applyThemeVariables(currentTheme)
    }
  }, [currentTheme])
  
  // 切换深色模式
  const toggleDarkMode = useCallback(() => {
    const targetThemeId = currentTheme.isDark ? 'default' : 'dark'
    setTheme(targetThemeId)
  }, [currentTheme.isDark, setTheme])
  
  // 获取下一个主题 (使用主题管理器)
  const getNextTheme = useCallback((): Theme => {
    const allThemes = themeManager.getAllThemes()
    const currentIndex = allThemes.findIndex(theme => theme.id === currentTheme.id)
    const nextIndex = (currentIndex + 1) % allThemes.length
    return allThemes[nextIndex]
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

  // 新增：根据分类获取主题
  const getThemesByCategory = useCallback((category: ThemeCategory): Theme[] => {
    return themeManager.getThemesByCategory(category)
  }, [])

  // 新增：根据标签获取主题
  const getThemesByTag = useCallback((tag: ThemeTag): Theme[] => {
    return themeManager.getThemesByTag(tag)
  }, [])

  // 新增：注册主题
  const registerTheme = useCallback((theme: Theme): void => {
    themeManager.registerTheme({ theme })
  }, [])

  // 新增：注销主题
  const unregisterTheme = useCallback((themeId: string): boolean => {
    return themeManager.unregisterTheme(themeId)
  }, [])

  // 新增：判断是否为打字机主题
  const isTypewriterTheme = useCallback((theme: Theme): theme is TypewriterTheme => {
    return themeManager.isTypewriterTheme(theme)
  }, [])
  
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

    // 不再将主题类名应用到document.documentElement
    // 主题类名将通过ThemeManager应用到特定容器

    // 设置深色模式类名（保留在根元素，因为这是全局状态）
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
  
  // 可用主题列表 (使用主题管理器)
  // 使用状态来跟踪主题列表的变化
  const [availableThemes, setAvailableThemes] = useState<Theme[]>(() => themeManager.getAllThemes())

  // 监听主题注册变化
  useEffect(() => {
    const updateAvailableThemes = () => {
      const themes = themeManager.getAllThemes()
      setAvailableThemes(prevThemes => {
        // 只有当主题列表真正发生变化时才更新状态
        if (prevThemes.length !== themes.length ||
            prevThemes.some((theme, index) => theme.id !== themes[index]?.id)) {
          return themes
        }
        return prevThemes
      })
    }

    // 初始更新
    updateAvailableThemes()

    // 设置一个较长间隔的定时器来检查主题列表变化
    // 这是一个临时解决方案，更好的方法是让ThemeManager支持事件监听
    const interval = setInterval(updateAvailableThemes, 1000)

    // 清理定时器
    return () => clearInterval(interval)
  }, [])

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

    // 主题查找和管理 (新增)
    getThemeById: (id: string) => themeManager.getAllThemes().find(t => t.id === id),
    getThemesByCategory,
    getThemesByTag,
    registerTheme,
    unregisterTheme,
    isTypewriterTheme,

    // 配置
    config
  }
}
