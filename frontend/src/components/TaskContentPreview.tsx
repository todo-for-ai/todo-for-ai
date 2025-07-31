import React from 'react'
import { Popover, Card, Typography, Empty } from 'antd'
import { FileTextOutlined, EyeOutlined } from '@ant-design/icons'
import { MarkdownEditor } from './MarkdownEditor'

const { Text } = Typography

interface TaskContentPreviewProps {
  content?: string
  title?: string
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom'
}

const TaskContentPreview: React.FC<TaskContentPreviewProps> = ({
  content,
  title = '任务内容',
  children,
  placement = 'right'
}) => {
  // 如果没有内容，不显示预览
  if (!content || content.trim() === '') {
    return <>{children}</>
  }

  const previewContent = (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextOutlined />
          <span>{title}</span>
        </div>
      }
      style={{
        width: 1200, // 从400增加到1200 (3倍)
        maxHeight: 1500, // 从500增加到1500 (3倍)
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
      size="small"
    >
      {content.trim() ? (
        <div style={{ maxHeight: 1200, overflow: 'auto' }}> {/* 从400增加到1200 (3倍) */}
          <MarkdownEditor
            value={content}
            readOnly
            height={900} // 从300增加到900 (3倍)
            hideToolbar
            preview="preview"
          />
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无内容"
          style={{ margin: '20px 0' }}
        />
      )}
    </Card>
  )

  return (
    <Popover
      content={previewContent}
      title={null}
      placement={placement}
      trigger="hover"
      overlayStyle={{ zIndex: 1050 }}
      mouseEnterDelay={0.3}
      mouseLeaveDelay={0.1}
    >
      {children}
    </Popover>
  )
}

// 任务内容摘要组件
interface TaskContentSummaryProps {
  content?: string
  maxLength?: number
  showPreview?: boolean
}

export const TaskContentSummary: React.FC<TaskContentSummaryProps> = ({
  content,
  maxLength = 50,
  showPreview = true
}) => {
  if (!content || content.trim() === '') {
    return (
      <Text type="secondary" style={{ fontSize: '12px' }}>
        暂无内容
      </Text>
    )
  }

  // 提取纯文本内容（去除Markdown语法和HTML标签）
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // 移除标题标记
    .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
    .replace(/`(.*?)`/g, '$1') // 移除代码标记
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接，保留文本
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
    .replace(/<[^>]*>/g, '') // 移除HTML标签
    .replace(/&[a-zA-Z0-9#]+;/g, '') // 移除HTML实体
    .replace(/\\([#*`\[\]()_~])/g, '$1') // 移除转义字符，保留原字符
    .replace(/\n+/g, ' ') // 将换行符替换为空格
    .replace(/\s+/g, ' ') // 将多个空格合并为一个
    .trim()

  const summary = plainText.length > maxLength
    ? plainText.substring(0, maxLength) + '...'
    : plainText

  const summaryElement = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      maxHeight: '36px', // 限制为两行高度 (18px * 2)
      overflow: 'hidden'
    }}>
      <Text
        style={{
          fontSize: '12px',
          color: '#666',
          lineHeight: '18px',
          display: '-webkit-box',
          WebkitLineClamp: 2, // 限制为两行
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {summary}
      </Text>
      {showPreview && content.length > maxLength && (
        <EyeOutlined style={{ fontSize: '12px', color: '#1890ff', cursor: 'pointer', flexShrink: 0 }} />
      )}
    </div>
  )

  if (showPreview && content.trim()) {
    return (
      <TaskContentPreview content={content} title="任务内容预览">
        {summaryElement}
      </TaskContentPreview>
    )
  }

  return summaryElement
}

export default TaskContentPreview
