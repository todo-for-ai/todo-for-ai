import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 导入语言资源
import zhCNCommon from './resources/zh-CN/common.json'
import zhCNNavigation from './resources/zh-CN/navigation.json'
import zhCNDashboard from './resources/zh-CN/pages/dashboard.json'
import zhCNSettings from './resources/zh-CN/pages/settings.json'
import zhCNProjects from './resources/zh-CN/pages/projects.json'
import zhCNCreateProject from './resources/zh-CN/pages/createProject.json'
import zhCNProfile from './resources/zh-CN/pages/profile.json'
import zhCNContextRules from './resources/zh-CN/pages/contextRules.json'
import zhCNCreateContextRule from './resources/zh-CN/pages/createContextRule.json'
import zhCNLogin from './resources/zh-CN/pages/login.json'
import zhCNTerms from './resources/zh-CN/pages/terms.json'
import zhCNPrivacy from './resources/zh-CN/pages/privacy.json'
import zhCNRuleMarketplace from './resources/zh-CN/pages/ruleMarketplace.json'
import zhCNProjectDetail from './resources/zh-CN/pages/projectDetail.json'
import zhCNTaskDetail from './resources/zh-CN/pages/taskDetail.json'
import zhCNCreateTask from './resources/zh-CN/pages/createTask.json'
import zhCNPinManager from './resources/zh-CN/components/pinManager.json'

import enCommon from './resources/en/common.json'
import enNavigation from './resources/en/navigation.json'
import enDashboard from './resources/en/pages/dashboard.json'
import enSettings from './resources/en/pages/settings.json'
import enProjects from './resources/en/pages/projects.json'
import enCreateProject from './resources/en/pages/createProject.json'
import enProfile from './resources/en/pages/profile.json'
import enContextRules from './resources/en/pages/contextRules.json'
import enCreateContextRule from './resources/en/pages/createContextRule.json'
import enLogin from './resources/en/pages/login.json'
import enTerms from './resources/en/pages/terms.json'
import enPrivacy from './resources/en/pages/privacy.json'
import enRuleMarketplace from './resources/en/pages/ruleMarketplace.json'
import enProjectDetail from './resources/en/pages/projectDetail.json'
import enTaskDetail from './resources/en/pages/taskDetail.json'
import enCreateTask from './resources/en/pages/createTask.json'
import enPinManager from './resources/en/components/pinManager.json'

// 支持的语言
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

// 语言资源配置
const resources = {
  'zh-CN': {
    common: zhCNCommon,
    navigation: zhCNNavigation,
    dashboard: zhCNDashboard,
    settings: zhCNSettings,
    projects: zhCNProjects,
    createProject: zhCNCreateProject,
    profile: zhCNProfile,
    contextRules: zhCNContextRules,
    createContextRule: zhCNCreateContextRule,
    login: zhCNLogin,
    terms: zhCNTerms,
    privacy: zhCNPrivacy,
    ruleMarketplace: zhCNRuleMarketplace,
    projectDetail: zhCNProjectDetail,
    taskDetail: zhCNTaskDetail,
    createTask: zhCNCreateTask,
    pinManager: zhCNPinManager,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    dashboard: enDashboard,
    settings: enSettings,
    projects: enProjects,
    createProject: enCreateProject,
    profile: enProfile,
    contextRules: enContextRules,
    createContextRule: enCreateContextRule,
    login: enLogin,
    terms: enTerms,
    privacy: enPrivacy,
    ruleMarketplace: enRuleMarketplace,
    projectDetail: enProjectDetail,
    taskDetail: enTaskDetail,
    createTask: enCreateTask,
    pinManager: enPinManager,
  },
}

// 语言检测配置
const languageDetectorOptions = {
  // 检测顺序：localStorage > 用户设置 > 浏览器语言 > 默认语言
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // 缓存用户语言选择
  caches: ['localStorage'],
  
  // localStorage的key
  lookupLocalStorage: 'i18nextLng',
  
  // 检查所有可用的语言
  checkWhitelist: true,
}

// 初始化i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // 默认语言
    fallbackLng: 'en',
    
    // 支持的语言白名单
    supportedLngs: SUPPORTED_LANGUAGES,
    
    // 语言检测配置
    detection: languageDetectorOptions,
    
    // 调试模式（生产环境应设为false）
    debug: import.meta.env.DEV,
    
    // 插值配置
    interpolation: {
      escapeValue: false, // React已经处理了XSS
    },
    
    // 默认命名空间
    defaultNS: 'common',
    
    // 命名空间分隔符
    nsSeparator: ':',
    
    // 键分隔符
    keySeparator: '.',
    
    // 返回对象而不是字符串
    returnObjects: false,
    
    // 返回空字符串而不是key
    returnEmptyString: false,
    
    // 后备到key
    returnNull: false,
    
    // 加载失败时的回调
    missingKeyHandler: (lng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`Missing translation key: ${lng}:${ns}:${key}`)
      }
    },
  })

export default i18n

// 工具函数
export const getCurrentLanguage = (): SupportedLanguage => {
  const current = i18n.language
  return SUPPORTED_LANGUAGES.includes(current as SupportedLanguage) 
    ? (current as SupportedLanguage) 
    : 'en'
}

export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language)
}

export const isValidLanguage = (language: string): language is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
}

export const getLanguageDisplayName = (language: SupportedLanguage): string => {
  const names: Record<SupportedLanguage, string> = {
    'zh-CN': '简体中文',
    'en': 'English'
  }
  return names[language]
}
