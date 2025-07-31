/**
 * 语言检测和管理工具
 */

export type SupportedLanguage = 'zh-CN' | 'en'

/**
 * 检测浏览器语言偏好
 * @returns 检测到的语言代码
 */
export function detectBrowserLanguage(): SupportedLanguage {
  // 获取浏览器语言设置
  const browserLanguages = navigator.languages || [navigator.language]
  
  // 检查是否包含中文
  for (const lang of browserLanguages) {
    if (lang.toLowerCase().includes('zh')) {
      return 'zh-CN'
    }
  }
  
  // 默认返回英语
  return 'en'
}

/**
 * 获取语言显示名称
 * @param language 语言代码
 * @returns 语言显示名称
 */
export function getLanguageDisplayName(language: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    'zh-CN': '简体中文',
    'en': 'English'
  }
  
  return names[language] || names['en']
}

/**
 * 验证语言代码是否支持
 * @param language 语言代码
 * @returns 是否支持
 */
export function isValidLanguage(language: string): language is SupportedLanguage {
  return ['zh-CN', 'en'].includes(language)
}

/**
 * 从本地存储获取用户语言设置
 * @returns 用户设置的语言或null
 */
export function getUserLanguageFromStorage(): SupportedLanguage | null {
  try {
    const stored = localStorage.getItem('user-language')
    if (stored && isValidLanguage(stored)) {
      return stored
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error)
  }
  
  return null
}

/**
 * 保存用户语言设置到本地存储
 * @param language 语言代码
 */
export function saveUserLanguageToStorage(language: SupportedLanguage): void {
  try {
    localStorage.setItem('user-language', language)
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error)
  }
}

/**
 * 获取用户首选语言
 * 优先级：本地存储 > 浏览器检测 > 默认英语
 * @returns 用户首选语言
 */
export function getPreferredLanguage(): SupportedLanguage {
  // 1. 尝试从本地存储获取
  const storedLanguage = getUserLanguageFromStorage()
  if (storedLanguage) {
    return storedLanguage
  }
  
  // 2. 检测浏览器语言
  return detectBrowserLanguage()
}
