/**
 * 日期工具函数
 */

/**
 * 将日期转换为相对时间格式（如：1分钟前、2小时前等）
 * @param date 日期字符串或Date对象
 * @returns 相对时间字符串
 * @deprecated 请使用 formatRelativeTimeI18n 替代，支持国际化
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return '无活动'

  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date

  // 计算时间差（毫秒）
  const diffMs = now.getTime() - targetDate.getTime()

  // 如果是未来时间，返回具体日期
  if (diffMs < 0) {
    return formatFullDateTime(targetDate)
  }

  // 转换为秒
  const diffSeconds = Math.floor(diffMs / 1000)

  // 小于1分钟
  if (diffSeconds < 60) {
    return diffSeconds <= 0 ? '刚刚' : `${diffSeconds}秒前`
  }

  // 转换为分钟
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  }

  // 转换为小时
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}小时前`
  }

  // 转换为天
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays}天前`
  }

  // 转换为周
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) {
    return `${diffWeeks}周前`
  }

  // 转换为月
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return `${diffMonths}个月前`
  }

  // 转换为年
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}年前`
}

/**
 * 将日期转换为相对时间格式（支持国际化）
 * @param date 日期字符串或Date对象
 * @param t 翻译函数
 * @returns 相对时间字符串
 */
export function formatRelativeTimeI18n(
  date: string | Date,
  t: (key: string, options?: any) => string
): string {
  if (!date) return t('common:time.relative.noActivity')

  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date

  // 计算时间差（毫秒）
  const diffMs = now.getTime() - targetDate.getTime()

  // 如果是未来时间，返回具体日期
  if (diffMs < 0) {
    return formatFullDateTime(targetDate)
  }

  // 转换为秒
  const diffSeconds = Math.floor(diffMs / 1000)

  // 小于1分钟
  if (diffSeconds < 60) {
    return diffSeconds <= 0 ? t('common:time.relative.justNow') : t('common:time.relative.secondsAgo', { count: diffSeconds })
  }

  // 转换为分钟
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return t('common:time.relative.minutesAgo', { count: diffMinutes })
  }

  // 转换为小时
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return t('common:time.relative.hoursAgo', { count: diffHours })
  }

  // 转换为天
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return t('common:time.relative.daysAgo', { count: diffDays })
  }

  // 转换为周
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) {
    return t('common:time.relative.weeksAgo', { count: diffWeeks })
  }

  // 转换为月
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return t('common:time.relative.monthsAgo', { count: diffMonths })
  }

  // 转换为年
  const diffYears = Math.floor(diffDays / 365)
  return t('common:time.relative.yearsAgo', { count: diffYears })
}

/**
 * 格式化完整的日期时间字符串
 * @param date 日期字符串或Date对象
 * @returns 格式化的日期时间字符串（如：2025-07-31 04:05:27）
 */
export function formatFullDateTime(date: string | Date): string {
  if (!date) return ''
  
  const targetDate = typeof date === 'string' ? new Date(date) : date
  
  const year = targetDate.getFullYear()
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getDate()).padStart(2, '0')
  const hours = String(targetDate.getHours()).padStart(2, '0')
  const minutes = String(targetDate.getMinutes()).padStart(2, '0')
  const seconds = String(targetDate.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期为本地化字符串
 * @param date 日期字符串或Date对象
 * @returns 本地化的日期字符串
 */
export function formatLocalDate(date: string | Date): string {
  if (!date) return ''
  
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate.toLocaleDateString('zh-CN')
}

/**
 * 格式化日期时间为本地化字符串
 * @param date 日期字符串或Date对象
 * @returns 本地化的日期时间字符串
 */
export function formatLocalDateTime(date: string | Date): string {
  if (!date) return ''
  
  const targetDate = typeof date === 'string' ? new Date(date) : date
  return targetDate.toLocaleString('zh-CN')
}
