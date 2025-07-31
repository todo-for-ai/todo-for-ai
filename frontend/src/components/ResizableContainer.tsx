import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Tooltip } from 'antd'
import { DragOutlined } from '@ant-design/icons'

interface ResizableContainerProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  storageKey?: string
  className?: string
  style?: React.CSSProperties
}

const ResizableContainer: React.FC<ResizableContainerProps> = ({
  children,
  defaultWidth = 1000,
  minWidth = 600,
  maxWidth = 1400,
  storageKey = 'taskEditor_contentWidth',
  className = '',
  style = {}
}) => {
  const [width, setWidth] = useState(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  // 从localStorage恢复宽度设置
  useEffect(() => {
    const savedWidth = localStorage.getItem(storageKey)
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10)
      if (parsedWidth >= minWidth && parsedWidth <= maxWidth) {
        setWidth(parsedWidth)
      }
    }
  }, [storageKey, minWidth, maxWidth])

  // 保存宽度到localStorage
  const saveWidth = useCallback((newWidth: number) => {
    localStorage.setItem(storageKey, newWidth.toString())
  }, [storageKey])

  // 开始拖动
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
    setStartWidth(width)
    
    // 添加全局样式，防止文本选择
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }, [width])

  // 拖动过程中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - startX
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX))
    setWidth(newWidth)
  }, [isDragging, startX, startWidth, minWidth, maxWidth])

  // 结束拖动
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      saveWidth(width)
      
      // 恢复全局样式
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, width, saveWidth])

  // 双击重置为默认宽度
  const handleDoubleClick = useCallback(() => {
    setWidth(defaultWidth)
    saveWidth(defaultWidth)
  }, [defaultWidth, saveWidth])

  // 监听全局鼠标事件
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 检查是否为移动端
  const isMobile = window.innerWidth <= 768

  return (
    <div
      ref={containerRef}
      className={`resizable-container ${className}`}
      style={{
        width: isMobile ? '100%' : `${width}px`,
        margin: '0 auto',
        position: 'relative',
        transition: isDragging ? 'none' : 'width 0.2s ease',
        ...style
      }}
    >
      {children}
      
      {/* 拖动手柄 - 仅在非移动端显示 */}
      {!isMobile && (
        <Tooltip title="拖动调整宽度，双击重置为默认宽度" placement="left">
          <div
            ref={handleRef}
            className="resize-handle"
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            style={{
              position: 'absolute',
              top: '50%',
              right: '-12px',
              width: '24px',
              height: '60px',
              transform: 'translateY(-50%)',
              cursor: 'col-resize',
              backgroundColor: isDragging ? '#1890ff' : '#f0f0f0',
              border: `2px solid ${isDragging ? '#1890ff' : '#d9d9d9'}`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 1000,
              opacity: 0.8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.backgroundColor = '#e6f7ff'
                e.currentTarget.style.borderColor = '#1890ff'
                e.currentTarget.style.opacity = '1'
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging) {
                e.currentTarget.style.backgroundColor = '#f0f0f0'
                e.currentTarget.style.borderColor = '#d9d9d9'
                e.currentTarget.style.opacity = '0.8'
              }
            }}
          >
            <DragOutlined 
              style={{ 
                color: isDragging ? '#fff' : '#666',
                fontSize: '14px',
                transform: 'rotate(90deg)'
              }} 
            />
          </div>
        </Tooltip>
      )}
      
      {/* 宽度指示器 - 拖动时显示 */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#1890ff',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'none'
          }}
        >
          宽度: {width}px
        </div>
      )}
    </div>
  )
}

export default ResizableContainer
