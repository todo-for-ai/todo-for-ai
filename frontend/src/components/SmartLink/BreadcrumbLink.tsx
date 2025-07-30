import React from 'react'
import { SmartLink, type SmartLinkProps } from './index'

export interface BreadcrumbLinkProps extends SmartLinkProps {
  /** 是否显示为当前页面（不可点击） */
  current?: boolean
}

/**
 * 面包屑链接组件
 * 
 * 专门用于面包屑导航的链接，保持原有的样式和行为
 * 支持Ctrl+点击新窗口打开
 */
export const BreadcrumbLink: React.FC<BreadcrumbLinkProps> = ({
  to,
  children,
  current = false,
  className,
  style,
  ...rest
}) => {
  // 如果是当前页面，渲染为普通span
  if (current) {
    return (
      <span 
        className={className}
        style={style}
      >
        {children}
      </span>
    )
  }

  // 否则渲染为智能链接
  return (
    <SmartLink
      to={to}
      className={className}
      style={{
        cursor: 'pointer',
        color: 'inherit',
        textDecoration: 'none',
        ...style
      }}
      {...rest}
    >
      {children}
    </SmartLink>
  )
}

export default BreadcrumbLink
