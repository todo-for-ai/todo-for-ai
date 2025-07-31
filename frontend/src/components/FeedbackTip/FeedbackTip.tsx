import React from 'react'
import { Alert } from 'antd'
import { BulbOutlined, GithubOutlined } from '@ant-design/icons'
import { useTranslation } from '../../i18n/hooks/useTranslation'
import './FeedbackTip.css'

interface FeedbackTipProps {
  className?: string
  style?: React.CSSProperties
  showIcon?: boolean
  closable?: boolean
}

const FeedbackTip: React.FC<FeedbackTipProps> = ({
  className,
  style,
  showIcon = true,
  closable = true
}) => {
  const { tc } = useTranslation()

  const handleGitHubClick = () => {
    window.open('https://github.com/todo-for-ai/todo-for-ai/issues/new', '_blank', 'noopener,noreferrer')
  }

  return (
    <Alert
      message={tc('feedbackTip.title')}
      description={
        <div className="feedback-tip-content">
          <p>{tc('feedbackTip.description')}</p>
          <div className="feedback-tip-actions">
            <a
              href="https://github.com/todo-for-ai/todo-for-ai/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="feedback-tip-github-link"
              onClick={(e) => {
                e.preventDefault()
                handleGitHubClick()
              }}
            >
              <GithubOutlined />
              <span>{tc('feedbackTip.submitIssue')}</span>
            </a>
          </div>
        </div>
      }
      type="info"
      icon={showIcon ? <BulbOutlined /> : undefined}
      showIcon={showIcon}
      closable={closable}
      className={`feedback-tip ${className || ''}`}
      style={style}
    />
  )
}

export default FeedbackTip
