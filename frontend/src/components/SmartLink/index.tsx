import React from 'react'
import { useNavigate } from 'react-router-dom'

export interface SmartLinkProps {
  /** 目标路径 */
  to: string
  /** 链接内容 */
  children: React.ReactNode
  /** CSS类名 */
  className?: string
  /** 内联样式 */
  style?: React.CSSProperties
  /** 提示文本 */
  title?: string
  /** 是否替换历史记录 */
  replace?: boolean
  /** 点击事件处理器 */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
  /** 是否禁用链接 */
  disabled?: boolean
  /** 目标窗口 */
  target?: string
  /** rel属性 */
  rel?: string
}

/**
 * 智能链接组件
 * 
 * 特性：
 * - 普通点击：单页应用内部导航
 * - Ctrl+点击：新窗口打开
 * - Cmd+点击（Mac）：新窗口打开
 * - 中键点击：新标签页打开
 * - 右键点击：显示上下文菜单
 * 
 * 符合Web标准，使用真正的<a>标签，支持所有浏览器原生行为
 */
export const SmartLink: React.FC<SmartLinkProps> = ({
  to,
  children,
  className,
  style,
  title,
  replace = false,
  onClick,
  disabled = false,
  target,
  rel,
  ...rest
}) => {
  const navigate = useNavigate()

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // 如果链接被禁用，阻止所有行为
    if (disabled) {
      event.preventDefault()
      return
    }

    // 调用自定义点击处理器
    if (onClick) {
      onClick(event)
      // 如果自定义处理器阻止了默认行为，则不继续处理
      if (event.defaultPrevented) {
        return
      }
    }

    // 检测修饰键和鼠标按键
    const isModifiedClick = event.ctrlKey || event.metaKey || event.shiftKey
    const isMiddleClick = event.button === 1
    const isRightClick = event.button === 2

    // 如果是修饰键点击、中键点击或右键点击，允许浏览器默认行为
    if (isModifiedClick || isMiddleClick || isRightClick) {
      return
    }

    // 如果指定了target属性，允许浏览器默认行为
    if (target && target !== '_self') {
      return
    }

    // 普通左键点击，阻止默认行为并使用React Router导航
    event.preventDefault()
    
    try {
      if (replace) {
        navigate(to, { replace: true })
      } else {
        navigate(to)
      }
    } catch (error) {
      console.error('Navigation failed:', error)
      // 如果导航失败，回退到浏览器默认行为
      window.location.href = to
    }
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // 处理中键点击（mousedown事件中button值更可靠）
    if (event.button === 1) {
      // 中键点击，允许默认行为（新标签页打开）
      return
    }
  }

  // 构建完整的URL（确保href属性正确）
  const href = to.startsWith('http') ? to : to

  return (
    <a
      href={href}
      className={className}
      style={disabled ? { ...style, pointerEvents: 'none', opacity: 0.5 } : style}
      title={title}
      target={target}
      rel={rel}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      {...rest}
    >
      {children}
    </a>
  )
}

// 导出所有组件
export { LinkButton } from './LinkButton'
export { BreadcrumbLink } from './BreadcrumbLink'

export default SmartLink
