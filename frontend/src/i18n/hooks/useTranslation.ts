import { useTranslation as useI18nTranslation } from 'react-i18next'
import type { SupportedLanguage } from '../index'

// 扩展的翻译hook，提供更好的类型支持和便利方法
export const useTranslation = (namespace?: string) => {
  const { t, i18n, ready } = useI18nTranslation(namespace)

  return {
    // 基础翻译函数
    t,

    // i18n实例
    i18n,

    // 是否准备就绪
    ready,

    // 当前语言
    language: i18n.language as SupportedLanguage,

    // 切换语言
    changeLanguage: (language: SupportedLanguage) => i18n.changeLanguage(language),

    // 便利的翻译函数
    tc: (key: string, options?: any) => t(`common:${key}`, options) as string,
    tn: (key: string, options?: any) => t(`navigation:${key}`, options) as string,
    
    // 格式化时间相关的翻译
    formatTime: (value: number, unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year') => {
      const key = value === 1 ? unit : `${unit}s`
      return `${value} ${t(`common:time.${key}`)}`
    },

    // 格式化状态翻译
    formatStatus: (status: string) => t(`common:status.${status}`) as string,

    // 格式化操作翻译
    formatAction: (action: string) => t(`common:actions.${action}`) as string,

    // 格式化验证消息
    formatValidation: (rule: string, options?: any) => t(`common:validation.${rule}`, options) as string,

    // 格式化成功消息
    formatSuccess: (action: string) => t(`common:messages.success.${action}`) as string,

    // 格式化错误消息
    formatError: (error: string) => t(`common:messages.error.${error}`) as string,

    // 格式化确认消息
    formatConfirm: (action: string) => t(`common:messages.confirm.${action}`) as string,
  }
}

// 页面级别的翻译hook
export const usePageTranslation = (page: string) => {
  const translation = useTranslation(page)

  return {
    ...translation,

    // 页面特定的翻译函数
    tp: (key: string, options?: any) => translation.t(key, options) as string,

    // 页面标题
    pageTitle: translation.t('title') as string,

    // 页面副标题
    pageSubtitle: translation.t('subtitle') as string,
  }
}

// 表单翻译hook
export const useFormTranslation = () => {
  const { t, tc } = useTranslation()
  
  return {
    t,
    tc,
    
    // 表单标签
    label: (field: string) => t(`forms:labels.${field}`) as string,

    // 表单占位符
    placeholder: (field: string) => t(`forms:placeholders.${field}`) as string,

    // 表单帮助文本
    help: (field: string) => t(`forms:help.${field}`) as string,

    // 表单验证消息
    validation: (rule: string, options?: any) => tc(`validation.${rule}`, options),

    // 表单按钮
    submitButton: tc('actions.submit'),
    cancelButton: tc('actions.cancel'),
    saveButton: tc('actions.save'),
    resetButton: tc('actions.reset'),
  }
}

export default useTranslation
