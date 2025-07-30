import React from 'react'
import { Button } from 'antd'
import { SmartLink, type SmartLinkProps } from './index'

export interface LinkButtonProps extends Omit<SmartLinkProps, 'children'> {
  /** 按钮类型 */
  type?: 'link' | 'text' | 'default' | 'primary' | 'dashed'
  /** 按钮大小 */
  size?: 'large' | 'middle' | 'small'
  /** 按钮图标 */
  icon?: React.ReactNode
  /** 按钮文本 */
  children: React.ReactNode
  /** 是否加载中 */
  loading?: boolean
  /** 按钮形状 */
  shape?: 'default' | 'circle' | 'round'
  /** 是否危险按钮 */
  danger?: boolean
  /** 是否幽灵按钮 */
  ghost?: boolean
  /** 是否块级按钮 */
  block?: boolean
}

/**
 * 链接按钮组件
 * 
 * 结合了Ant Design Button的样式和SmartLink的智能导航功能
 * 保持现有的视觉效果，同时支持Ctrl+点击新窗口打开
 */
export const LinkButton: React.FC<LinkButtonProps> = ({
  to,
  type = 'link',
  size,
  icon,
  children,
  loading = false,
  shape,
  danger = false,
  ghost = false,
  block = false,
  className,
  style,
  title,
  replace,
  onClick,
  disabled,
  ...rest
}) => {
  return (
    <SmartLink
      to={to}
      className={className}
      style={style}
      title={title}
      replace={replace}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      <Button
        type={type}
        size={size}
        icon={icon}
        loading={loading}
        shape={shape}
        danger={danger}
        ghost={ghost}
        block={block}
        disabled={disabled}
        style={{
          padding: 0,
          height: 'auto',
          border: 'none',
          boxShadow: 'none',
          background: 'transparent',
          color: 'inherit',
          ...style
        }}
        // 阻止Button的默认点击行为，让SmartLink处理
        onClick={(e) => e.preventDefault()}
      >
        {children}
      </Button>
    </SmartLink>
  )
}

export default LinkButton
